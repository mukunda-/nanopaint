// High resolution coordinates.

// Numbers are kept in base 8 decimal format.

export type Coords = string;

//----------------------------------------------------------------------------------------
// Returns sign, value, and magnitude of two numbers.
// The numbers are padded to 8 digits and aligned to the same length.
// e.g. 2.4 and 33.11 will return 02400000 and 33110000 with magnitude 2.
function parseBinaryOperation(a: Coords, b: Coords): [boolean, boolean, string, string, number] {
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
function performMul(value1: string, value2: string, mag: number): string {
   const resultParts: string[] = [];
   let carry = 0;
   for (let i = value1.length - 8; i >= 0; i -= 8) {
      const a = parseInt(value1.substring(i, i + 8), 8);
      const b = parseInt(value2.substring(i, i + 8), 8);
      const c = a * b + carry;
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
function add(a: Coords, b: Coords): Coords {
   const [sign1, sign2, value1, value2, mag] = parseBinaryOperation(a, b);
   
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
   const [sign1, sign2, value1, value2, mag] = parseBinaryOperation(a, b);

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
   const [sign1, sign2, value1, value2, mag] = parseBinaryOperation(a, b);
   const sign = sign1 != sign2;
   const result = performMul(value1, value2, mag);
   return (sign ? "-" : "") + cleanNumberString(result);
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

//----------------------------------------------------------------------------------------
// export class Coords {
//    public value = "";

//    //-------------------------------------------------------------------------------------
//    constructor(value: string) {
//       this.value = value;
//    }

//    //-------------------------------------------------------------------------------------
//    negate(): Coords {
//       if (this.value[0] == "-") {
//          return new Coords(this.value.substring(1));
//       } else {
//          return new Coords("-" + this.value);
//       }
//    }

//    parts(): [boolean, string, number] {
//       const sign = this.value[0] == "-";
//       let value = sign ? this.value.substring(1) : this.value;
//       let exp = value.indexOf(".");
//       if (exp == -1) {
//          exp = value.length;
//       }
//       value = value.replace(".", "");
//       return [sign, value, exp];
//    }

//    //-------------------------------------------------------------------------------------
//    add(addend: Coords): Coords {
//       let [sign1, value1, exp1] = this.parts();
//       let [sign2, value2, exp2] = addend.parts();
//       let result = "";
//       let carry = 0;
//       for (let i = 0; i < this.value.length; i++) {
//          let a = parseInt(this.value[i], 8);
//          let b = parseInt(other.value[i], 8);
//          let c = a + b + carry;
//          if (c >= 8) {
//             c -= 8;
//             carry = 1;
//          } else {
//             carry = 0;
//          }
//          result += c.toString(8);
//       }
//       return new Coords(result);
//    }
// }
