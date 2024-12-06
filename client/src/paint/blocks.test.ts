// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import { Coord } from "./cmath2";
import { Blocks, buildCoordString, parseCoordString } from "./blocks";
import { toBase64url } from "./base64";
import { ApiClient } from "./apiclient";
import { delayMillis } from "./common";
import { CoordPair } from "./paintmath";

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
function TestApiClient() {
   const client: ApiClient = {
      getBlock: jest.fn().mockImplementation(async (blockAddress: string) => {
         await delayMillis(50);
         return {
            code: "BLOCK",
            pixels: "",
            lastUpdated: 0,
         };
      }),

      paint: jest.fn().mockImplementation(async (pixelAddress: string, color: number) => {
         return {
            code: "PIXEL_SET",
         };
      }),
   };

   return client;
}

//////////////////////////////////////////////////////////////////////////////////////////
describe("Blocks", () => {

   ///////////////////////////////////////////////////////////////////////////////////////
   test("buildCoordString", () => {
      {
         // 0.4 octal is 0.1 in binary
         // nibbles will be 1000 = 0x80
         // 88 will be the hex bytes for the interleaved components.
         const coords: [Coord, Coord] = [new Coord("0.4"), new Coord("0.4")];
         expect(buildCoordString(coords, 0)).toBe(hex64("03"));
         expect(buildCoordString(coords, 1)).toBe(hex64("8800"));
         expect(buildCoordString(coords, 2)).toBe(hex64("8801"));
         expect(buildCoordString(coords, 3)).toBe(hex64("8802"));
         expect(buildCoordString(coords, 4)).toBe(hex64("8803"));
         expect(buildCoordString(coords, 5)).toBe(hex64("880000"));
      }

      {
         const coords: [Coord, Coord] = [new Coord("0.7"), new Coord("0.7")];
         expect(buildCoordString(coords, 0)).toBe(hex64("03"));
         expect(buildCoordString(coords, 1)).toBe(hex64("8800"));
         expect(buildCoordString(coords, 2)).toBe(hex64("CC01"));
         expect(buildCoordString(coords, 3)).toBe(hex64("EE02"));
         expect(buildCoordString(coords, 4)).toBe(hex64("EE03"));
         expect(buildCoordString(coords, 5)).toBe(hex64("EE0000"));
         expect(buildCoordString(coords, 6)).toBe(hex64("EE0001"));
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("parseCoordString", () => {
      for (let i = 0; i < 100; i++) {
         const x = Math.random() * 0x1000000;
         const y = Math.random() * 0x1000000;
         const bits = Math.floor(Math.random() * 16 + 24);
         const coords: CoordPair = [
            new Coord(x, bits).truncate(bits),
            new Coord(y, bits).truncate(bits),
         ];
         
         const address = buildCoordString(coords, bits)!;
         const [parsed, bits2] = parseCoordString(address);
         expect(parsed[0].toString()).toBe(coords[0].toString());
         expect(parsed[1].toString()).toBe(coords[1].toString());
         expect(bits2).toBe(bits);
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Subscribing to events", async () => {
      jest.useFakeTimers();
      const api = TestApiClient();
      const blocks = new Blocks(api);

      const eventHandler = jest.fn();
      blocks.subscribe(eventHandler);
      
      // When a new block is requested, the status is "pending".
      expect(blocks.getBlock(new Coord("0"), new Coord("0"), 0)).toBe("pending");
      expect(api.getBlock).toHaveBeenCalledTimes(1);
      expect(blocks.getBlock(new Coord("0"), new Coord("0"), 0)).toBe("pending");
      // Does not make additional calls within the same period.
      expect(api.getBlock).toHaveBeenCalledTimes(1);

      expect(eventHandler).toHaveBeenCalledTimes(0);

      // After the delay, the block is fetched.
      await jest.advanceTimersByTimeAsync(100);
      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).toHaveBeenCalledWith("block", expect.anything());
   });

   // todo: cache management - deleting old blocks

   afterEach(() => {
      jest.useRealTimers();
   });
});
