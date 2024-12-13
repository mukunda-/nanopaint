// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import { fromBase64url, toBase64url } from "./base64";
import { Coord } from "./cmath2";
import { delayMillis, yieldToEvents } from "./common";
import { CoordPair } from "./paintmath";
import { Throttler } from "./throttler";

// Purpose: The block controller handles requests to read and write to the block source.
// Complex responsibility such as throttling, queueing, client-side caching, update
// events, etc.

//----------------------------------------------------------------------------------------
// Requests can be made to the block source at 1000/period times/second.
const DEFAULT_THROTTLE_PERIOD = 100;

// Requests can "stock up" this many times. So you can do N immediately before the
// throttle starts.
const DEFAULT_THROTTLE_BURST  = 10;

//----------------------------------------------------------------------------------------
// Convert the given 2D coordinates into an address string suitable for a server request.
// The format the server uses is a base64 encoding of 4bit XY pairs followed by the flags
// byte.
export function buildCoordString(coords: CoordPair, bits: number): string|undefined {
   if (coords.length != 2) throw new Error("invalid coords");
   const b: bigint[] = [coords[0].value, coords[1].value];
   const bitmod = (bits - 1) & 3;

   const resultBytes = new Uint8Array(((bits+3)>>2) + 1);

   for (let i = 0; i < 2; i++) {
      // Catch out of range.
      if (b[i] < 0) return undefined;
      if (b[i] >> BigInt(coords[i].point) >= BigInt(1)) return undefined;
      
      // We want to align the value with the desired level.
      // All coords in coord string are fractional, no integer part.
      const shift = coords[i].point - bits;
      b[i] >>= BigInt(shift);

      // Apply padding, 0-3 bits.
      b[i] <<= BigInt(3-bitmod);
   }

   for (let i = ((bits+3) >> 2) - 1; i >= 0; i--) {
      const byte = Number(b[0] & BigInt(0xF)) | (Number(b[1] & BigInt(0xF)) << 4);
      resultBytes[i] = byte;
      b[0] >>= BigInt(4);
      b[1] >>= BigInt(4);
   }

   resultBytes[((bits+3)>>2)] = bitmod;
   
   return toBase64url(resultBytes);
}

//----------------------------------------------------------------------------------------
// Extract the lowest 6 bits of the coordinate pair and mix them together for a pixel
// index.
export function getPixelIndex(coords: CoordPair, bits: number): number {
   if (bits < 9) throw new Error("invalid pixel address");
   const x = Number(coords[0].truncate(bits).value & BigInt(0o77));
   const y = Number(coords[1].truncate(bits).value & BigInt(0o77));
   return x + y * 64;
}

//----------------------------------------------------------------------------------------
// Extract the coordinates and bit length from an encoded address string.
// Reverse of buildCoordString.
export function parseCoordString(address: string): [CoordPair, number] {
   const bytes = fromBase64url(address);
   const bitmod = bytes[bytes.length - 1] & 0x3;
   const dataLength = bytes.length - 1;
   const bitsLength = dataLength * 4 - 4 + (bitmod + 1);
   let x = BigInt(0);
   let y = BigInt(0);
   for (let i = 0; i < dataLength; i++) {
      x = (x << BigInt(4)) | BigInt(bytes[i] & 0xF);
      y = (y << BigInt(4)) | BigInt(bytes[i] >> 4);
   }
   x >>= BigInt(3 - bitmod);
   y >>= BigInt(3 - bitmod);
   return [[new Coord(x, bitsLength), new Coord(y, bitsLength)], bitsLength];
}

//----------------------------------------------------------------------------------------
// A block is a 64x64 region of pixel data.
export type Block = {
   // The pixel data contains two colors and flags. The flags contain info such as the
   // "dry" flag to predict if we can paint in a certain area.
   // 0xFBGRABGR
   // Pixel data can be updated locally before the server confirms a successful update.
   // Conflicts should trigger discarding local data.
   pixels: Uint32Array;

   // The revision number helps to detect conflicts. If the server returns a lower
   // revision than ours, then we disregard it.
   revision: number;
};

export const PIXEL_SET = 0x80000000;
export const PIXEL_DRY = 0x40000000;

//----------------------------------------------------------------------------------------
type GetBlockResult = Block | "pending" | "out_of_bounds";
type PaintResult = "pixel_is_dry" | "pending" | "out_of_bounds" | "not_loaded";

//----------------------------------------------------------------------------------------
// Descriptive types are better than primitives.
type BlockAddress = string; // An encoded address that points to a block.
type PixelAddress = string; // An encoded address that points to a pixel within a block 
                            // (6 more bits than a block).
type Color = number; // A 12 bit color, 4 bits per component, R being the lower order.
type RequestId = number; // An incrementing session-unique ID.
type RequestClass = "read" | "paint";

//----------------------------------------------------------------------------------------
type Request = {
   rid: RequestId;
   rclass: RequestClass;
   address: BlockAddress;
   priority: number;
   fulfill: () => Promise<void>;
   status: "pending" | "busy";
};

//----------------------------------------------------------------------------------------
// Events definitions
export type BlockEvent = BlockLoadedEvent|PaintedEvent|PaintFailedEvent;

export type BlockLoadedEvent = {
   type: "block";
   address: string;
};

export type PaintedEvent = {
   type: "painted";
   address: string;
};

export type PaintFailedEvent = {
   type: "paint_failed";
   address: string;
};

//----------------------------------------------------------------------------------------
// Consumers can subscribe to block events, such as when a block is loaded. Useful for
// updating pixel regions when new data is available.
export type BlockEventHandler = (event: BlockEvent) => void;

export type PaintStatus = "ok" | "dry";

//----------------------------------------------------------------------------------------
export interface BlockSource {
   // Retrieves a block from the store. Can throw an error if the block fails to be
   // retrieved (network failure or such).
   getBlock(address: string): Promise<Block>;

   // Paints a pixel. May throw an error if the pixel fails to be painted due to an
   // unexpected error. 
   paint(address: string, color: number): Promise<PaintStatus>;
}

//----------------------------------------------------------------------------------------
export interface BlockController {
   //-------------------------------------------------------------------------------------
   // Consumers can listen to events from the queue, such as when a block loads or when
   // a pixels are painted. These events are useful to manage updates to the screen.
   subscribe(handler: BlockEventHandler): void;
   unsubscribe(handler: BlockEventHandler): void;

   //-------------------------------------------------------------------------------------
   // Read requests can be invalidated if they are no longer needed. This will not cancel
   // in-flight requests, but it will cancel any pending read requests so that a new set
   // can be queued instead without waiting for the old one.
   cancelPendingReadRequests(): void;

   //-------------------------------------------------------------------------------------
   // Fetches a block. If the block is already loaded, it will return it directly
   // otherwise it returns "pending" and an event will trigger when the block is loaded.
   getBlock(x: Coord, y: Coord, level: number, priority?: number): GetBlockResult;

   //-------------------------------------------------------------------------------------
   // Sets a pixel. Ideal implementation will update the cache locally before sending
   // the request to the server, so the UI can update immediately.
   paint(x: Coord, y: Coord, level: number, color: number): PaintResult;
}

// Level info:
// The level decides the depth layer of the block. Getting blocks requires a minimum level
// of 3. Setting pixels requires a minimum level of 9. Pixel depth is 6 bits deeper than
// block depth.

//----------------------------------------------------------------------------------------
export class ThrottlingBlockController implements BlockController {
   nextRid = 0;
   blocks: Record<string, Block> = {};
   openRequests: Request[] = [];//Record<string, Request> = {};
   blockSource: BlockSource;
   running = false;
   throttler = new Throttler(DEFAULT_THROTTLE_PERIOD, DEFAULT_THROTTLE_BURST);
   callbacks: BlockEventHandler[] = [];
   //blockSource: BlockSource;

   //-------------------------------------------------------------------------------------
   constructor(blockSource: BlockSource) {
      this.blockSource = blockSource;
   }

   //-------------------------------------------------------------------------------------
   subscribe(handler: BlockEventHandler) {
      // Subscribe to block events.
      if (this.callbacks.indexOf(handler) == -1) {
         this.callbacks.push(handler);
      }
   }

   //-------------------------------------------------------------------------------------
   unsubscribe(handler: BlockEventHandler) {
      // Unsubscribe from block events.
      const idx = this.callbacks.indexOf(handler);
      if (idx != -1) {
         this.callbacks.splice(idx, 1);
      }
   }

   //-------------------------------------------------------------------------------------
   private async notify(event: BlockEvent) {
      for (const handler of this.callbacks) {
         handler(event);
      }
   }

   //-------------------------------------------------------------------------------------
   private async fulfillRequest(req: Request) {
      try {
         await req.fulfill();
      } catch (e) {
         console.error("Failed fulfilling a request.", "address = ", req.address, e);
      }

      // Remove completed request. If it failed for whatever reason, then the engine can retry.
      this.openRequests = this.openRequests.filter(r => !(r.rid == req.rid));
   }

   //-------------------------------------------------------------------------------------
   private getNextPendingRequest(): Request|undefined {
      const bestRequest = this.openRequests.reduce((best: Request|undefined, req: Request) => {
         if (req.status == "pending" && (!best || req.priority < best.priority)) {
            return req;
         }
         return best;
      }, undefined);
      return bestRequest;
   }

   //-------------------------------------------------------------------------------------
   private async runRequests() {
      if (this.running) return;
      this.running = true;

      // We don't want to run requests in the same execution strand as the requester.
      // This allows the caller to queue multiple requests at the same time without the
      // first ones taking priority over the desired priority number provided.
      //
      // Without the yield, requests could execute instantly regardless of priority when
      // the queue is empty/waiting.
      await yieldToEvents();

      // I don't really like constant conditions, but I prefer this over tail recursion.
      // eslint-disable-next-line no-constant-condition
      while (true) {
         try {
            const bestRequest = this.getNextPendingRequest();

            if (!bestRequest) {
               // No more requests queued.
               break;
            }

            const waitTime = this.throttler.check();
            if (waitTime == 0) {
               bestRequest.status = "busy";
               void this.fulfillRequest(bestRequest);
            } else {
               // Throttled: wait and retry later.
               await delayMillis(waitTime);
            }

         } catch (e) {
            console.error("Unexpected error in block requests:", e);
         } finally {
            this.running = false;
         }
      }
   }

   //-------------------------------------------------------------------------------------
   private pushRequest(options: {
      rclass: RequestClass,
      address: string,
      priority: number,
      fulfill: () => Promise<void>
   }) {
      this.openRequests.push({
         rid: this.nextRid++,
         address: options.address,
         priority: options.priority,
         status: "pending",
         fulfill: options.fulfill,
         rclass: options.rclass,
      });

      void this.runRequests();
   }

   //-------------------------------------------------------------------------------------
   private requestBlock(address: string, priority: number) {
      
      if (this.openRequests.some(req => req.address == address)) {
         // Already queued this address.
         return;
      }

      this.pushRequest({
         rclass: "read",
         address,
         priority,
         fulfill: async () => {
            try {
               const block = await this.blockSource.getBlock(address);
               this.blocks[address] = block;
               this.notify({
                  type: "block",
                  address: address
               });
            } catch (err) {
               console.error("Failed to fetch block:", err);
               return;
            }
         }
      });
   }

   private async requestPaint(address: PixelAddress, color: Color) {
      // Cancel pending paint request.
      this.openRequests = this.openRequests.filter(req => 
         !(req.address == address && req.status == "pending"));
      
      this.pushRequest({
         rclass: "paint",
         address,
         priority: -1,
         fulfill: async () => {
            try {
               const result = await this.blockSource.paint(address, color);
               if (result != "ok") {
                  console.error("Failed to paint pixel:", result);
               }
               this.notify({
                  type: "painted",
                  address,
               });
            } catch (err) {
               console.error("failed to paint pixel:", err);
               this.notify({
                  type: "paint_failed",
                  address,
               });
            }
         }
      });
   }

   //-------------------------------------------------------------------------------------
   async cancelPendingReadRequests() {
      // Remove any pending read requests. This is useful when the camera pans and we
      // don't want off-screen requests being fulfilled anymore. Any in-progress requests
      // will still complete.
      this.openRequests = this.openRequests.filter(req => 
         !(req.rclass == "read" && req.status == "pending")
      );
   }
   
   //-------------------------------------------------------------------------------------
   getBlock(x: Coord, y: Coord, level: number, priority?: number): GetBlockResult {
      if (level < 3) return "out_of_bounds";
      const address = buildCoordString([x, y], level);
      if (!address) return "out_of_bounds";

      if (this.blocks[address]) {
         // Block is loaded already.
         return this.blocks[address];
      }

      // Make a request.
      this.requestBlock(address, priority || 0);
      return "pending";
   }

   //-------------------------------------------------------------------------------------
   // Bubble pixels into the upper layers. On the client side, we can simulate what the
   // server will do with pixels when they are painted. Upper layers mirror scaled down
   // copies of the data. We'll update our client-side cache.
   private bubblePaint(x: Coord, y: Coord, level: number) {
      if (level <= 6) return; // At the top level.

      const pixelIndex = getPixelIndex([x, y], level) & 0o6767;
      const blockAddress = buildCoordString([x, y], level - 3);
      if (!blockAddress) throw new Error("bubble - unexpected block address error");
      const block = this.blocks[blockAddress];
      if (!block) {
         // If a block isn't loaded, then ignore the bubble process.
         // We'll get the bubbled updates from the server later.
         
         // Note there is a chance of a discrepancy here if we have a read request
         // in progress already, but that should be cleaned up later by an eventual
         // revision check.
         return;
      }

      let sum_r = 0;
      let sum_g = 0;
      let sum_b = 0;
      let sum_a = 0;

      for (let py = 0; py < 2; py++) {
         for (let px = 0; px < 2; px++) {
            const index = pixelIndex + py * 64 + px;
            const pixelData = block.pixels[index];
            if (pixelData & PIXEL_SET) {
               const painted = (pixelData >> 16) & 0xFFF;
               const inherited = pixelData & 0xFFFF;
               const alpha2 = inherited >> 12;
               const alpha1 = 15 - alpha2;

               sum_a += 15;
               sum_r += (painted & 0xF) * alpha1 + (inherited & 0xF) * alpha2;
               sum_g += ((painted >> 4) & 0xF) * alpha1 + ((inherited >> 4) & 0xF) * alpha2;
               sum_b += ((painted >> 8) & 0xF) * alpha1 + ((inherited >> 8) & 0xF) * alpha2;
            } else {
               if ((pixelData & 0xF000) == 0) {
                  continue;
               }

               const inherited = pixelData & 0xFFFF;
               const alpha = inherited >> 12;
               sum_a += alpha;
               sum_r += (inherited & 0xF) * alpha;
               sum_g += ((inherited >> 4) & 0xF) * alpha;
               sum_b += ((inherited >> 8) & 0xF) * alpha;
            }
         }
      }

      sum_r = Math.floor((sum_r + (sum_a >> 1)) / sum_a);
      sum_g = Math.floor((sum_g + (sum_a >> 1)) / sum_a);
      sum_b = Math.floor((sum_b + (sum_a >> 1)) / sum_a);
      sum_a /= 4;

      if (sum_a === 0) {
         return; // Nothing more to bubble.
      }

      const computed = sum_r | (sum_g << 4) | (sum_b << 8) | (sum_a << 12);

      const parentBlockAddress = buildCoordString([x, y], level - 4);
      if (!parentBlockAddress) throw new Error("bubble - unexpected parent address error");
      
      const parentBlock = this.blocks[parentBlockAddress];
      const parentPixelIndex = getPixelIndex([x, y], level - 1);

      const upperPixelValue = parentBlock.pixels[parentPixelIndex];
      if ((upperPixelValue & 0xFFFF) == computed) {
         // If there is no change, then we are done bubbling.
         return;
      }
      parentBlock.pixels[parentPixelIndex] = (upperPixelValue & 0xFFFF0000) | computed;

      this.bubblePaint(x, y, level - 1);
   }

   //-------------------------------------------------------------------------------------
   paint(x: Coord, y: Coord, level: number, color: number): PaintResult {
      // Pixel addresses require 9 bits at minimum.
      if (level < 9) return "out_of_bounds";

      const blockAddress = buildCoordString([x, y], level - 3);
      if (!blockAddress) return "out_of_bounds";
      const pixelAddress = buildCoordString([x, y], level);
      if (!pixelAddress) return "out_of_bounds";

      if (this.blocks[blockAddress]) {
         const pixelIndex = getPixelIndex([x, y], level);
         const pixel = this.blocks[blockAddress].pixels[pixelIndex];
         if (pixel & 0x40000000) {
            return "pixel_is_dry";
         }
         this.blocks[blockAddress].pixels[pixelIndex] = (pixel & 0xFFFF) | 0x80000000 | (color << 16);
         this.bubblePaint(x, y, level);
         this.requestPaint(pixelAddress, color);
         return "pending";
      }

      return "not_loaded";
   }
}
