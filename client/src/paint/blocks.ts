// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import { ApiClient } from "./apiclient";
import { fromBase64url, toBase64url } from "./base64";
import { Coord } from "./cmath2";
import { delayMillis } from "./common";
import { Mandelblock } from "./mandelblock";
import { CoordPair } from "./paintmath";
import { Throttler } from "./throttler";

// Purpose: Caching block repository.

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

type GetBlockResult = Block | "pending" | undefined;

type Request = {
   rid: number;
   address: string;
   fulfill: () => Promise<void>;
   status: "pending" | "fetching";
};

type BlockEventHandler = (event: string, args: any) => void;

export interface BlockSource {
   getBlock(address: string): Promise<Block>;
}

//----------------------------------------------------------------------------------------
// The normal block source that uses the server API to look up block data. Other block
// sources are for testing.
class ApiBlockSource implements BlockSource {
   api: ApiClient;

   constructor(api: ApiClient) {
      this.api = api;
   }

   async getBlock(address: string): Promise<Block> {
      const resp = await this.api.getBlock(address);
      if (resp.code == "BLOCK") {
         return {
            pixels: new Uint32Array(64*64),
         };
      } else if (resp.code == "NOT_FOUND") {
         // empty block.
         return {
            pixels: new Uint32Array(64*64),
         };
      } else {
         throw new Error("block api failed: " + resp.code);
      }
   }
}

//----------------------------------------------------------------------------------------
export class Blocks {
   nextRid = 0;
   blocks: Record<string, Block> = {};
   requests: Request[] = [];
   api: ApiClient;
   running = false;
   throttler = new Throttler(THROTTLE_PERIOD, THROTTLE_BURST);
   callbacks: BlockEventHandler[] = [];
   blockSource: BlockSource;

   //-------------------------------------------------------------------------------------
   constructor(api: ApiClient) {
      this.api = api;
      this.blockSource = new Mandelblock();//ApiBlockSource(api);
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
   private async notify(event: string, args: any) {
      for (const handler of this.callbacks) {
         handler(event, args);
      }
   }

   //-------------------------------------------------------------------------------------
   private async fulfillRequest(req: Request) {
      try {
         await req.fulfill();
      } catch (e) {
         console.error("Failed fulfilling a request.", "address = ", req.address, e);
      }

      // Remove request.
      const idx = this.requests.indexOf(req);
      if (idx != -1) {
         this.requests.splice(idx, 1);
      }
   }

   //-------------------------------------------------------------------------------------
   private async runRequests() {
      if (this.requests.length == 0) return;
      if (this.running) return;
      this.running = true;

      try {
         for (const req of this.requests) {
            if (req.status == "pending") {
               const waitTime = this.throttler.check();
               if (waitTime == 0) {
                  req.status = "fetching";
                  void this.fulfillRequest(req);
               } else {
                  await delayMillis(waitTime);
                  break;
               }
            }
         }
      } catch (e) {
         console.error("Unexpected error in block requests:", e);
      } finally {
         this.running = false;
      }

      this.runRequests(); // Try again for additional requests.
   }

   //-------------------------------------------------------------------------------------
   private pushRequest(address: string, fulfill: () => Promise<void>) {
      this.requests.push({
         rid: this.nextRid++,
         address,
         status: "pending",
         fulfill,
      });

      this.runRequests();
   }

   //-------------------------------------------------------------------------------------
   private async requestBlock(address: string) {
      for (const r of this.requests) {
         if (r.address == address) return; // Already queued.
      }

      this.pushRequest(
         address,
         async () => {
            try {
               const block = await this.blockSource.getBlock(address);
               this.blocks[address] = block;
               this.notify("block", { address });
            } catch (err) {
               console.error("Failed to fetch block:", err);
               return;
            }
         }
      );
   }

   //-------------------------------------------------------------------------------------
   async cancelPendingRequests() {
      // Remove any pending requests. This is useful when the camera pans and we don't
      // want off-screen requests being fulfilled anymore. Any in-progress requests will
      // still complete. Newer requests will be made from the updated position.
      this.requests.filter(req => req.status == "pending");
   }
   
   //-------------------------------------------------------------------------------------
   getBlock(x: Coord, y: Coord, level: number): GetBlockResult {
      if (x.value < 0 || y.value < 0) return undefined;
      if (
         x.value >> BigInt(x.point) >= BigInt(1) ||
         y.value >> BigInt(y.point) >= BigInt(1)
      ) {
         return undefined;
      }

      const address = buildCoordString([x, y], level);
      if (!address) return undefined;

      if (this.blocks[address]) {
         // Block is loaded already.
         return this.blocks[address];
      }

      // Make a request.
      this.requestBlock(address);
      return "pending";
   }
}
