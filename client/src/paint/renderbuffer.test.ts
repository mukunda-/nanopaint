/**
 * Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
 * Distributed under the MIT license. See LICENSE.txt for details.
 * @jest-environment jsdom
 */

import { RenderBuffer, RenderBufferContext } from "./paintengine";
import { CanvasRenderBuffer } from "./renderbuffer";

//////////////////////////////////////////////////////////////////////////////////////////
export class TestRenderBuffer implements RenderBuffer {
   context: RenderBufferContext = {
      putImageData: jest.fn(),
      clear: jest.fn(),
   };

   getContext() {
      return this.context;
   }
}

//////////////////////////////////////////////////////////////////////////////////////////
describe("RenderBuffer", () => {

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Construction", () => {
      const buffer = new CanvasRenderBuffer(256, 256);

      // The created buffer has an additional 64px padding on each side for scrolling.
      expect(buffer.getCanvas().width).toBe(256 + 64 + 64);
      expect(buffer.getCanvas().height).toBe(256 + 64 + 64);

      // todo: we only need padding on the right and bottom sides.
   });
});
