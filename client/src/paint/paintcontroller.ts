// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { Cmath, Coord } from "./cmath2";
import { PaintEngine } from "./paintengine";
import * as Hammer from "hammerjs";
import { PaintMath } from "./paintmath";

export class PaintController {
   private engine: PaintEngine;
   private tool = "look";
   private canvas: HTMLCanvasElement;
   private hammer: HammerManager;

   private lookActive = false;
   private lookCoords: [Coord, Coord] = [new Coord("0"), new Coord("0")];

   //-------------------------------------------------------------------------------------
   constructor(engine: PaintEngine, canvas: HTMLCanvasElement) {
      this.engine = engine;
      this.canvas = canvas;
      this.hammer = new Hammer(canvas);
      this.hammer.remove("swipe");
      this.hammer.get("pinch").set({ enable: true });
      this.hammer.on("panstart panmove panend", (ev) => {
         this.panEvent(ev);
      });
   }

   release() {
      this.hammer.destroy();
   }

   //-------------------------------------------------------------------------------------
   resetTool() {
      //this.hammer.remove(
   }

   //-------------------------------------------------------------------------------------
   setTool(tool: string) {
      this.resetTool();
      this.tool = tool;
   }

   //-------------------------------------------------------------------------------------
   panEvent(ev: HammerInput) {
      const rect = this.canvas.getBoundingClientRect();
      if (ev.type == "panstart") {
         console.log("panstart");
         const x = ev.center.x - rect.left;
         const y = ev.center.y - rect.top;
         this.pointerDown(x, y);
      } else if (ev.type == "panmove") {
         const x = ev.center.x - rect.left;
         const y = ev.center.y - rect.top;
         this.pointerMove(x, y);
      } else if (ev.type == "panend") {
         const x = ev.center.x - rect.left;
         const y = ev.center.y - rect.top;
         console.log("panend");
         this.pointerUp(x, y);
      }
   }

   //-------------------------------------------------------------------------------------
   pointerDown(x: number, y: number) {
      // todo
      console.log("pointerDown", x, y);
      if (this.tool == "look") {
         // pass
         const viewport = this.engine.getViewport();

         // When "looking" we lock this position to wherever the mouse is.
         // Pick that spot and save it.
         this.lookActive = true;
         this.lookCoords = [
            Cmath.lerp(viewport[0], viewport[2], x / this.canvas.width),
            Cmath.lerp(viewport[1], viewport[3], y / this.canvas.height),
         ];
      }
   }

   //-------------------------------------------------------------------------------------
   pointerMove(x: number, y: number) {
      // todo
      if (this.lookActive) {
         const pointer: [number, number] = [
            x - this.engine.view.size[0] / 2,
            y - this.engine.view.size[1] / 2,
         ];

         // look pos - pointerpos * pixelscale
         const pixelScale = PaintMath.computePixelScale(this.engine.view.zoom);

         const newCoords: [Coord, Coord] = [
            this.lookCoords[0].sub(Cmath.mul(pixelScale, pointer[0])),
            this.lookCoords[1].sub(Cmath.mul(pixelScale, pointer[1])),
         ];

         this.engine.setView(newCoords);
      }
   }

   //-------------------------------------------------------------------------------------
   pointerUp(x: number, y: number) {
      // todo
      console.log("pointerUp", x, y);
      this.lookActive = false;
   }
}