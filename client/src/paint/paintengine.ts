// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: painting/rendering engine.
import { buildCoordString } from "./blocks";
import { Coord } from "./cmath2";
import { PaintMath, ElementLocation } from "./paintmath";

//----------------------------------------------------------------------------------------
const DEFAULT_VIEW_WIDTH  = 512;
const DEFAULT_VIEW_HEIGHT = 512;

//----------------------------------------------------------------------------------------
type View = {
   // The centerpoint of the viewport.
   position: [Coord, Coord];

   // scale = 1/2^zoom, 0 = 1.0 over 512 pixels, 1 = 0.5 over 512 pixels, etc.
   zoom: number;

   // The size of the screen in pixels.
   size: [number, number];
};

//----------------------------------------------------------------------------------------
function getElementAddress(location: ElementLocation): string {
   const addr = buildCoordString(location.coords, location.level + 3);
   if (!addr) throw new Error("Invalid location");
   return addr;
}

//----------------------------------------------------------------------------------------
type ImageDataFactory = (width: number, height: number) => ImageData;

//----------------------------------------------------------------------------------------
class PaintElement {
   location: ElementLocation;
   computedAddress: string;
   image: ImageData;
   dirty: boolean;

   constructor(location: ElementLocation, factory: ImageDataFactory) {
      this.location = location;
      this.computedAddress = getElementAddress(location);
      this.image = factory(64, 64);
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
export interface RenderBuffer {
   getContext(): RenderBufferContext;
}

//----------------------------------------------------------------------------------------
export interface RenderBufferContext {
   putImageData(image: ImageData, x: number, y: number): void;
}

//----------------------------------------------------------------------------------------
// The paint engine.
export class PaintEngine {
   private renderBuffer: RenderBuffer;
   readonly view: View = {
      position: [new Coord("0.4"), new Coord("0.4")],
      zoom: 0.0,
      size: [DEFAULT_VIEW_WIDTH, DEFAULT_VIEW_HEIGHT],
   };
   private elements: Record<string,PaintElement> = {};
   private imageDataFactory: ImageDataFactory;
   private repaintAll = true;

   //-------------------------------------------------------------------------------------
   constructor(options: {
      renderBuffer: RenderBuffer,
      imageDataFactory?: ImageDataFactory,
   }) {
      this.renderBuffer = options.renderBuffer;
      this.imageDataFactory = options.imageDataFactory || ((width, height) => new ImageData(width, height));
   }

   //-------------------------------------------------------------------------------------
   private getElement(location: ElementLocation) {
      const addr = getElementAddress(location);

      if (this.elements[addr]) {
         return this.elements[addr];
      } else {
         const elem = new PaintElement(location, this.imageDataFactory);
         this.elements[addr] = elem;
         return elem;
      }
   }

   //-------------------------------------------------------------------------------------
   private deleteElement(address: string) {
      delete this.elements[address];
   }

   //-------------------------------------------------------------------------------------
   getBuffer() {
      return this.renderBuffer;
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
   private getVisibleElementLocations() {
      return PaintMath.getVisibleElementLocations(this.computeViewport(), this.view.zoom);
   }

   //-------------------------------------------------------------------------------------
   setView(position?: [Coord, Coord], zoom?: number, size?: [number, number]) {
      if (position) this.view.position = position;
      if (zoom !== undefined) this.view.zoom = zoom;
      if (size) this.view.size = size;
      this.repaintAll = true;
   }

   //-------------------------------------------------------------------------------------
   render() {
      const locations = this.getVisibleElementLocations();

      this.deleteOffLevelElements();
      const ctx = this.renderBuffer.getContext();

      // We should sort the locations so that ones closer to the center are requested
      // before others.
      //locations.sort((a, b) => {
      const viewport = this.computeViewport();
      const bufferTopLeft = [
         viewport[0].truncate(this.view.zoom + 3),
         viewport[1].truncate(this.view.zoom + 3),
      ] as [Coord, Coord];
         
      for (const location of locations) {
         const elem = this.getElement(location);
         if (elem.clearDirty() || this.repaintAll) {
            const bufferCoords = PaintMath.getScreenBufferLocation(location.coords, bufferTopLeft, this.view.zoom);
            if (!bufferCoords) continue; // Out of range.
            ctx?.putImageData(elem.image, bufferCoords[0] * 64, bufferCoords[1] * 64);
            elem.dirty = false;
         }
      }

      this.repaintAll = false;
   }

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
