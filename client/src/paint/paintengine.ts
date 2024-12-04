// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: painting/rendering engine.
import { buildCoordString } from "./blocks";
import { Coord } from "./cmath2";
import PaintMath from "./paintmath";

const DEFAULT_VIEW_WIDTH = 512;
const DEFAULT_VIEW_HEIGHT = 512;

type View = {
   position: [Coord, Coord]; // The center of the viewport.
   zoom: number; // The zoom level.
   size: [number, number]; // The size of the screen.
};


function getElementAddress(location: ElementLocation): string {
   const addr = buildCoordString(location.coords, location.level);
   if (!addr) throw new Error("Invalid location");
   return addr;
}

class PaintElement {
   location: ElementLocation;
   computedAddress: string;
   image: ImageData;
   dirty: boolean;

   constructor(location: ElementLocation) {
      this.location = location;
      this.computedAddress = getElementAddress(location);
      this.image = new ImageData(64, 64);
      // TEST fill the image with blue
      const data = this.image.data;
      for (let i = 0; i < data.length; i += 4) {
         data[i] = 0;
         data[i + 1] = 0;
         data[i + 2] = 255;
         data[i + 3] = 255;
      }
      this.dirty = true;
   }

   clearDirty(): boolean {
      const d = this.dirty;
      this.dirty = false;
      return d;
   }

}

//----------------------------------------------------------------------------------------
// The paint engine.
export class PaintEngine {
   bufferElement: HTMLCanvasElement;
   view: View = {
      position: [new Coord("0.4"), new Coord("0.4")],
      zoom: 0.0,
      size: [DEFAULT_VIEW_WIDTH, DEFAULT_VIEW_HEIGHT],
   };
   dirty: Record<string,boolean> = {};
   elements: Record<string,PaintElement> = {};

   //-------------------------------------------------------------------------------------
   private getElement(location: ElementLocation) {
      const addr = getElementAddress(location);

      if (this.elements[addr]) {
         return this.elements[addr];
      } else {
         const elem = new PaintElement(location);
         this.elements[addr] = elem;
         return elem;
      }
   }

   //-------------------------------------------------------------------------------------
   private deleteElement(address: string) {
      delete this.elements[address];
   }

   //-------------------------------------------------------------------------------------
   constructor() {
      this.bufferElement = document.createElement("canvas");
      this.bufferElement.width = 1024;
      this.bufferElement.height = 1024;
   }

   //-------------------------------------------------------------------------------------
   getBuffer() {
      return this.bufferElement;
   }

   //-------------------------------------------------------------------------------------
   private deleteOffLevelElements() {
      const zoomInt = Math.floor(this.view.zoom);
      const keysToDelete: string[] = [];

      for (const key in this.elements) {
         const elem = this.elements[key];
         if (elem.location.level != zoomInt) {
            keysToDelete.push(key);
         }
      }

      for (const key of keysToDelete) {
         this.deleteElement(key);
      }
   }

   //-------------------------------------------------------------------------------------
   // Calculate the viewport from the current position, assuming a screen size of 512
   // pixels (not sure if this would be adjustable later).
   private computeViewport() {
      return PaintMath.computeViewport(this.view.position, this.view.zoom, this.view.size);
   }

   //-------------------------------------------------------------------------------------
   render() {
      //const locations = this.getVisibleElementLocations();

      // this.deleteOffLevelElements();
      // const ctx = this.bufferElement.getContext("2d");

      // // We should sort the locations so that ones closer to the center are requested
      // // before others.
      // //locations.sort((a, b) => {
         
      // for (const location of locations) {
      //    const elem = this.getElement(location);
      //    if (elem.clearDirty()) {
      //       ctx?.putImageData(elem.image, 0, 0);
      //       elem.dirty = false;
      //    }
      // }
   }
}

//----------------------------------------------------------------------------------------
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
