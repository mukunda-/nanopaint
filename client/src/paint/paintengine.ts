// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: painting/rendering engine.
import { buildCoordString } from "./blocks";
import { Coord } from "./cmath2";

const DEFAULT_VIEW_WIDTH = 512;
const DEFAULT_VIEW_HEIGHT = 512;

type View = {
   position: Coord[]; // The center of the viewport.
   zoom: number; // The zoom level.
   size: [number, number]; // The size of the screen.
};

type ElementLocation = {
   coords: Coord[];
   level: number;
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
      const halfViewWidth = new Coord(BigInt(this.view.size[0]));
      const halfViewHeight = new Coord(BigInt(this.view.size[1]));
      
      // Compute the fractional scale (between powers of two), and then we'll shift those
      // bits over to the real scale.
      const zoomInt = Math.floor(this.view.zoom);
      const zoomFrac = this.view.zoom - zoomInt;
      const scale = 131072 - 2 ** (zoomFrac) * (1<<16);
      const perPixel = new Coord(BigInt(scale), 16 + zoomInt - 9);
      // Zoom 0 = 1/1 over 512 pixels
      // Zoom 1 = 1/2 over 512 pixels
      // Zoom 2 = 1/4 over 512 pixels
      // etc...

      return [
         this.view.position[0].sub(perPixel.mul(halfViewWidth)),
         this.view.position[1].sub(perPixel.mul(halfViewHeight)),
         this.view.position[0].add(perPixel.mul(halfViewWidth)),
         this.view.position[1].add(perPixel.mul(halfViewHeight)),
      ];
   }

   //-------------------------------------------------------------------------------------
   // Builds a list of element locations that are touched by the current viewport.
   private getVisibleElementLocations() {
      const [vLeft, vTop, vRight, vBottom] = this.computeViewport();
      const zoomInt = Math.floor(this.view.zoom);

      this.deleteOffLevelElements();
      const ctx = this.bufferElement.getContext("2d");

      const locations: ElementLocation[] = [];

      // Align the topleft corner of the viewport with the grid we are zoomed on.
      // Zoom 0 = truncate to 1/8 (64 pixel units over 512 pixel screen)
      vLeft.truncate(zoomInt + 3);
      vTop.truncate(zoomInt + 3);
      const blockSize = new Coord(BigInt(1), (zoomInt + 3));

      const zero = new Coord("0");
      const one = new Coord("1");

      // "100" is octal 64.
      for (let xc = vLeft.clone(); xc.lt(vRight); xc.add(blockSize)) {
         for (let yc = vTop.clone(); yc.lt(vBottom); yc.add(blockSize)) {

            // All blocks are in 0-1 range. Ignore space outside the block region.
            if (xc.lt(zero) || yc.lt(zero)) continue;
            if (xc.ge(one) || yc.ge(one)) continue;

            const location = {
               coords: [xc, yc],
               level: zoomInt,
            };
            locations.push(location);
         }
      }

      return locations;
   }

   //-------------------------------------------------------------------------------------
   render() {
      
      // const elem = this.getElement(location);
      // if (elem.clearDirty()) {
      //    ctx?.putImageData(elem.image, 0, 0);
      //    // redraw to screen. otherwise wait for an update event.
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
