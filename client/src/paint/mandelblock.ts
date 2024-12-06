// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: For prototyping, a read-only block source that provides the Mandelbrot set.
// Also very fun :)

import { ApiClient, ServerResponse } from "./apiclient";
import { toBase64url } from "./base64";
import { Block, BlockSource, parseCoordString } from "./blocks";
import { Coord } from "./cmath2";

function mandel(x: Coord, y: Coord): number {
   const maxIters = 1024;
   const escapeRadius = new Coord(4);
   let zx = new Coord(0), zy = new Coord(0);
   let zx2 = new Coord(0), zy2 = new Coord(0);
   let iteration = 0;

   while (zx2.add(zy2).lt(escapeRadius) && iteration < maxIters) {
      zy  = (new Coord(2)).mul(zx).mul(zy).add(y);
      zx  = zx2.sub(zy2).add(x);
      zx2 = zx.mul(zx);
      zy2 = zy.mul(zy);
      iteration++;
   }

   if (iteration === maxIters) return 0;
   return iteration / maxIters;
}

//----------------------------------------------------------------------------------------
export class Mandelblock implements ApiClient {

   async getBlock(address: string): Promise<ServerResponse> {
      // const [coords, bits] = parseCoordString(address);
      // const blockX = coords[0];
      // const blockY = coords[1];
      // const pixelScale = new Coord(1, bits);

      const pixels = new Uint32Array(64 * 64 * 4);

      for (let y = 0; y < 64; y++) {
         for (let x = 0; x < 64; x++) {
            // const px = blockX.add(new Coord(x).mul(pixelScale));
            // const py = blockY.add(new Coord(y).mul(pixelScale));
            // const color = mandel(px, py);
            const color = Math.floor(Math.random() * 0xFFF);
            
            const index = (y * 64 + x) * 4;
            pixels[index] = 0xC00000000 | ((color & 0xFFF) << 16);
         }
      }

      const pixelBytes = new Uint8Array(pixels.buffer);
      const pixelData = toBase64url(pixelBytes);

      return {
         code: "BLOCK",
         pixels: pixelData,
      };
   }

   async paint(address: string, color: number): Promise<ServerResponse> {
      return {
         code: "DISABLED"
      };
   }
}
