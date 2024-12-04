// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: bigint arithmetic. Supposedly bigint can handle a million bits, so it is
// plenty sufficient for our "infinite" canvas. All we need is about 300 bits (which would
// be extremely generous).

export let MaxPrecision = 384;

//----------------------------------------------------------------------------------------
export class Coord {
   // How many lower bits of the value are the fractional part. 0 = integer. This is
   // clamped when max precision is exceeded.
   point: number;

   // real = value / 2^point
   value: bigint;

   //-------------------------------------------------------------------------------------
   constructor(valueOrString: bigint|string, point?: number) {
      point = point || 0;
      if (typeof valueOrString == "string") {
         const coords = parseCoord(valueOrString);
         this.point = coords.point;
         this.value = coords.value;
      } else {
         this.point = point;
         this.value = valueOrString;
      }
   }

   //-------------------------------------------------------------------------------------
   // Passing coord around makes a shared reference. This will make a copy.
   clone(): Coord {
      return new Coord(this.value, this.point);
   }

   //-------------------------------------------------------------------------------------
   // Wrappers for Cmath convenience.
   add(b: Coord|string): Coord { return add(this, b); }
   sub(b: Coord|string): Coord { return sub(this, b); }
   mul(b: Coord|string): Coord { return mul(this, b); }
   negate(): Coord { return negate(this); }
   truncate(bits: number): Coord { return truncate(this, bits); }
   compare(b: Coord|string): number { return compare(this, b); }
   lt(b: Coord|string): boolean { return this.compare(b) < 0; }
   le(b: Coord|string): boolean { return this.compare(b) <= 0; }
   eq(b: Coord|string): boolean { return this.compare(b) == 0; }
   ge(b: Coord|string): boolean { return this.compare(b) >= 0; }
   gt(b: Coord|string): boolean { return this.compare(b) > 0; }

   //-------------------------------------------------------------------------------------
   toString(): string {
      const point = this.point;
      const sign = this.value < 0;
      const absval = sign ? -this.value : this.value;

      // Integer part is easy.
      const integer = absval >> BigInt(point);

      // Fractional part is a little difficult. We want to convert to string but must
      // preserve the upper-order zeroes.
      let frac = absval & ((BigInt(1) << BigInt(point)) - BigInt(1));

      // So, set this bit, and then we need to align this bit on an octal boundary.
      // 3 bits = shift by 0
      // 4 bits = shift by 2
      // 5 bits = shift by 1
      // 6 bits = shift by 0
      frac |= BigInt(1) << BigInt(point);
      frac <<= BigInt(3 - (point % 3));
      // Then we discard the first digit and any trailing zeroes (handled by cleanNumberString)

      // Operation example:
      // octal 77.1234 fraction = .1234 = bits 0.001 010 011 100 = 001010011100
      // If that was converted directly to a number, it'd strip the leading zeroes and
      // incorrectly report octal "668" (binary 1010011100)
      // So we add a 1 at the end, convert that, and then discard the first digit.
      //    001010011100
      // | 1000000000000
      // ---------------
      // = 1001010011100
      //    ^^^ first octal digit
      //   ^ dummy bit to preserve the leading zeroes
      // toString -> 11234 -> remove first digit -> 1234

      const intstr = integer.toString(8);
      const fracstr = frac.toString(8).substring(1);
      
      return (sign ? "-":"") + cleanNumberString(intstr + "." + fracstr);
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
function parseCoord(coord: string): Coord {
   const sign = coord.startsWith("-");
   coord = sign ? coord.substring(1) : coord;
   let frac = coord.indexOf(".");
   coord = coord.replace(".", "");
   if (frac == -1) {
      frac = 0;
   } else {
      frac = (coord.length - frac) * 3;
   }

   coord = coord.padStart(coord.length + ((8 - coord.length % 8) % 8), "0");
   let value = BigInt(0);

   for (let i = 0; i < coord.length; i += 8) {
      const start = coord.length - 8 - i;
      const chunk = parseInt(coord.substring(start, start + 8), 8);
      value += BigInt(chunk) << BigInt(i * 3);
   }

   return new Coord(sign ? -value : value, frac);
}

//----------------------------------------------------------------------------------------
function truncate(value: Coord|string, bits: number): Coord {
   if (typeof value == "string") value = parseCoord(value);

   let v = value.value, p = value.point;
   if (bits >= 0) {
      if (p > bits) {
         const discardBits = p - bits;
         v >>= BigInt(discardBits);
         p -= discardBits;
      }
   } else {
      const discardBits = p;
      v >>= BigInt(discardBits);
      p = 0;

      v >>= BigInt(-bits);
      v <<= BigInt(-bits);
   }

   return new Coord(v, p);
}

//----------------------------------------------------------------------------------------
function add(a: Coord|string, b: Coord|string) {
   if (typeof a == "string") a = parseCoord(a);
   if (typeof b == "string") b = parseCoord(b);

   const point = Math.max(a.point, b.point);
   let av = a.value, bv = b.value;
   if (a.point < point) {
      av <<= BigInt(point - a.point);
   } else if (b.point < point) {
      bv <<= BigInt(point - b.point);
   }

   return truncate(new Coord(av + bv, point), MaxPrecision);
}

//----------------------------------------------------------------------------------------
function sub(a: Coord|string, b: Coord|string): Coord {
   if (typeof a == "string") a = parseCoord(a);
   if (typeof b == "string") b = parseCoord(b);

   return truncate(add(a, negate(b)), MaxPrecision);
}

//----------------------------------------------------------------------------------------
function mul(a: Coord|string, b: Coord|string): Coord {
   if (typeof a == "string") a = parseCoord(a);
   if (typeof b == "string") b = parseCoord(b);

   return truncate(new Coord(a.value * b.value, a.point + b.point), MaxPrecision);
}

//----------------------------------------------------------------------------------------
// Compares two coords and returns -1 for a < b, 0 for a = b, and 1 for a > b.
function compare(a: Coord|string, b: Coord|string): number {
   if (typeof a == "string") a = parseCoord(a);
   if (typeof b == "string") b = parseCoord(b);
   
   const point = Math.max(a.point, b.point);
   let av = a.value, bv = b.value;
   if (a.point < point) {
      av <<= BigInt(point - a.point);
   } else if (b.point < point) {
      bv <<= BigInt(point - b.point);
   }

   if (av < bv) return -1;
   if (av > bv) return 1;
   return 0;
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
   if (typeof a == "string") a = parseCoord(a);
   return new Coord(-a.value, a.point);
}

//----------------------------------------------------------------------------------------
export const Cmath = {
   add,
   sub,
   mul,
   negate,
   compare,
   truncate,
   parseCoord,
   setPrecision,
   getPrecision,
};
