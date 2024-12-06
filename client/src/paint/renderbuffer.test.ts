// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { RenderBuffer, RenderBufferContext } from "./paintengine";

export class TestRenderBuffer implements RenderBuffer {
   context: RenderBufferContext = {
      putImageData: jest.fn(),
      clear: jest.fn(),
   };

   getContext() {
      return this.context;
   }
}
