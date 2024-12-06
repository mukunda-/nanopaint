// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { Coord } from "./cmath2";
import { PaintEngine } from "./paintengine";
import { TestRenderBuffer } from "./renderbuffer.test";

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
   test("Basic rendering", () => {
      
      const renderBuffer = new TestRenderBuffer();

      const engine = new PaintEngine({
         renderBuffer,
         imageDataFactory: TestImageDataFactory,
      });
      jest.clearAllMocks();
      engine.render();
      // Viewing entire level-0 canvas, 8x8 blocks.
      expect(renderBuffer.getContext().putImageData).toHaveBeenCalledTimes(64);

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
});