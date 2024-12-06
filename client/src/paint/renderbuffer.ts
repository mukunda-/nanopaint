// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { RenderBuffer } from "./paintengine";

//----------------------------------------------------------------------------------------
export class CanvasRenderBuffer implements RenderBuffer {
   buffer: HTMLCanvasElement = document.createElement("canvas");

   //-------------------------------------------------------------------------------------
   constructor(screenWidth: number, screenHeight: number) {
      this.resize(screenWidth, screenHeight);
   }

   //-------------------------------------------------------------------------------------
   resize(screenWidth: number, screenHeight: number) {
      this.buffer.width = (Math.floor(screenWidth / 64) + 2) * 64;
      this.buffer.height = (Math.floor(screenHeight / 64) + 2) * 64;
   }

   //-------------------------------------------------------------------------------------
   getContext() {
      const ctx = this.buffer.getContext("2d");
      return {
         putImageData: (data: ImageData, x: number, y: number) => {
            ctx?.putImageData(data, x, y);
         },
         clear: () => {
            ctx?.clearRect(0, 0, this.buffer.width, this.buffer.height);
         },
      };
   }

   //-------------------------------------------------------------------------------------
   getCanvas() {
      return this.buffer;
   }
}
