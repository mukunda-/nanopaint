// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { Checkerblocks } from "./checkerblocks";
import { Coord } from "./cmath2";
import { PaintEngine } from "./paintengine";
import { TestRenderBuffer } from "./testrenderbuffer";

//////////////////////////////////////////////////////////////////////////////////////////


function TestImageDataFactory(w: number, h: number): ImageData {
   return {
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
      colorSpace: "srgb",
   };
}

//////////////////////////////////////////////////////////////////////////////////////////
describe("PaintEngine", () => {

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Viewport clipping", async () => {
      
      //////////////////////////////////////////////////////////////////////
      // Any blocks that are not within the viewport range are not rendered.
      // Only blocks that are partially or fully within the viewport area are rendered.
      const renderBuffer = new TestRenderBuffer();
      const engine = new PaintEngine({
         renderBuffer,
         imageDataFactory: TestImageDataFactory,
         blockSource: new Checkerblocks(),
      });
      jest.clearAllMocks();
      engine.render();
      // Viewing entire level-0 canvas, 8x8 blocks.
      expect(renderBuffer.getContext().putImageData).toHaveBeenCalledTimes(64);

      // Yield to the event loop to allow block requests to complete.
      await new Promise((resolve) => setImmediate(resolve));

      jest.clearAllMocks();
      engine.setView({
         position: [new Coord("0.1"), new Coord("0.1")]
      });
      engine.render();
      // Viewing upper-left corner with slight overlap of other side. 5x5 blocks.
      expect(renderBuffer.getContext().putImageData).toHaveBeenCalledTimes(25);

      jest.clearAllMocks();
      engine.setView({
         position: [new Coord("0"), new Coord("0.00")],
      });
      engine.render();
      // Viewing upper-left corner, 4x4 blocks.
      expect(renderBuffer.getContext().putImageData).toHaveBeenCalledTimes(16);

      // Zoomed in, we'll still see 8x8 blocks but at a lower level.
      jest.clearAllMocks();
      engine.setView({
         position: [new Coord("0.4"), new Coord("0.4")],
         zoom: 2,
      });
      engine.render();
      expect(renderBuffer.getContext().putImageData).toHaveBeenCalledTimes(64);

      // Zoomed in at , we'll still see 8x8 blocks but at a lower level.
      jest.clearAllMocks();
      engine.setView({
         position: [new Coord("0.4"), new Coord("0.4")],
         zoom: 2.42, // This zoom should clip off the first edge of blocks.
      });
      engine.render();
      expect(renderBuffer.getContext().putImageData).toHaveBeenCalledTimes(36);
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Block queue requests", async () => {
      // The engine calls a BlockQueue to get pixel data for each block. The addresses
      // should never overlap, but the engine may request the same block multiple times
      // if it was not satisfied previously.
      const renderBuffer = new TestRenderBuffer();

      const requested: Record<string, number> = {};
      const priorities: Record<string, number> = {};
      const blocks = {
         subscribe: jest.fn(),
         unsubscribe: jest.fn(),
         cancelPendingRequests: jest.fn(),
         getBlock: jest.fn().mockImplementation((x: Coord, y: Coord, level: number, priority?: number) => {
            const index = `${x},${y},${level}`;
            requested[index] = (requested[index] || 0) + 1;
            priorities[index] = priority || 0;
         }),
      };

      const engine = new PaintEngine({
         renderBuffer,
         imageDataFactory: TestImageDataFactory,
         blocks,
      });

      engine.setView({
         position: [new Coord("0.4"), new Coord("0.4")],
         zoom: 0,
         size: [512,512],
      });

      engine.render();

      // A 512x512 viewport is 8x8 blocks at zoom level 0.
      expect(blocks.getBlock).toHaveBeenCalledTimes(64);

      // Zoom level 0 is 3 bits, that is 1/8 units for blocks on the screen.
      expect(requested["0,0,3"]).toBe(1);

      // Each pass should never make duplicate requests - that would indicate elements
      // are duplicated somewhere.
      expect(Object.values(requested).some((v) => v > 1)).toBe(false);

      // Priority on the outer edges of the viewport have a lower priority than the
      // center. Higher priority numbers = lower priority.
      
      expect(priorities["0,0,3"]).toBeGreaterThan(priorities["0.2,0.2,3"]);
      expect(priorities["0.7,0,3"]).toBeGreaterThan(priorities["0.5,0.2,3"]);
      expect(priorities["0,0.7,3"]).toBeGreaterThan(priorities["0.2,0.5,3"]);
      expect(priorities["0.7,0.7,3"]).toBeGreaterThan(priorities["0.5,0.5,3"]);

      expect(priorities["0.2,0.2,3"]).toBeGreaterThan(priorities["0.4,0.4,3"]);
      expect(priorities["0.5,0.2,3"]).toBeGreaterThan(priorities["0.4,0.4,3"]);
      expect(priorities["0.2,0.5,3"]).toBeGreaterThan(priorities["0.4,0.4,3"]);
      expect(priorities["0.5,0.5,3"]).toBeGreaterThan(priorities["0.4,0.4,3"]);
   });
   
   ///////////////////////////////////////////////////////////////////////////////////////
   test("Fetching a block", async () => {
      const renderBuffer = new TestRenderBuffer();
      
      const engine = new PaintEngine({
         renderBuffer,
         imageDataFactory: TestImageDataFactory,
         blockSource: new Checkerblocks(),
      });

      engine.setView({
         position: [new Coord("0"), new Coord("0")],
         zoom: 0,
         size: [64,64],
      });

      // Rendering will queue block requests. We should have 1 request queued.
      // Our 64x64 viewport is partially covering the block at 0,0.
      engine.render();

      // Yield to the event loop so the pending block requests complete.
      // Checkerblocks will fulfill immediately.
      await new Promise((resolve) => setImmediate(resolve));

      jest.clearAllMocks();
      engine.setView({});
      engine.render();
      
      
      expect(renderBuffer.getContext().putImageData).toHaveBeenCalledTimes(1);
      const lastCall = (renderBuffer.getContext().putImageData).mock.calls.pop();
      const imageData = lastCall[0] as ImageData;
      for (let y = 0; y < 64; y++) {
         for (let x = 0; x < 64; x++) {
            let [r, g, b, a] = [0, 0, 0, 255];

            // Match the checkerboard pattern.
            if ((x < 32 && y < 32) || (x >= 32 && y >= 32)) {
               [r,g,b,a] = [221,238,255,255]; // 0xFED
            }

            expect(imageData.data[(x+y*64)*4]).toBe(r); // 0xFED
            expect(imageData.data[(x+y*64)*4+1]).toBe(g);
            expect(imageData.data[(x+y*64)*4+2]).toBe(b);
            expect(imageData.data[(x+y*64)*4+3]).toBe(a);
         }
      } 
      //expect(imageData.data[0]).toBe(0); // Example check, adjust as needed

   });
      
});