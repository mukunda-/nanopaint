/**
 * Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
 * Distributed under the MIT license. See LICENSE.txt for details.
 * @jest-environment jsdom
 */

import { CanvasRenderBuffer } from "./renderbuffer";

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
