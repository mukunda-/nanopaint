// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import { toBase64url } from "./base64";
import { Coord } from "./cmath2";

// Caching block repository.


export function buildCoordString(coords: Coord[], level: number): string|undefined {
   if (coords.length != 2) throw new Error("invalid coords");
   const b: bigint[] = [coords[0].value, coords[1].value];
   const bitmod = (level - 1) & 3;

   const resultBytes = new Uint8Array(((level+3)>>2) + 1);

   for (let i = 0; i < 2; i++) {
      // Catch out of range.
      if (b[i] < 0) return undefined;
      if (b[i] >> BigInt(coords[i].point) >= BigInt(1)) return undefined;
      
      // We want to align the value with the desired level.
      // All coords in coord string are fractional, no integer part.
      const shift = coords[i].point - level;
      b[i] >>= BigInt(shift);

      // Apply padding, 0-3 bits.
      b[i] <<= BigInt(3-bitmod);
   }

   for (let i = ((level+3) >> 2) - 1; i >= 0; i--) {
      const byte = Number(b[0] & BigInt(0xF)) | (Number(b[1] & BigInt(0xF)) << 4);
      resultBytes[i] = byte;
      b[0] >>= BigInt(4);
      b[1] >>= BigInt(4);
   }

   resultBytes[((level+3)>>2)] = bitmod;
   
   return toBase64url(resultBytes);
}

type Block = {
   pixels: Uint32Array;
};

type GetBlockResult = Block | "pending" | undefined;

type Request = {
   address: string;
   status: "waiting" | "fetching";
}

//----------------------------------------------------------------------------------------
export class Blocks {

   blocks: Record<string, Block> = {};
   requests: Request[] = [];

   //-------------------------------------------------------------------------------------
   async requestBlock(address: string) {
      const resp = await fetch("server" + "/api/block/" + address);

   }

   //-------------------------------------------------------------------------------------
   async cancelRequests() {
      // Remove any waiting requests. This is useful when the camera pans and we don't
      // want off-screen requests being fulfilled anymore. New requests will be made.
      this.requests.filter(req => req.status == "waiting");
   }
   
   getBlock(x: Coord, y: Coord, level: number): GetBlockResult {
      if (x.value < 0 || y.value < 0) return undefined;
      if (x.value >> BigInt(x.point) >= BigInt(1) || y.value >> BigInt(y.point) >= BigInt(1)) return undefined;
      //let bx = x.value >> (BigInt(x.point) - BigInt(level));
      //let by = y.value >> (BigInt(y.point) - BigInt(level));
      //let bitmod = level & 3;

      const address = buildCoordString([x, y], level);
      if (!address) return undefined;

      // bx <<= BigInt(4-bitmod);
      // by <<= BigInt(4-bitmod);
      // bitmod = (bitmod - 1) & 3;
      // const key = 

      if (this.blocks[address]) {
         return this.blocks[address];
      }

      // Make a request.
      this.requestBlock(address);
      return "pending";
   }
}