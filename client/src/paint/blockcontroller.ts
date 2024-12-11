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
// The primary implementation is a "throttling" block store that avoids making too many
// requests to the server at once.
// The lower level clients do not need to worry about throttling.

const THROTTLE_PERIOD = 100;
const THROTTLE_BURST = 10;

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
// A block is a 64x64 region of pixel data. These can be updated locally before the server
// confirms a successful update. The block data contains what we need (e.g., the "dry"
// flag) to predict if we can paint a certain area.
export type Block = {
   pixels: Uint32Array;
};

//----------------------------------------------------------------------------------------
type GetBlockResult = Block | "pending" | "out_of_bounds";
type PaintResult = "pixel_is_dry" | "pending" | "out_of_bounds";

//----------------------------------------------------------------------------------------
// Descriptive types are better than primitives.
type BlockAddress = string; // An encoded address that points to a block.
type PixelAddress = string; // An encoded address that points to a pixel within a block 
                            // (6 more bits than a block).
type Color = number; // A 12 bit color, 4 bits per component, R being the lower order.
type RequestId = number; // An incrementing session-unique ID.

//----------------------------------------------------------------------------------------
type Request = {
   rid: RequestId;
   address: BlockAddress;
   priority: number;
   fulfill: () => Promise<void>;
   status: "pending" | "fetching";
};

//----------------------------------------------------------------------------------------
// Events definitions
export type BlockEvent = BlockLoadedEvent;

export type BlockLoadedEvent = {
   type: "block";
   address: string;
};

//----------------------------------------------------------------------------------------
// Consumers can subscribe to block events, such as when a block is loaded. Useful for
// updating pixel regions when new data is available.
type BlockEventHandler = (event: BlockEvent) => void;

//----------------------------------------------------------------------------------------
export interface BlockSource {
   // Can throw error if the block fails to be retrieved (network failure etc).
   getBlock(address: string): Promise<Block>;
}

//----------------------------------------------------------------------------------------
export type BlockEventArgs = {
   address: string;
};

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
   // Fetches a block. An event will trigger when the block is loaded, or the block can
   // be returned directly from a cache.
   getBlock(x: Coord, y: Coord, level: number, priority?: number): GetBlockResult;

   //-------------------------------------------------------------------------------------
   // Sets a pixel. A sane implementation will update the cache locally before sending
   // the request to the server, so the UI can update immediately.
   paint(x: Coord, y: Coord, level: number, color: number): PaintResult;
}

//----------------------------------------------------------------------------------------
export class ThrottlingBlockController implements BlockController {
   nextRid = 0;
   blocks: Record<string, Block> = {};
   requests: Record<string, Request> = {};
   blockSource: BlockSource;
   running = false;
   throttler = new Throttler(THROTTLE_PERIOD, THROTTLE_BURST);
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
      delete this.requests[req.address];
   }

   //-------------------------------------------------------------------------------------
   private async runRequests() {
      if (this.running) return;
      this.running = true;

      // I don't really like constant conditions, but I prefer this over tail recursion.
      // eslint-disable-next-line no-constant-condition
      while (true) {
         try {
            const bestRequest = Object.values(this.requests)
               .reduce((best: Request|undefined, req: Request) => {
                  if (req.status == "pending" 
                                             && (!best || req.priority < best.priority)) {
                     return req;
                  }
                  return best;
               }, undefined);

            if (bestRequest) {
               const waitTime = this.throttler.check();
               if (waitTime == 0) {
                  bestRequest.status = "fetching";
                  void this.fulfillRequest(bestRequest);
                  await yieldToEvents();
               } else {
                  // Throttled: wait and retry later.
                  await delayMillis(waitTime);
               }
            } else {
               // No more requests.
               break;
            }
         } catch (e) {
            console.error("Unexpected error in block requests:", e);
         } finally {
            this.running = false;
         }
      }
   }

   //-------------------------------------------------------------------------------------
   private pushRequest(address: string, priority: number, fulfill: () => Promise<void>) {
      this.requests[address] = {
         rid: this.nextRid++,
         address,
         priority,
         status: "pending",
         fulfill,
      };

      void this.runRequests();
   }

   //-------------------------------------------------------------------------------------
   private async requestBlock(address: string, priority: number) {
      if (this.requests[address]) return; // Already queued.

      this.pushRequest(
         address,
         priority,
         async () => {
            try {
               const block = await this.blockSource.getBlock(address);
               // for (let i = 0; i < block.pixels.length; i++) {
               //    block.pixels[i] = 0x80000000 | (((priority ) << 16) & 0xFFF0000);
               // }
               this.blocks[address] = block;
               // console.log("filfulled", priority);
               this.notify({
                  type: "block",
                  address: address
               });
            } catch (err) {
               console.error("Failed to fetch block:", err);
               return;
            }
         }
      );
   }

   private async requestPaint(address: PixelAddress, color: Color) {
      
   }

   //-------------------------------------------------------------------------------------
   async cancelPendingReadRequests() {
      // Remove any pending requests. This is useful when the camera pans and we don't
      // want off-screen requests being fulfilled anymore. Any in-progress requests will
      // still complete. Newer requests will be made from the updated position.
      const keysToRemove = Object.values(this.requests)
         .filter(req => req.status == "pending")
         .map(req => req.address);

      for (const key of keysToRemove) {
         delete this.requests[key];
      }

      //this.requests = this.requests.filter(req => req.status == "pending");
   }
   
   //-------------------------------------------------------------------------------------
   getBlock(x: Coord, y: Coord, level: number, priority?: number): GetBlockResult {
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
   paint(x: Coord, y: Coord, level: number, color: number): PaintResult {
      // Pixel addresses require 9 bits at minimum.
      if (level < 9) return "out_of_bounds";

      const blockAddress = buildCoordString([x, y], level - 3);
      if (!blockAddress) return "out_of_bounds";

      if (this.blocks[blockAddress]) {
         const pixelIndex = getPixelIndex([x, y], level);
         const pixel = this.blocks[blockAddress].pixels[pixelIndex];
         if (pixel & 0x40000000) {
            return "pixel_is_dry";
         }
         this.blocks[blockAddress].pixels[pixelIndex] = (pixel & 0xFFFF) | color;
         return "pending";
      }

      return "pending";
   }
}
