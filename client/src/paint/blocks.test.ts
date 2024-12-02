// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import { Coord } from "./cmath2";
import { buildCoordString } from "./blocks";
import { toBase64url } from "./base64";

//////////////////////////////////////////////////////////////////////////////////////////
// Convert a string of hex digits into a base64url string.
// This makes it easier to see what data we are comparing against.
function hex64(hex: string): string {
   const bytes = new Uint8Array(hex.length / 2);
   
   for (let i = 0; i < hex.length; i += 2) {
      const digits = hex.substring(i, i + 2);
      bytes[i/2] = parseInt(digits, 16);
   }
   return toBase64url(bytes);
}

//////////////////////////////////////////////////////////////////////////////////////////
describe("blocks", () => {

   test("build coord string", () => {
      {
         // 0.4 octal is 0.1 in binary
         // nibbles will be 1000 = 0x80
         // 88 will be the hex bytes for the interleaved components.
         const coords = [new Coord("0.4"), new Coord("0.4")];
         expect(buildCoordString(coords, 0)).toBe(hex64("03"));
         expect(buildCoordString(coords, 1)).toBe(hex64("8800"));
         expect(buildCoordString(coords, 2)).toBe(hex64("8801"));
         expect(buildCoordString(coords, 3)).toBe(hex64("8802"));
         expect(buildCoordString(coords, 4)).toBe(hex64("8803"));
         expect(buildCoordString(coords, 5)).toBe(hex64("880000"));
      }

      {
         const coords = [new Coord("0.7"), new Coord("0.7")];
         expect(buildCoordString(coords, 0)).toBe(hex64("03"));
         expect(buildCoordString(coords, 1)).toBe(hex64("8800"));
         expect(buildCoordString(coords, 2)).toBe(hex64("CC01"));
         expect(buildCoordString(coords, 3)).toBe(hex64("EE02"));
         expect(buildCoordString(coords, 4)).toBe(hex64("EE03"));
         expect(buildCoordString(coords, 5)).toBe(hex64("EE0000"));
         expect(buildCoordString(coords, 6)).toBe(hex64("EE0001"));
      }
   });
});