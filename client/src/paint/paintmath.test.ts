// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import { Coord } from "./cmath2";
import { ElementLocation, PaintMath } from "./paintmath";

function coords(xy: string): [Coord, Coord] {
   const [x, y] = xy.split(",");
   return [new Coord(x), new Coord(y)];
}

function rect(rect: string): [Coord, Coord, Coord, Coord] {
   const [a, b, c, d] = rect.split(",");
   return [new Coord(a), new Coord(b), new Coord(c), new Coord(d)];
}

describe("PaintMath", () => {

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Computing the viewport", () => {

      // The base scale at zoom 0 will span 512 pixels.
      const vsize: [number, number] = [512, 512];

      expect(
         PaintMath.computeViewport(coords("0.4,0.4"), 0, vsize)
            .map(c => c.toString()).join(",")
      ).toBe("0,0,1,1");

      expect(
         PaintMath.computeViewport(coords("0.4,0.4"), 1, vsize)
            .map(c => c.toString()).join(",")
      ).toBe("0.2,0.2,0.6,0.6");

      expect(
         PaintMath.computeViewport(coords("0.4,0.4"), 2, vsize)
            .map(c => c.toString()).join(",")
      ).toBe("0.3,0.3,0.5,0.5");

      // Fractional zooms are at scale 2^zoom
      // test with zoom=log_2(1/0.75) (0.6 octal units, 0.75 decimal units)
      // z = ~0.41503749927884381
      // 1 / 2^z = 0.75
      expect(
         PaintMath.computeViewport(coords("0.4,0.4"), 0.41503749927884381, vsize)
            .map(c => c.toString()).join(",")
      ).toBe("0.1,0.1,0.7,0.7");

      // Viewport can have coordinates outside of the valid block range (0-1).
      expect(
         PaintMath.computeViewport(coords("0.0,0.1"), 1, vsize).map(c => c.toString()).join(",")
      ).toBe("-0.2,-0.1,0.2,0.3");

      expect(
         PaintMath.computeViewport(coords("1.0,0.7"), 1, vsize).map(c => c.toString()).join(",")
      ).toBe("0.6,0.5,1.2,1.1");
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Compute visible element locations", () => {

      const expectConstraints = (locs: ElementLocation[], level: number) => {
         const dups = new Set<string>();
         for (const loc of locs) {
            ///////////////////////////////////////////////////
            // There should be no duplicate locations returned.
            const locstring = loc.coords.map(c => c.toString()).join(",");
            expect(dups.has(locstring)).toBe(false);
            dups.add(locstring);

            ///////////////////////////////////////////////////
            // The level should always equal the compute level.
            expect(loc.level).toBe(level);

            for (let i = 0; i < 2; i++) {
               const coord = loc.coords[i];
               //////////////////////////////////////////////////////////////////////////
               // All returned locations should be within the valid block boundary [0,1).
               expect(coord.ge("0")).toBe(true);
               expect(coord.lt("1")).toBe(true);
            
               //////////////////////////////////////////////////////////////////////////
               // There should be no lower-order bits set beyond `level` of fraction.
               expect(coord.truncate(3 + level).eq(coord)).toBe(true);
            }            
         }
      };

      {
         const locs = PaintMath.getVisibleElementLocations(rect("0,0,1,1"), 0);  
         expect(locs.length).toBe(64); // 8x8 grid
         expectConstraints(locs, 0);
      }
      
      ////////////////////////////////////////////////////////////////
      // A viewport bigger than the valid block range will be clamped.
      {
         // So this returns the same.
         const locs = PaintMath.getVisibleElementLocations(rect("-5,-5,5,5"), 0);
         expect(locs.length).toBe(64); // 8x8 grid
         expectConstraints(locs, 0);
      }
      
      
      //////////////////////////////////////////////////////////////////////////////
      // Partially visible blocks are included. The viewport coordinates are aligned
      // with the grid.
      {   
         const locs = PaintMath.getVisibleElementLocations(rect("0.02,0.02,0.71,0.71"), 0);
         expect(locs.length).toBe(64); // 8x8 grid
         expectConstraints(locs, 0);
      }

      //////////////////////////////////////////////////////////////////////////////
      // Blocks completely outside of the viewport are not included.
      {
         const locs = PaintMath.getVisibleElementLocations(rect("0.1,0.1,0.7,0.7"), 0);
         expect(locs.length).toBe(36); // 6x6 grid
         expectConstraints(locs, 0);
         for (const loc of locs) {
            for (let i = 0; i < 2; i++) {
               const coord = loc.coords[i];
               expect(coord.ge("0.1")).toBe(true);
               expect(coord.lt("0.7")).toBe(true); // Must be less than the bottomright
            }
         }
            
      }{
         const locs = PaintMath.getVisibleElementLocations(rect("0.1,0.1,0.7000001,0.7000001"), 0);
         expect(locs.length).toBe(49); // 7x7 grid
         expectConstraints(locs, 0);
         for (const loc of locs) {
            for (let i = 0; i < 2; i++) {
               const coord = loc.coords[i];
               expect(coord.ge("0.1")).toBe(true);
               expect(coord.le("0.7")).toBe(true); // Less or equal than 0.7
            }
         }
      }
      
      {
         // A viewport bigger than the valid block range will be clamped.
         const locs = PaintMath.getVisibleElementLocations(rect("-5,-5,5,5"), 1);
         expect(locs.length).toBe(256); // 16x16 grid
         expectConstraints(locs, 1);
      }
   });
});
