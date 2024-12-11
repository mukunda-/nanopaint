// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { toBase64url } from "./base64";
import { Block, BlockSource } from "./blockcontroller";

// Purpose: For testing, a read-only block source that returns a checkerboard pattern.

export class Checkerblocks implements BlockSource {
   
   async getBlock(address: string): Promise<Block> {
      const pixels = new Uint32Array(64 * 64);

      for (let y = 0; y < 64; y++) {
         for (let x = 0; x < 64; x++) {
            if ((x < 32 && y < 32) || (x >= 32 && y >= 32)) {
               pixels[(y * 64 + x)] = 0xCFED0000;
            } else {
               pixels[(y * 64 + x)] = 0xC0000000;
            }
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
