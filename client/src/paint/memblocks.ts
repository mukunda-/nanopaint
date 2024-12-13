// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { Block, BlockSource, buildCoordString, PaintStatus, parseCoordString } from "./blockcontroller";
import { UnixMillis } from "./common";

// Purpose: For prototyping, a client-side block store.

const PIXEL_SET = 0x80000000;
const PIXEL_DRY = 0x40000000;
const DRY_TIME = 5000;

//----------------------------------------------------------------------------------------
function getBlockAddress(address: string): string {  
   const [coords, bits] = parseCoordString(address);
   const addr = buildCoordString(coords, bits - 6);
   if (!addr) throw new Error("invalid address");
   return addr;
}

//----------------------------------------------------------------------------------------
function getParentAddress(address: string): string|undefined {
   const [coords, bits] = parseCoordString(address);
   if (bits <= 3) return undefined;
   return buildCoordString(coords, bits - 1);
}

//----------------------------------------------------------------------------------------
function getPixelIndex(address: string): number {
   const [coords, bits] = parseCoordString(address);
   if (bits <= 6) throw new Error("invalid pixel address");
   const x = Number(coords[0].truncate(bits).value & BigInt(0o77));
   const y = Number(coords[1].truncate(bits).value & BigInt(0o77));
   return x + y * 64;
}

//----------------------------------------------------------------------------------------
type MemBlock = {
   pixels: Uint32Array;
   dryTime: UnixMillis;
   revision: number;
};

//----------------------------------------------------------------------------------------
export class Memblocks implements BlockSource {
   blocks: Record<string, MemBlock> = {};

   //-------------------------------------------------------------------------------------
   getOrCreateBlock(address: string): MemBlock {
      this.blocks[address] ||= {
         pixels: new Uint32Array(64*64),
         dryTime: 0,
         revision: 1,
      };
      return this.blocks[address];
   }

   //-------------------------------------------------------------------------------------
   async getBlock(address: string): Promise<Block> {
      const block = this.blocks[address];
      if (!block) {
         return {
            pixels: new Uint32Array(64*64),
            revision: 1,
         };
      }
      return block;
   }

   //-------------------------------------------------------------------------------------
   private bubbleColor(address: string) {
      const [_coords, bits] = parseCoordString(address);
      if (bits <= 6) {
         return; // At the top level.
      }
      const blockAddress = getBlockAddress(address);
      const block = this.getOrCreateBlock(blockAddress);

      // Gather 4 pixels
      let pixelIndex = getPixelIndex(address);
      pixelIndex &= 0o7676;

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

      const parentBlockAddress = getParentAddress(blockAddress);
      const parentPixelAddress = getParentAddress(address);
      if (!parentBlockAddress) return;
      if (!parentPixelAddress) throw new Error("unexpected pixel address error");
      
      const parentBlock = this.getOrCreateBlock(parentBlockAddress);
      const parentPixelIndex = getPixelIndex(parentPixelAddress);

      const upperPixelValue = parentBlock.pixels[parentPixelIndex];
      if ((upperPixelValue & 0xFFFF) == computed) {
         return; // No change, stop the bubble.
      }
      parentBlock.pixels[parentPixelIndex] = (upperPixelValue & 0xFFFF0000) | computed;
      parentBlock.revision++;

      this.bubbleColor(parentPixelAddress);
   }

   //-------------------------------------------------------------------------------------
   async paint(address: string, color: number): Promise<PaintStatus> {
      if (color > 0xFFF) throw new Error("invalid color");
      const blockAddress = getBlockAddress(address);

      const block = this.getOrCreateBlock(blockAddress);
      const index = getPixelIndex(address);

      if (block.pixels[index] & PIXEL_DRY) {
         return "dry";
      }
      block.pixels[index] |= PIXEL_SET | (color << 16);
      block.dryTime = Date.now() + DRY_TIME;
      block.revision++;

      this.bubbleColor(address);
      
      return "ok";
   }
}
