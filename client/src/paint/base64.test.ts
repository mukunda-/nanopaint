// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { toBase64url } from "./base64";

describe("base64", () => {
   
   test("uint8array encoding", () => {

      {
         // UTF-8 data should not interfere with encoding.
         const bytes = new Uint8Array(8);
         bytes[0] = 0xF0; // 🐸
         bytes[1] = 0x9F;
         bytes[2] = 0x90;
         bytes[3] = 0xb8;

         expect(toBase64url(bytes)).toBe(Buffer.from(bytes, 0, 8).toString("base64url"));
      }

      {
         // Behavior should match Buffer behavior.
         const bytes = new Uint8Array(256);
         for (let i = 0; i < 256; i++) {
            bytes[i] = i;
         }
         
         expect(toBase64url(bytes)).toBe(Buffer.from(bytes).toString("base64url"));
      }

      {
         // Behavior should match Buffer behavior.
         // Test against different lengths.
         // Padding should not be used in the result.
         for (let i = 0; i < 5000; i++) {
            const len = 40 + i % 10;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
               bytes[i] = Math.floor(Math.random() * 256);
            }
            expect(toBase64url(bytes)).toBe(Buffer.from(bytes).toString("base64url"));
         }
      }
   });
   
});