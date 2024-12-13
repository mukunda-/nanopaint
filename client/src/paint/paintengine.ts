// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: painting/rendering engine.

import { ApiBlockSource } from "./apiblocksource";
import { DefaultApiClient } from "./apiclient";
import { BlockController, ThrottlingBlockController, BlockSource, buildCoordString, parseCoordString, BlockEvent } from "./blockcontroller";
import { Cmath, Coord } from "./cmath2";
import { PaintMath, ElementLocation, CoordRect, CoordPair } from "./paintmath";
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
   private blocks: BlockController;
   private minimumPaintGrid = 8;

   //-------------------------------------------------------------------------------------
   constructor(options: {
      renderBuffer: RenderBuffer,
      imageDataFactory?: ImageDataFactory,
      blockSource?: BlockSource,
      blocks?: BlockController,
   }) {
      this.renderBuffer = options.renderBuffer;
      this.imageDataFactory = options.imageDataFactory || ((width, height) => new ImageData(width, height));
      //this.blocks = new Blocks(new DefaultApiClient("localhost"));
      this.blocks = options.blocks || new ThrottlingBlockController(
         options.blockSource
         || new ApiBlockSource(new DefaultApiClient("")));
         
      this.blocks.subscribe((event) => {
         this.onBlockEvent(event);
      });
      this.setView({});
   }

   //-------------------------------------------------------------------------------------
   private markElementsDirtyAtLocation(location: CoordPair, bits: number) {
      // The size of the location depends on the bits.
      // 0 bits = entire canvas (1)
      // 1 bits = half of canvas (0.5)
      // 2 bits = quarter of canvas (0.25)
      // 3 bits = 1/8 of canvas (0.125) <- this is the minimum zoom on the client.
      const size = new Coord(1, bits);
      const bottomright = [
         location[0].add(size),
         location[1].add(size),
      ];

      for (const key of Object.keys(this.elements)) {
         const elem = this.elements[key];
         if (elem.location.coords[0].ge(location[0])
             && elem.location.coords[1].ge(location[1])
             && elem.location.coords[0].lt(bottomright[0])
             && elem.location.coords[1].lt(bottomright[1])
         ) {
            elem.dirty = true;
         }
      }
   }

   //-------------------------------------------------------------------------------------
   private onBlockEvent(event: BlockEvent) {
      if (event.type == "block") {
         // When a block is loaded, dirty any elements that it covers. This may be a
         // higher level block that dirties several underlying elements. Our elements only
         // exist at the bottommost level we are looking at.
         
         const [location, bits] = parseCoordString(event.address);
         this.markElementsDirtyAtLocation(location, bits);
      }
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
      const locations = PaintMath.getVisibleElementLocations(this.viewport, this.view.zoom);
      locations.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      return locations;
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
      this.blocks.cancelPendingReadRequests();
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

   // //-------------------------------------------------------------------------------------
   // computePriority(location: CoordPair, level: number): number {
   //    // The closer to the origin, the higher the priority
   //    // (lower number = higher priority).
   //    const origin = this.view.position;

   //    // location += blockWidth / 2
   //    // e.g., for level 0, add 1/16 (half of 1/8 units)
   //    // Get difference from origin.
   //    let x = location[0]
   //       .add(new Coord(1, level + 4))
   //       .sub(origin[0]);
   //    let y = location[1]
   //       .add(new Coord(1, level + 4))
   //       .sub(origin[1]);

   //    // Scale to 1/2 block units.
   //    const scale = new Coord(1, level + 4);
   //    // result = x^2/scale + y^2/scale
   //    x = x.mul(x).div(scale);
   //    y = y.mul(y).div(scale);

   //    // Truncate(16) is to avoid a situation where a lot of low-order/trash bits are
   //    // messing with the desired precision.    
   //    return x.add(y).truncate(16).toNumber();
   // }

   //-------------------------------------------------------------------------------------
   renderElement(element: PaintElement) {
      const block = this.blocks.getBlock(
         element.location.coords[0],
         element.location.coords[1],
         element.location.level + 3,
         element.location.priority,//this.computePriority(element.location.coords, element.location.level)
      );
      if (block == "out_of_bounds" || block == "pending") return;
      // Out of bound is a logic error and should be reported?

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
         elem.location.priority = location.priority;
         if (elem.clearDirty() || this.repaintAll) {
            // <Update element image>
            this.renderElement(elem);
         }
         const bufferCoords = PaintMath.getScreenBufferLocation(location.coords, bufferTopLeft, this.view.zoom);
         if (!bufferCoords) continue; // Out of range.
         ctx?.putImageData(elem.image, bufferCoords[0] * 64, bufferCoords[1] * 64);
         
         // {
         //    const ct = (ctx as any).getCanvasContext();
         //    const debugText = elem.location.priority?.toFixed(2);
         //    const statusSize = ct.measureText(debugText);
         //    ct.fillStyle = "white";
         //    ct.fillRect(bufferCoords[0] * 64, bufferCoords[1] * 64, statusSize.width + 4, 12);
         //    ct.fillStyle = "black";
         //    ct.font = "11px sans-serif";
         //    ct.fillText(debugText, bufferCoords[0] * 64, bufferCoords[1] * 64 + 12);
         // }
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

   //-------------------------------------------------------------------------------------
   private pickLocation(x: number, y: number): [Coord, Coord] {
      const viewport = this.getViewport();
      return [
         Cmath.lerp(viewport[0], viewport[2], x / this.view.size[0]),
         Cmath.lerp(viewport[1], viewport[3], y / this.view.size[1]),
      ];
   }

   //-------------------------------------------------------------------------------------
   private getPaintLevel() {
      let level = this.view.zoom + 3;
      level = Math.floor(level - Math.log2(this.minimumPaintGrid));
      level = Math.max(level, 9);
      return Math.floor(level);
   }

   //-------------------------------------------------------------------------------------
   paint(x: number, y: number, color: number) {
      const location = this.pickLocation(x, y);
      const level = this.getPaintLevel();

      const address = buildCoordString(location, level);
      if (!address) return;

      const zoom = Math.max(
         Math.floor(this.view.zoom - 3),
         0,
      );
      
   }
}
