// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import { Coord } from "./cmath2";

export type CoordPair = [Coord, Coord];
export type CoordRect = [Coord, Coord, Coord, Coord];

//----------------------------------------------------------------------------------------
export type ElementLocation = {
   coords: CoordPair;
   level: number;
};

//----------------------------------------------------------------------------------------
export type View = {
   // The centerpoint of the viewport.
   position: [Coord, Coord];

   // scale = 1/2^zoom, 0 = 1.0 over 512 pixels, 1 = 0.5 over 512 pixels, etc.
   zoom: number;

   // The size of the screen in pixels.
   size: [number, number];
};

//----------------------------------------------------------------------------------------
function computeViewport(
   position: CoordPair,
   zoom: number,
   viewSize: [number, number]
): CoordRect {
   const halfViewWidth = new Coord(BigInt(viewSize[0] / 2));
   const halfViewHeight = new Coord(BigInt(viewSize[1] / 2));
   
   const perPixel = computePixelScale(zoom);

   return [
      position[0].sub(perPixel.mul(halfViewWidth)),
      position[1].sub(perPixel.mul(halfViewHeight)),
      position[0].add(perPixel.mul(halfViewWidth)),
      position[1].add(perPixel.mul(halfViewHeight)),
   ];
}

//-------------------------------------------------------------------------------------
// Used for viewport aligning. This will expand the rect to cover any blocks touched.
function alignRectToBlockGrid(
   rect: CoordRect,
   zoom: number,
): CoordRect {
   const trunc = zoom + 3;
   const aligned = [
      rect[0].truncate(trunc),
      rect[1].truncate(trunc),
      rect[2].ceil(trunc),
      rect[3].ceil(trunc),
   ];
   return aligned as CoordRect;
}

//-------------------------------------------------------------------------------------
// Builds a list of element locations that are touched by the current viewport.
function getVisibleElementLocations(
   viewport: CoordRect,
   zoom: number
): ElementLocation[] {
   const [vLeft, vTop, vRight, vBottom] = viewport;
   const zoomInt = Math.floor(zoom);

   const locations: ElementLocation[] = [];

   const blockSize = new Coord(BigInt(1), (zoomInt + 3));

   const zero = new Coord("0");
   const one = new Coord("1");

   // We align the topleft corner of the viewport with the grid we are zoomed on.
   // Zoom 0 = truncate to 1/8 (64 pixel units over 512 pixel screen)

   for (let yc = vTop.truncate(zoomInt + 3); yc.lt(vBottom); yc = yc.add(blockSize)) {
      for (let xc = vLeft.truncate(zoomInt + 3); xc.lt(vRight); xc = xc.add(blockSize)) {

         // All blocks are in 0-1 range. Ignore space outside the block region.
         if (xc.lt(zero) || yc.lt(zero)) continue;
         if (xc.ge(one) || yc.ge(one)) continue;

         const location = {
            coords: [xc, yc] as CoordPair,
            level: zoomInt,
         };
         locations.push(location);
      }
   }

   return locations;
}

//----------------------------------------------------------------------------------------
function getScreenBufferLocation(
   location: CoordPair,
   alignedTopLeft: CoordPair,
   zoom: number,
): ([number,number]|undefined) {
   zoom = Math.floor(zoom);
   // Block buffers begin at a truncated topleft coordinate of the screen view.
   const blockSize = new Coord(BigInt(1), zoom + 3); // 1 / 2^(zoom+3)
   const blockOffset = [
      location[0].sub(alignedTopLeft[0]),
      location[1].sub(alignedTopLeft[1]),
   ];
   const screenOffset = blockOffset.map(c => c.div(blockSize));

   const limit = 1000;
   if (screenOffset[0].lt("0") || screenOffset[0].ge(limit.toString(8))) return undefined;
   return screenOffset.map(c => c.truncate(0).toNumber()) as [number,number];
}
/*
function getBufferDrawPosition(
   viewport: CoordRect,
   zoom: number,
): ([number, number, number]) {
   const zoomInt = Math.floor(zoom);
   const zoomFrac = zoom - Math.floor(zoom);
   const scale = 2 ** zoomInt;

   const adjustedTopLeft = [
      viewport[0].truncate(zoomInt + 3),
      viewport[1].truncate(zoomInt + 3),
   ];
   viewportTopLeft.map(c => c.sub(

   // returns x, y, and scale
   return [1,1,scale];
}*/

//----------------------------------------------------------------------------------------
function computePixelScale(zoom: number) {
   // Compute the fractional scale (between powers of two), and then we'll shift those
   // bits over to the real scale.
   const zoomInt = Math.floor(zoom);
   const zoomFrac = zoom - zoomInt;
   const scale = Math.round((1 / 2 ** (zoomFrac)) * (1<<16));
   // x / 2^(zoomint + 16 + 9)
   // x / 2^zoomint / 65536 / 512
   const perPixel = new Coord(BigInt(scale), 16 + zoomInt + 9);
   // Zoom 0 = 1/1 over 512 pixels
   // Zoom 1 = 1/2 over 512 pixels
   // Zoom 2 = 1/4 over 512 pixels
   // etc...

   return perPixel;
}

//----------------------------------------------------------------------------------------
export const PaintMath = {
   alignRectToBlockGrid,
   computePixelScale,
   computeViewport,
   getScreenBufferLocation,
   getVisibleElementLocations,
};
