// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// painting/rendering engine.
import { Coord } from "./cmath2";

// The paint engine.
class Paint {
   bufferElement: HTMLCanvasElement;
   pan = [new Coord("0.4"), new Coord("0.4")];
   zoom = 0.0;
   dirty: Record<string,boolean> = {};

   constructor() {
      this.bufferElement = document.createElement("canvas");
      this.bufferElement.width = 1024;
      this.bufferElement.height = 1024;
   }

   render() {

   }
}

function render(canvasId: string, coords: Coord[], zoom: number) {
   // const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
   // const ctx = canvas.getContext("2d");
   // const width = canvas.width;
   // const height = canvas.height;
   // const scale = 1 << zoom;

   // const [sign, value, point] = parseCoords(coords);
   // const str = (sign ? "-" : "") + value + "e" + point;

   // const num = new BigFloat(str);
   // const x = num.mul(new BigFloat(width)).div(new BigFloat(scale));
   // const y = num.mul(new BigFloat(height)).div(new BigFloat(scale));

   // ctx.fillRect(x.toNumber(), y.toNumber(), 1, 1);
}