// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// bigint utilities. Supposedly bigint can handle a million bits, so that is plenty
// sufficient for our "infinite" canvas. All we need is about 300 bits.

export let MaxPrecision = 128; // 384-bit

//----------------------------------------------------------------------------------------
export class Coord {
   point: number;
   value: bigint;

   constructor(valueOrString: bigint|string, point?: number) {
      point = point || 0;
      if (typeof valueOrString == "string") {
         const coords = parseCoords(valueOrString);
         this.point = coords.point;
         this.value = coords.value;
      } else {
         this.point = point;
         this.value = valueOrString;
      }
   }

   add(b: Coord|string): Coord {
      return add(this, b);
   }

   sub(b: Coord|string): Coord {
      return sub(this, b);
   }

   toString(): string {
      const sign = this.value < 0;
      const point = this.point;
      const value = (sign ? -this.value : this.value).toString(8).padStart(point, "0");
      const leftSide = value.length - point;
      
      return (sign ? "-":"") + cleanNumberString(value.substring(0, leftSide) + "." + value.substring(leftSide));
   }
}

//----------------------------------------------------------------------------------------
function cleanNumberString(value: string): string {
   // Trim leading zeroes.
   if (value.startsWith("0")) {
         
      for (let i = 0; i <= value.length; i++) {
         if (value[i] != "0") {
            value = value.substring(i);
            break;
         }
      }
   }

   // Trim trailing zeroes.
   if (value.endsWith("0")) {
      for (let i = value.length - 1; i >= 0; i--) {
         if (value[i] != "0") {
            value = value.substring(0, i + 1);
            break;
         }
      }
   }

   // Trim trailing dot.
   if (value.endsWith(".")) {
      value = value.substring(0, value.length - 1);
   }

   // Add leading zero if starting with dot.
   if (value.startsWith(".")) {
      value = "0" + value;
   }

   // Empty string is zero.
   if (value == "") {
      value = "0";
   }

   return value;
}

//----------------------------------------------------------------------------------------
function setPrecision(precision: number) {
   MaxPrecision = precision;
}

//----------------------------------------------------------------------------------------
function getPrecision(): number {
   return MaxPrecision;
}

//----------------------------------------------------------------------------------------
function parseCoords(coords: string): Coord {
   const sign = coords.startsWith("-");
   coords = sign ? coords.substring(1) : coords;
   let frac = coords.indexOf(".");
   coords = coords.replace(".", "");
   if (frac == -1) {
      frac = 0;
   } else {
      frac = coords.length - frac;
   }

   coords = coords.padStart(coords.length + ((8 - coords.length % 8) % 8), "0");
   let value = BigInt(0);

   for (let i = 0; i < coords.length; i += 8) {
      const start = coords.length - 8 - i;
      const chunk = parseInt(coords.substring(start, start + 8), 8);
      value += BigInt(chunk) << BigInt(i * 3);
   }

   return new Coord(sign ? -value : value, frac);
}

//----------------------------------------------------------------------------------------
function truncate(value: Coord, maxPoint: number): Coord {
   let v = value.value, p = value.point;
   if (p > maxPoint) {
      const discardDigits = p - maxPoint;
      v >>= BigInt(8) * BigInt(discardDigits);
      p -= discardDigits;
   }
   return new Coord(v, p);
}

//----------------------------------------------------------------------------------------
function add(a: Coord|string, b: Coord|string) {
   if (typeof a == "string") a = parseCoords(a);
   if (typeof b == "string") b = parseCoords(b);

   const point = Math.max(a.point, b.point);
   let av = a.value, bv = b.value;
   if (a.point < point) {
      av <<= BigInt(3) * BigInt(point - a.point);
   } else if (b.point < point) {
      bv <<= BigInt(3) * BigInt(point - b.point);
   }

   return truncate(new Coord(av + bv, point), MaxPrecision);
}

//----------------------------------------------------------------------------------------
function sub(a: Coord|string, b: Coord|string): Coord {
   if (typeof a == "string") a = parseCoords(a);
   if (typeof b == "string") b = parseCoords(b);

   return truncate(add(a, negate(b)), MaxPrecision);
}

//----------------------------------------------------------------------------------------
function mul(a: Coord|string, b: Coord|string): Coord {
   if (typeof a == "string") a = parseCoords(a);
   if (typeof b == "string") b = parseCoords(b);

   return truncate(new Coord(a.value * b.value, a.point + b.point), MaxPrecision);
}


// leaving division out of the implementation unless we need it.
//----------------------------------------------------------------------------------------
// function div(a: Coords|string, b: Coords|string): Coords {
//    if (typeof a == "string") a = parseCoords(a);
//    if (typeof b == "string") b = parseCoords(b);

//    return truncate(new Coords(a.value / b.value, a.point - b.point), MaxPrecision);
// }

//----------------------------------------------------------------------------------------
function negate(a: Coord|string): Coord {
   if (typeof a == "string") a = parseCoords(a);
   return new Coord(-a.value, a.point);
}

//----------------------------------------------------------------------------------------
export const Cmath = {
   add,
   sub,
   mul,
   negate,
   parseCoords,
   setPrecision,
   getPrecision,
};
