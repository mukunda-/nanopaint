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
   test("Fetching a block", async () => {
      const renderBuffer = new TestRenderBuffer();
      
      const engine = new PaintEngine({
         renderBuffer,
         imageDataFactory: TestImageDataFactory,
         apiClient: new Checkerblocks(),
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
      engine.render();
      
      expect(renderBuffer.getContext().putImageData).toHaveBeenCalledTimes(1);
      const lastCall = (renderBuffer.getContext().putImageData).mock.calls.pop();
      const imageData = lastCall[0] as ImageData;
      for (let y = 0; y < 64; y++) {
         for (let x = 0; x < 64; x++) {
            if (x < 32 || y < 32 || x >= 32 || y >= 32) {
               expect(imageData.data[x+y*64]).toBe(0xCFFF0000);
            } else {
               expect(imageData.data[x+y*64]).toBe(0xC0000000);
            }
         }
      } 
      //expect(imageData.data[0]).toBe(0); // Example check, adjust as needed

   });
      
});