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
   private hammer: HammerManager|undefined;
   private desiredZoom = 0;
   private wheelFactor = 0.00125;

   private lookActive = false;
   private lookCoords: [Coord, Coord] = [new Coord("0"), new Coord("0")];

   //-------------------------------------------------------------------------------------
   constructor(engine: PaintEngine, canvas: HTMLCanvasElement) {
      this.engine = engine;
      this.canvas = canvas;
      // this.hammer = new Hammer(canvas);
      // this.hammer.remove("swipe");
      // this.hammer.get("pinch").set({ enable: true });
      // this.hammer.on("panstart panmove panend", (ev) => {
      //    this.panEvent(ev);
      // });

      this.canvas.addEventListener("pointerdown", (ev) => {
         const rect = this.canvas.getBoundingClientRect();
         const x = ev.clientX - rect.left;
         const y = ev.clientY - rect.top;
         this.pointerDown(x, y);
         this.canvas.setPointerCapture(ev.pointerId);
      });

      this.canvas.addEventListener("pointermove", (ev) => {
         const rect = this.canvas.getBoundingClientRect();
         const x = ev.clientX - rect.left;
         const y = ev.clientY - rect.top;
         this.pointerMove(x, y);
      });

      this.canvas.addEventListener("pointerup", (ev) => {
         const rect = this.canvas.getBoundingClientRect();
         const x = ev.clientX - rect.left;
         const y = ev.clientY - rect.top;
         this.canvas.releasePointerCapture(ev.pointerId);
         this.pointerUp(x, y);
      });

      this.canvas.addEventListener("pointercancel", (ev) => {
         this.canvas.releasePointerCapture(ev.pointerId);
      });

      this.canvas.addEventListener("wheel", (ev) => {
         ev.preventDefault();
         const rect = this.canvas.getBoundingClientRect();
         const x = ev.clientX - rect.left;
         const y = ev.clientY - rect.top;
         const delta = ev.deltaY * this.wheelFactor;
         this.wheel(x, y, delta);
         // this.engine.zoom(delta, { x: ev.clientX, y: ev.clientY });
      });
   }

   //-------------------------------------------------------------------------------------
   release() {
      this.hammer?.destroy();
      this.hammer = undefined;
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
   private pickLocation(x: number, y: number): [Coord, Coord] {
      const viewport = this.engine.getViewport();
      return [
         Cmath.lerp(viewport[0], viewport[2], x / this.canvas.width),
         Cmath.lerp(viewport[1], viewport[3], y / this.canvas.height),
      ];
   }

   //-------------------------------------------------------------------------------------
   pointerDown(x: number, y: number) {
      // todo
      console.log("pointerDown", x, y);
      if (this.tool == "look") {
         // When "looking" we lock this position to wherever the mouse is.
         // Pick that spot and save it.
         this.lookActive = true;
         this.lookCoords = this.pickLocation(x, y);

         // Fix up our coordinates so we aren't stuck with high precision when we're zoomed out.
         // x8 for blocks
         // x64 for current pixel resolution
         // x4 for extra resolution
         const trunc = Math.floor(this.engine.getView().zoom) + 3 + 6 + 2; 
         this.lookCoords[0] = this.lookCoords[0].truncate(trunc);
         this.lookCoords[1] = this.lookCoords[1].truncate(trunc);
         console.log(this.canvas.width);
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

         

         this.engine.setView({
            position: newCoords,
         });
      }
   }

   //-------------------------------------------------------------------------------------
   pointerUp(x: number, y: number) {
      // todo
      console.log("pointerUp", x, y);
      this.lookActive = false;
   }
   
   //-------------------------------------------------------------------------------------
   wheel(x: number, y: number, delta: number) {
      this.desiredZoom += delta;
      if (this.desiredZoom < 0) this.desiredZoom = 0;
      if (this.desiredZoom > 100) this.desiredZoom = 100;

      const snapPosition = this.lookActive ? this.lookCoords : this.pickLocation(x, y);
      
      const pixelScale = PaintMath.computePixelScale(this.desiredZoom);
      const pointer: [number, number] = [
         x - this.engine.view.size[0] / 2,
         y - this.engine.view.size[1] / 2,
      ];
      const position: [Coord, Coord] = [
         snapPosition[0].sub(Cmath.mul(pixelScale, pointer[0])),
         snapPosition[1].sub(Cmath.mul(pixelScale, pointer[1])),
      ];

      const zoom = this.desiredZoom;
      this.engine.setView({
         position,
         zoom,
      });
   }
}