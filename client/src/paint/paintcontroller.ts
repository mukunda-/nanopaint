// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { PaintEngine } from "./paintengine";

export class PaintController {
   private engine: PaintEngine;
   private tool = "look";

   //-------------------------------------------------------------------------------------
   constructor(engine: PaintEngine) {
      this.engine = engine;
   }

   //-------------------------------------------------------------------------------------
   resetTool() {

   }

   //-------------------------------------------------------------------------------------
   setTool(tool: string) {
      this.resetTool();
      this.tool = tool;
   }

   //-------------------------------------------------------------------------------------
   pointerDown(x: number, y: number) {
      // todo
      console.log("pointerDown", x, y);
      if (this.tool == "look") {
         
      }
   }

   //-------------------------------------------------------------------------------------
   pointerMove(x: number, y: number) {
      // todo
      console.log("pointerMove", x, y);
   }

   //-------------------------------------------------------------------------------------
   pointerUp(x: number, y: number) {
      // todo
      console.log("pointerUp", x, y);
   }
}