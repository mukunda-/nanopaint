// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
// High resolution coordinates.
// (not used, in favor of bigint implementation)

// Numbers are kept in base 8 decimal format.

export type Coords = string;

function parseCoords(coords: Coords): [boolean, string, number] {
   const sign = coords.startsWith("-");
   coords = sign ? coords.substring(1) : coords;
   let frac = coords.indexOf(".");
   coords = coords.replace(".", "");
   if (frac == -1) {
      frac = 0;
   } else {
      frac = coords.length - frac;
   }

   const padding = "0".repeat((8 - coords.length % 8) % 8);
   frac += padding.length;

   return [sign, coords + padding, frac];
}

//----------------------------------------------------------------------------------------
// Returns sign, value, and magnitude of two numbers.
// The numbers are padded to 8 digits and aligned to the same length.
// e.g. 2.4 and 33.11 will return 02400000 and 33110000 with magnitude 2.
function parseBinaryAligned(a: Coords, b: Coords): [boolean, boolean, string, string, number] {
   const sign1 = a[0] == "-";
   const sign2 = b[0] == "-";
   a = a.replace("-", "");
   b = b.replace("-", "");

   let [int1, frac1] = a.split(".");
   let [int2, frac2] = b.split(".");
   frac1 = frac1 || "";
   frac2 = frac2 || "";

   if (int1.length > int2.length) {
      int2 = int2.padStart(int1.length, "0");
   } else if (int2.length > int1.length) {
      int1 = int1.padStart(int2.length, "0");
   }

   if (frac1.length > frac2.length) {
      frac2 = frac2.padEnd(frac1.length, "0");
   } else if (frac2.length > frac1.length) {
      frac1 = frac1.padEnd(frac2.length, "0");
   }

   const totalLength = int1.length + frac1.length;
   const padding = "0".repeat((8 - totalLength % 8) % 8);

   return [sign1, sign2, int1 + frac1 + padding, int2 + frac2 + padding, int1.length];
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
function performAdd(value1: string, value2: string, mag: number): string {
   const resultParts: string[] = [];
   let carry = 0;
   for (let i = value1.length - 8; i >= 0; i -= 8) {
      const a = parseInt(value1.substring(i, i + 8), 8);
      const b = parseInt(value2.substring(i, i + 8), 8);
      const c = a + b + carry;
      carry = c >> 24;
      resultParts.push((c & 0xFFFFFF).toString(8).padStart(8, "0"));
   }

   let mag2 = mag;
   if (carry > 0) {
      const carryString = carry.toString(8);
      resultParts.push(carryString);
      mag2 += carryString.length;
   }

   let resultString = resultParts.reverse().join("");
   resultString = resultString.substring(0, mag2) + "." + resultString.substring(mag2);

   return resultString;
}

//----------------------------------------------------------------------------------------
function performSubtract(value1: string, value2: string, mag: number): [boolean, string] {
   let sign = false;

   // lexographical comparison works since the numbers are
   // aligned to the same length by parseBinaryOperation.
   if (value2 > value1) {
      const temp = value1;
      value1 = value2;
      value2 = temp;
      sign = true;
   }

   const resultParts: string[] = [];
   let carry = 0;
   for (let i = value1.length - 8; i >= 0; i -= 8) {
      const a = parseInt(value1.substring(i, i + 8), 8);
      const b = parseInt(value2.substring(i, i + 8), 8);
      const c = a - b - carry;
      carry = c < 0 ? 1 : 0;
      resultParts.push((c & 0xFFFFFF).toString(8).padStart(8, "0"));
   }

   if (carry < 0) {
      throw new Error("unexpected negative carry");
   }

   let resultString = resultParts.reverse().join("");
   resultString = resultString.substring(0, mag) + "." + resultString.substring(mag);

   return [sign, resultString];
}

//----------------------------------------------------------------------------------------
function performMulPart(value1: string, value2: string): string {
   const resultParts: string[] = [];
   const factor = parseInt(value2, 8);
   let carry = 0;
   for (let i = value1.length - 8; i >= 0; i -= 8) {
      const a = parseInt(value1.substring(i, i + 8), 8);
      const product = a * factor + carry;
      carry = product >> 24;
      resultParts.push((product & 0xFFFFFF).toString(8).padStart(8, "0"));
   }

   resultParts.push(carry.toString(8));

   return resultParts.reverse().join("");
}

//----------------------------------------------------------------------------------------
function add(a: Coords, b: Coords): Coords {
   const [sign1, sign2, value1, value2, mag] = parseBinaryAligned(a, b);
   
   if (sign1 && !sign2) {
      const [resultSign, result] = performSubtract(value2, value1, mag);
      return (resultSign ? "-":"") + cleanNumberString(result);
   } else if (sign2 && !sign1) {
      const [resultSign, result] = performSubtract(value1, value2, mag);
      return (resultSign ? "-":"") + cleanNumberString(result);
   }

   const result = performAdd(value1, value2, mag);
   return ((sign1 && sign2) ? "-" : "") + cleanNumberString(result);
}

//----------------------------------------------------------------------------------------
function sub(a: Coords, b: Coords): Coords {
   const [sign1, sign2, value1, value2, mag] = parseBinaryAligned(a, b);

   if (sign1 && !sign2) {
      const result = performAdd(value1, value2, mag);
      return "-" + cleanNumberString(result);
   } else if (sign2 && !sign1) {
      const result = performAdd(value1, value2, mag);
      return cleanNumberString(result);
   }

   const [sign, result] = performSubtract(value1, value2, mag);
   if (sign1 && sign2) {
      return ((!sign) ? "-" : "") + cleanNumberString(result);
   } else {
      return (sign ? "-" : "") + cleanNumberString(result);
   }
}

//----------------------------------------------------------------------------------------
function mul(a: Coords, b: Coords): Coords {
   // TODO: unfinished logic!
   // using bigint (cmath2) instead.

   const [sign1, value1, frac1] = parseCoords(a);
   const [sign2, value2, frac2] = parseCoords(b);

   const fracs = frac1 + frac2;
   const sign = sign1 != sign2;
   const summands: string[] = [];
   for (let part = 0; part < value2.length; part += 8) {
      const partValue = value2.substring(part, part + 8);
      // for each part, divide by 8 digits.
      summands.push("0".repeat(part) + performMulPart(value1, partValue));
   }

   let sum = summands[0];
   for (let i = 1; i < summands.length; i++) {
      sum += "0".repeat(i * 8);
      sum = add(sum, summands[i]);
   }

   sum = sum.substring(0, sum.length - fracs) + "." + sum.substring(sum.length - fracs);

   return (sign ? "-" : "") + cleanNumberString(sum);
}

//----------------------------------------------------------------------------------------
function negate(a: Coords): Coords {
   if (a.startsWith("-")) {
      return a.substring(1);
   } else {
      return "-" + a;
   }
}

//----------------------------------------------------------------------------------------
export default {
   add, sub, mul, negate
};
