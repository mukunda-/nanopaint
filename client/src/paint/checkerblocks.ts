// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { ApiClient, ServerResponse } from "./apiclient";
import { toBase64url } from "./base64";

// Purpose: For testing, a read-only block source that returns a checkerboard pattern.

export class Checkerblocks implements ApiClient {
   
   async getBlock(address: string): Promise<ServerResponse> {
      const pixels = new Uint32Array(64 * 64 * 4);

      for (let y = 0; y < 64; y++) {
         for (let x = 0; x < 64; x++) {
            if (x < 32 && y < 32 || x >= 32 && y >= 32) {
               pixels[(y * 64 + x) * 4] = 0xCFFF0000;
            } else {
               pixels[(y * 64 + x) * 4] = 0xC0000000;
            }
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
