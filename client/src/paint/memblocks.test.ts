// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { buildCoordString } from "./blockcontroller";
import { Coord } from "./cmath2";
import { Memblocks } from "./memblocks";

//////////////////////////////////////////////////////////////////////////////////////////
function addr(x: string|number, y: string|number, level: number) {
   const str = buildCoordString([new Coord(x), new Coord(y)], level);
   if (!str) throw new Error("invalid address");
   return str;
}

//////////////////////////////////////////////////////////////////////////////////////////
describe("Memblocks", () => {

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Getting empty blocks", async () => {
      const memblocks = new Memblocks();
      const block = await memblocks.getBlock(addr(0, 0, 5));
      expect(block.pixels.length).toBe(64 * 64);
      expect(block.pixels.every(pixel => pixel == 0)).toBe(true);
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Setting a pixel", async () => {
      const mb = new Memblocks();

      // Set the bottom right pixel of a block at a deep level.
      await mb.paint(addr("0.0077", "0.0077", 12), 0xfff);

      // Verify it.
      { 
         const block = await mb.getBlock(addr("0.00", "0.00", 6));
         for (let i = 0; i < 64*64 - 1; i++) {
            expect(block.pixels[i]).toBe(0);
         }
         expect(block.pixels[64*64 - 1]).toBe(0x8FFF0000);
      }

      // And it should bubble into the upper block.
      {
         const block = await mb.getBlock(addr("0.00", "0.00", 5));
         for (let i = 0; i < 64*64; i++) {
            if (i === 31 * 64 + 31) {
               expect(block.pixels[i]).toBe(0x00003FFF);
            } else {
               expect(block.pixels[i]).toBe(0);
            }
         }
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Stripe blending", async () => {
      const mb = new Memblocks();
      for (let y = 0; y < 64; y++) {
         for (let x = 0; x < 64; x++) {
            // Alternate red/blue
            if (x % 2 == 0) {
               await mb.paint(buildCoordString([new Coord(x, 12), new Coord(y, 12)], 12)!, 0x00F);
            } else {
               await mb.paint(buildCoordString([new Coord(x, 12), new Coord(y, 12)], 12)!, 0xF00);
            }
         }
      }

      const checkBlock = async (address: string, boxSize: number) => {
         const block = await mb.getBlock(address);
         for (let y = 0; y < 64; y++) {
            for (let x = 0; x < 64; x++) {
               if (x < boxSize && y < boxSize) {
                  expect(block.pixels[x + y * 64]).toBe(0x0000F808);
               } else {
                  expect(block.pixels[x + y * 64]).toBe(0);
               }
            }
         }
      };

      // Each successive upper level will contain a smaller "box" of the pixels we set.
      // bits-5 will have a 32x32 box, bits-4 will have a 16x16 box etc.
      // bits-3 is the top level
      await checkBlock(addr("0.00", "0.00", 5), 32);
      await checkBlock(addr("0.00", "0.00", 4), 16);
      await checkBlock(addr("0.00", "0.00", 3), 8);
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Revisions", async () => {
      
   });
});