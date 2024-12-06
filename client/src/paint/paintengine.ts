// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: painting/rendering engine.
import { ApiClient, DefaultApiClient } from "./apiclient";
import { Blocks, buildCoordString } from "./blocks";
import { Coord } from "./cmath2";
import { Mandelblock } from "./mandelblock";
import { PaintMath, ElementLocation, CoordRect } from "./paintmath";
import { View } from "./paintmath";

//----------------------------------------------------------------------------------------
const DEFAULT_VIEW_WIDTH  = 512;
const DEFAULT_VIEW_HEIGHT = 512;

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
   clear(): void;
   putImageData(image: ImageData, x: number, y: number): void;
}

//----------------------------------------------------------------------------------------
// The paint engine.
export class PaintEngine {
   private renderBuffer: RenderBuffer;
   readonly view: View = {
      position: [new Coord(0.5), new Coord(0.5)],
      zoom: 0.0,
      size: [DEFAULT_VIEW_WIDTH, DEFAULT_VIEW_HEIGHT],
   };
   private viewport: CoordRect = [
      new Coord(0), new Coord(0), new Coord(1), new Coord(1)
   ];
   private alignedViewport: CoordRect = [
      new Coord(0), new Coord(0), new Coord(1), new Coord(1)
   ];
   private elements: Record<string,PaintElement> = {};
   private imageDataFactory: ImageDataFactory;
   private repaintAll = true;
   private blocks: Blocks;

   //-------------------------------------------------------------------------------------
   constructor(options: {
      renderBuffer: RenderBuffer,
      imageDataFactory?: ImageDataFactory,
      apiClient?: ApiClient
   }) {
      this.renderBuffer = options.renderBuffer;
      this.imageDataFactory = options.imageDataFactory || ((width, height) => new ImageData(width, height));
      this.setView({});
      //this.blocks = new Blocks(new DefaultApiClient("localhost"));
      this.blocks = new Blocks(options.apiClient || new DefaultApiClient(""));
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
   getBufferPixelSize(): [number, number] {
      const pixelScale = PaintMath.computePixelScale(Math.floor(this.view.zoom));
      return [
         this.alignedViewport[2].sub(this.alignedViewport[0]).div(pixelScale).toNumber(),
         this.alignedViewport[3].sub(this.alignedViewport[1]).div(pixelScale).toNumber(),
      ];
   }

   //-------------------------------------------------------------------------------------
   getBufferScreenPosition(): [number, number, number, number] {
      //const zoomFrac = this.view.zoom - Math.floor(this.view.zoom);
      // const scale = 2 ** zoomFrac;
      // const bufferPixelSize = this.getBufferPixelSize();

      const viewport = this.viewport;
      const viewportWidth = viewport[2].sub(viewport[0]);
      const viewportHeight = viewport[3].sub(viewport[1]);
      const left = this.alignedViewport[0]
         .sub(this.viewport[0])
         .mul(this.view.size[0])
         .div(viewportWidth)
         .toNumber();
      const top = this.alignedViewport[1]
         .sub(this.viewport[1])
         .mul(this.view.size[1])
         .div(viewportHeight)
         .toNumber();

      const width = this.alignedViewport[2]
         .sub(this.alignedViewport[0])
         .mul(this.view.size[0])
         .div(viewportWidth)
         .toNumber();
      const height = this.alignedViewport[3]
         .sub(this.alignedViewport[1])
         .mul(this.view.size[1])
         .div(viewportHeight)
         .toNumber();

      return [left, top, width, height];
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
   // computeViewport() {
   //    return PaintMath.computeViewport(this.view.position, this.view.zoom, this.view.size);
   // }

   //-------------------------------------------------------------------------------------
   private getVisibleElementLocations() {
      return PaintMath.getVisibleElementLocations(this.viewport, this.view.zoom);
   }

   //-------------------------------------------------------------------------------------
   setView(opts: {
      position?: [Coord, Coord],
      zoom?: number,
      size?: [number, number]
   }) {
      opts = opts || {};
      if (opts.position) this.view.position = opts.position;
      if (opts.zoom !== undefined) this.view.zoom = opts.zoom;
      if (opts.size) this.view.size = opts.size;

      this.viewport = PaintMath.computeViewport(this.view.position, this.view.zoom, this.view.size);
      this.alignedViewport = PaintMath.alignRectToBlockGrid(this.viewport, this.view.zoom);
      //console.log(this.alignedViewport.map(c => c.toString()).join(","));
      this.repaintAll = true;
   }

   //-------------------------------------------------------------------------------------
   getViewport() {
      return this.viewport;
   }

   //-------------------------------------------------------------------------------------
   getAlignedViewport() {
      return this.alignedViewport;
   }

   //-------------------------------------------------------------------------------------
   getView() {
      return this.view;
   }

   //-------------------------------------------------------------------------------------
   renderElement(element: PaintElement) {
      const block = this.blocks.getBlock(element.location.coords[0], element.location.coords[1], element.location.level);
      if (!block) return;
      if (block == "pending") return;

      // <Update element image>
      const data = element.image.data;
      for (let i = 0; i < 64 * 64; i++) {
         const r = (block.pixels[i] >> 16) & 0xF;
         const g = (block.pixels[i] >> 20) & 0xF;
         const b = (block.pixels[i] >> 24) & 0xF;
         const a = (block.pixels[i] >> 31);

         data[i * 4] = Math.round(r * 255/15);
         data[i * 4 + 1] = Math.round(g * 255/15);
         data[i * 4 + 2] = Math.round(b * 255/15);
         data[i * 4 + 3] = a ? 255 : 0;
      }
   }

   //-------------------------------------------------------------------------------------
   render() {
      const locations = this.getVisibleElementLocations();

      this.deleteOffLevelElements();
      const ctx = this.renderBuffer.getContext();

      // We should sort the locations so that ones closer to the center are requested
      // before others.
      //locations.sort((a, b) => {
      const bufferTopLeft = [
         this.alignedViewport[0], this.alignedViewport[1]
      ] as [Coord, Coord];
         
      ctx?.clear();

      // const paintedLocations = {};

      for (const location of locations) {
         const elem = this.getElement(location);
         if (elem.clearDirty() || this.repaintAll) {
            // <Update element image>
            this.renderElement(elem);
         }
         const bufferCoords = PaintMath.getScreenBufferLocation(location.coords, bufferTopLeft, this.view.zoom);
         if (!bufferCoords) continue; // Out of range.
         ctx?.putImageData(elem.image, bufferCoords[0] * 64, bufferCoords[1] * 64);
         
      }

      // for (let y = 0; y < this.view.size[1] / 64 + 2; y++) {
      //    for (let x = 0; x < this.view.size[0] / 64 + 2; x++) {
      //       if (!paintedLocations[x + "," + y]) {
      //          ctx?.clearRect(x * 64, y * 64, 64, 64);
      //       }
      //    }
      // }

      this.repaintAll = false;
   }
}
