// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: For prototyping, a read-only block source that provides the Mandelbrot set.
// Also very fun :)

import { Block, BlockSource, parseCoordString } from "./blockqueue";
import { Coord } from "./cmath2";

function mandel(x: Coord, y: Coord): number {
   const maxIters = 1000;
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
   return (iteration / maxIters) * 0xFFF;
}

//----------------------------------------------------------------------------------------
export class Mandelblocks implements BlockSource {

   async getBlock(address: string): Promise<Block> {
      const [coords, bits] = parseCoordString(address);
      const blockX = coords[0].sub(new Coord(0.5)).mul(2);
      const blockY = coords[1].sub(new Coord(0.5)).mul(2);
      const pixelScale = new Coord(1, bits + 5);
      console.log("making block for address", address, bits);
      const pixels = new Uint32Array(64 * 64);

      for (let y = 0; y < 64; y++) {
         for (let x = 0; x < 64; x++) {
            const px = blockX.add(pixelScale.mul(x));
            const py = blockY.add(pixelScale.mul(y));
            const color = mandel(px, py);
            //const color = Math.floor(Math.random() * 0xFFF);
            
            const index = (y * 64 + x);
            pixels[index] = 0xC0000000 | ((color & 0xFFF) << 16);
         }
      }

      return {
         pixels
      };
   }

   async paint(address: string, color: number): Promise<void> {
      // not implemented.
   }
}
