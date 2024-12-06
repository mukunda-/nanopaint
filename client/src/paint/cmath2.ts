// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: bigint arithmetic. Supposedly bigint can handle a million bits, so it is
// plenty sufficient for our "infinite" canvas. All we need is about 300 bits (which would
// be extremely generous).

export let MaxPrecision = 384;

type CoordInput = Coord|string|number;

//----------------------------------------------------------------------------------------
export class Coord {
   // How many lower bits of the value are the fractional part. 0 = integer. This is
   // clamped when max precision is exceeded.
   point: number;

   // real = value / 2^point
   value: bigint;

   //-------------------------------------------------------------------------------------
   constructor(valueOrString: number|bigint|string, point?: number) {
      point = point || 0;
      if (typeof valueOrString == "string") {
         const coords = parseCoord(valueOrString);
         this.point = coords.point;
         this.value = coords.value;
      } else if (typeof valueOrString == "number") {
         const num = valueOrString;
         this.point = point;
         if (Math.floor(num) == num) {
            this.value = BigInt(valueOrString);
         } else {
            this.value = BigInt(Math.floor(valueOrString * 2**24));
            this.point += 24;
         }
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
   add(b: CoordInput): Coord { return add(this, b); }
   sub(b: CoordInput): Coord { return sub(this, b); }
   mul(b: CoordInput): Coord { return mul(this, b); }
   div(b: CoordInput): Coord { return div(this, b); }
   negate(): Coord { return negate(this); }
   truncate(bits?: number): Coord { return truncate(this, bits); }
   ceil(bits?: number): Coord { return ceil(this, bits); }
   compare(b: CoordInput): number { return compare(this, b); }
   lt(b: CoordInput): boolean { return this.compare(b) < 0; }
   le(b: CoordInput): boolean { return this.compare(b) <= 0; }
   eq(b: CoordInput): boolean { return this.compare(b) == 0; }
   ge(b: CoordInput): boolean { return this.compare(b) >= 0; }
   gt(b: CoordInput): boolean { return this.compare(b) > 0; }

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

   //-------------------------------------------------------------------------------------
   toNumber(): number {
      return Number(this.value) / 2**this.point;
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
function makeCoord(coord: CoordInput): Coord {
   if (coord instanceof Coord) return coord;
   if (typeof coord == "string") {
      return parseCoord(coord);
   }
   if (typeof coord == "number") {
      if (Math.floor(coord) == coord) {
         // Integer
         return new Coord(BigInt(coord), 0);
      } else {
         // Include fraction.
         const expanded = Math.floor(coord * 2**24);
         return new Coord(BigInt(expanded), 24);
      }
   }
   throw new Error("Invalid coord input");
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
function truncate(value: CoordInput, bits?: number): Coord {
   value = makeCoord(value);
   bits = bits ?? 0;

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
// Truncates with ceiling instead of floor.
function ceil(value: CoordInput, bits?: number): Coord {
   value = makeCoord(value);
   bits = bits ?? 0;
   
   // e.g. 0b1.1110100 with 3 bits:
   //          ^^^ preserved
   //             ^^^^ if this is not zero, then add one to the preserved.

   let v = value.value, p = value.point;
   if (bits >= 0) {
      if (p > bits) {
         const discardBits = p - bits;
         const mask = (BigInt(1) << BigInt(discardBits)) - BigInt(1);
         if ((v & mask) != BigInt(0)) {
            v += BigInt(1) << BigInt(discardBits);
         }
         v >>= BigInt(discardBits);
         p -= discardBits;
      }
   } else {
      const discardBits = p;
      const mask = (BigInt(1) << BigInt(p + -bits)) - BigInt(1);
      if ((v & mask) != BigInt(0)) {
         v += BigInt(1) << BigInt(p + -bits);
      }
      v >>= BigInt(discardBits);
      p = 0;

      v >>= BigInt(-bits);
      v <<= BigInt(-bits);
   }

   return new Coord(v, p);
}

//----------------------------------------------------------------------------------------
function add(a: CoordInput, b: CoordInput) {
   a = makeCoord(a);
   b = makeCoord(b);

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
function sub(a: CoordInput, b: CoordInput): Coord {
   a = makeCoord(a);
   b = makeCoord(b);

   return truncate(add(a, negate(b)), MaxPrecision);
}

//----------------------------------------------------------------------------------------
function mul(a: CoordInput, b: CoordInput): Coord {
   a = makeCoord(a);
   b = makeCoord(b);

   return truncate(new Coord(a.value * b.value, a.point + b.point), MaxPrecision);
}

//----------------------------------------------------------------------------------------
// Compares two coords and returns -1 for a < b, 0 for a = b, and 1 for a > b.
function compare(a: CoordInput, b: CoordInput): number {
   a = makeCoord(a);
   b = makeCoord(b);
   
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

//----------------------------------------------------------------------------------------
function div(a: CoordInput, b: CoordInput): Coord {
   a = makeCoord(a);
   b = makeCoord(b);

   if (b.value == BigInt(0)) {
      throw new Error("Division by zero");
   }

   return truncate(new Coord((a.value << BigInt(b.point)) / b.value, a.point), MaxPrecision);
}

//----------------------------------------------------------------------------------------
function negate(a: CoordInput): Coord {
   a = makeCoord(a);
   return new Coord(-a.value, a.point);
}

//----------------------------------------------------------------------------------------
function lerp(a: CoordInput, b: CoordInput, delta: number): Coord {
   a = makeCoord(a);
   b = makeCoord(b);

   const difference = sub(b, a);
   const deltaCoord = new Coord(BigInt(Math.floor(delta * 0x10000)), 16);
   return truncate(add(a, mul(difference, deltaCoord)), MaxPrecision);
}

//----------------------------------------------------------------------------------------
export const Cmath = {
   add,
   sub,
   mul,
   div,
   negate,
   compare,
   truncate,
   ceil,
   lerp,
   parseCoord,
   setPrecision,
   getPrecision,
};
