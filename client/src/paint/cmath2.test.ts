// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import {Cmath, Coord} from "./cmath2";

describe("cmath", () => {

   ///////////////////////////////////////////////////////////////////////////////////////
   const testInteger = () => {
      return Math.floor(Math.random() * 1000000);
   };

   const randomInt = (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
   };  

   // const testFractional = () => {
   //    return Math.floor(Math.random() * 1000000) / Math.pow(8, Math.floor(Math.random() * 8));
   // }

   const testSignedFractional = () => {
      const signFactor = Math.random() > 0.5 ? -1 : 1;
      const divisor = Math.pow(8, Math.floor(Math.random() * 8));
      return signFactor * Math.floor(Math.random() * 1000000) / divisor;
   };

   ///////////////////////////////////////////////////////////////////////////////////////
   // parse small coords into a number.
   const parseCoords = (coords: string): number => {
      const sign = coords.startsWith("-");
      coords = sign ? coords.substring(1) : coords;

      let mag = coords.indexOf(".");
      coords = coords.replace(".", "");
      if (mag == -1) {
         mag = 0;
      } else {
         mag = coords.length - mag;
      }

      coords = coords.replace(".", "");

      return (sign ? -1 : 1) * parseInt(coords, 8) / Math.pow(8, mag);
   };

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Addition", () => {
      // When the coordinates are converted to strings, they are base 8 with any
      // trailing or leading zeroes discarded. The raw internal representation may have
      // more zeroes, given that there is the fractional point to consider.
      expect(Cmath.add("2", "2").toString()).toBe("4");
      expect(Cmath.add("2.0", "2").toString()).toBe("4");
      expect(Cmath.add("2.0", "2.0").toString()).toBe("4");
      expect(Cmath.add("2.4", "2.4").toString()).toBe("5");
      expect(Cmath.add(".4", ".4").toString()).toBe("1");
      expect(Cmath.add("2.2", "2").toString()).toBe("4.2");
      expect(Cmath.add("0.7", "0.7").toString()).toBe("1.6");
      
      expect(Cmath.add("20400.33", "0.756532").toString()).toBe("20401.306532");
      expect(Cmath.add("13.57313", "-13.63643").toString()).toBe("-0.0433");

      // integers
      for (let i = 0; i < 1000; i++) {
         const a = testInteger();
         const b = testInteger();
         const op = a.toString(8) + " + " + b.toString(8) + " = ";
         expect(op+Cmath.add(a.toString(8), b.toString(8)).toString()).toBe(op+(a + b).toString(8));
      }

      // negative
      expect(Cmath.add("-2", "2").toString()).toBe("0");
      expect(Cmath.add("-3", "2").toString()).toBe("-1");
      expect(Cmath.add("3", "-4").toString()).toBe("-1");
      expect(Cmath.add("3", "-4.1").toString()).toBe("-1.1");

      // signed numbers
      for (let i = 0; i < 1000; i++) {
         const a = testSignedFractional();
         const b = testSignedFractional();
         const op = a.toString(8) + " + " + b.toString(8) + " = ";
         expect(op+Cmath.add(a.toString(8), b.toString(8)).toString()).toBe(op+(a + b).toString(8));
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Doubling numbers", () => {
      // For this test, the number doubles each iteration. Every 3 iterations, we expect
      // the number of zeroes to change. This is building a huge number (~2^1000)
      let num = new Coord("0.000001");
      let expectedZeroes = -6;
      for (let i = 0; i < 1000; i++) {
         for (let j = 0; j < 3; j++) {
            const numZeroes = (num.toString().match(/0/g) || []).length;
            expect(numZeroes).toBe(Math.abs(expectedZeroes));
            num = num.add(num);
         }
         expectedZeroes++;
      }
   });

   const testSub = (a: number, b: number) => {
      const op = a.toString(8) + " - " + b.toString(8) + " = ";
      expect(op+Cmath.sub(a.toString(8), b.toString(8))).toBe(op+(a - b).toString(8));
   };

   const testSubc = (a: string, b: string) => {
      const op = a + " - " + b + " = ";
      expect(op+Cmath.sub(a, b)).toBe(op+(parseCoords(a) - parseCoords(b)).toString(8));
   };

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Subtraction", () => {
      expect(Cmath.sub("2", "2").toString()).toBe("0");
      expect(Cmath.sub("2.0", "2").toString()).toBe("0");
      expect(Cmath.sub("2.0", "2.0").toString()).toBe("0");
      expect(Cmath.sub("2.4", "2.4000").toString()).toBe("0");
      expect(Cmath.sub("2.4", "2.3000").toString()).toBe("0.1");
      expect(Cmath.sub("2.4", "2.5000").toString()).toBe("-0.1");
      expect(Cmath.sub("-1.151262", "1105.463").toString()).toBe("-1106.634262");

      // integers
      for (let i = 0; i < 1000; i++) {
         const a = testInteger();
         const b = testInteger();
         testSub(a, b);
      }

      for (let i = 0; i < 1000; i++) {
         const a = testSignedFractional();
         const b = testSignedFractional();
         testSub(a, b);
      }

      testSubc("7000.000", "7000.001");
      testSubc("7000.000", "7000.0001");
      testSubc("7000.000", "7000.001");
      testSubc("0000.000", "7000.001");
      testSubc("0", "7000.001");
      testSubc("0", "-7000.001");
      testSubc("0", "-1");
      testSubc("-0", "-1");
      testSubc("-1", "0");
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Ones and sevens", () => {

      // This test relies on a different perspective that doesn't need math to compute the
      // results.
      const randomOnes = (length: number) => {
         const ones: string[] = [];
         for (let j = 0; j < length; j++) {
            if (Math.random() > 0.5) {
               ones.push("1");
            
            } else {
               ones.push("0");
            }
         }
         return ones.join("");
      };

      for (let i = 0; i < 1000; i++) {
         const sevens = "7".repeat(1000);
         const ones = randomOnes(1000);
         const expected = ones.split("").map(v => v == "1" ? "6" : "7").join("");
         expect(Cmath.sub(sevens, ones).toString()).toBe(expected);
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Multiplication", () => {
      expect(Cmath.mul("2.0", "2").toString()).toBe("4");

      // This number won't overflow max precision because we are multiplying by integers.
      let number = "0.123456701234567012345670000011112225413501351574350756456421231111000000000000000";
      for (let i = 0; i < 1000; i++) {
         const doubled = Cmath.add(number, number).toString();
         const doubled2 = Cmath.mul(number, "2").toString();
         expect(doubled2).toBe(doubled);
         number = doubled;
      }

      for (let i = 0; i < 1000; i++) {
         const tripled = Cmath.add(Cmath.add(number, number), number).toString();
         const tripled2 = Cmath.mul(number, "3").toString();
         expect(tripled).toBe(tripled2);
         number = tripled;
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Truncation", () => {
      //
      // After operations, fractional digits that exceed the current precision will be
      // discarded.
      //

      // So here we are accumulating up to N zeroes and
      // then it should truncate back to zero once we exceed the limit.
      // We're going right up against the limit
      // by multiplying by 0.1 (octal) `precision/3` times. (3=octal digits)
      let number = "1";
      for (let i = 0; i < Cmath.getPrecision()/3; i++) {
         number = Cmath.mul(number, "0.1").toString();
         const numZeroes = (number.match(/0/g) || []).length;
         expect(numZeroes).toBe(i + 1);
      }
      number = Cmath.mul(number, "0.1").toString();
      expect(number).toBe("0");
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Truncation clipping", () => {

      // In addition to terminating precision, truncation is also useful for masking
      // out lower order bits.

      ////////////////////////////////////////////////////////////////////////////////////
      // Passing a positive number to `bits` will mask out any fractional bits that exceed
      // the number.
      // Truncating at 3: 3 bits of fraction remain and the rest are masked.

      expect(Cmath.truncate("7.7777", 0).toString()).toBe("7");
      expect(Cmath.truncate("7.7777", 1).toString()).toBe("7.4");
      expect(Cmath.truncate("7.7777", 2).toString()).toBe("7.6");
      expect(Cmath.truncate("7.7777", 3).toString()).toBe("7.7");
      expect(Cmath.truncate("7.7777", 4).toString()).toBe("7.74");
      expect(Cmath.truncate("7.7777", 5).toString()).toBe("7.76");
      expect(Cmath.truncate("7.7777", 6).toString()).toBe("7.77");

      ////////////////////////////////////////////////////////////////////////////////////
      // Passing a negative number to `bits` will discard the fraction part completely
      // and mask the integer part. It indicates how many lower-order bits of the integer
      // should be masked out.
      // the integer should be masked out.
      // Truncating at -3: lower 3 bits of integer are zeroed. Fraction is discarded.

      expect(Cmath.truncate("77.7777", -1).toString()).toBe("76");
      expect(Cmath.truncate("77.7777", -2).toString()).toBe("74");
      expect(Cmath.truncate("77.7777", -3).toString()).toBe("70");
      expect(Cmath.truncate("77.7777", -4).toString()).toBe("60");
      expect(Cmath.truncate("77.7777", -5).toString()).toBe("40");
      expect(Cmath.truncate("77.7777", -6).toString()).toBe("0");

      // Random testing.
      for (let i = 0; i < 1000; i++) {
         // JS bit math is limited to 32 bits.
         // We'll use 16 bits of fraction and 14 bits of integer.
         const testInput = randomInt(0, 1<<30);
         const bits = randomInt(-20, 10);
         let result = testInput;

         if (bits > 0) {
            // Above zero, truncate fractional part.
            const truncate = 16 - bits;
            result >>= truncate;
            result <<= truncate;
         } else {
            result >>= 16;
            result >>= -bits;
            result <<= -bits;
            result <<= 16;
         }

         result /= 0x10000;

         expect(Cmath.truncate((testInput / 0x10000).toString(8), bits).toString()).toBe(result.toString(8));

         // Include a test for the Coord method.
         expect(new Coord((testInput / 0x10000).toString(8)).truncate(bits).toString()).toBe(result.toString(8));
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Comparison", () => {

      expect(Cmath.compare("1", "1")).toBe(0);
      expect(Cmath.compare("1", "2")).toBe(-1);
      expect(Cmath.compare("2", "1")).toBe(1);
      expect(Cmath.compare("1.11111", "1.11111")).toBe(0);
      expect(Cmath.compare("1.11111", "2.11111")).toBe(-1);
      expect(Cmath.compare("2.11111", "1.11111")).toBe(1);

      expect(new Coord("1").lt(new Coord("1"))).toBe(false);
      expect(new Coord("1").lt(new Coord("1.0000000000000001"))).toBe(true);
      expect(new Coord("1").gt(new Coord("1"))).toBe(false);
      expect(new Coord("1").gt(new Coord("0.777777777"))).toBe(true);
      expect(new Coord("1").eq(new Coord("0.777777777"))).toBe(false);
      expect(new Coord("1").eq(new Coord("1"))).toBe(true);
      expect(new Coord("1").eq(new Coord("1.000"))).toBe(true);
      expect(new Coord(BigInt(1), 4).eq(new Coord(BigInt(2), 5))).toBe(true);
      expect(new Coord(BigInt(1), 5).gt(new Coord(BigInt(1), 3))).toBe(false);
      expect(new Coord(BigInt(1), 5).gt(new Coord(BigInt(1), 6))).toBe(true);

      for (let i = 0; i < 1000; i++) {
         // Random values that fit within Javascript number/float range.
         const int1 = randomInt(0, 1000000);
         const frac1 = randomInt(0, 24);
         const int2 = randomInt(0, 1000000);
         const frac2 = randomInt(0, 24);

         const c1 = new Coord(BigInt(int1), frac1);
         const c2 = new Coord(BigInt(int2), frac2);
         
         const real1 = int1 / 2**frac1;
         const real2 = int2 / 2**frac2;

         expect(c1.lt(c2)).toBe(real1 < real2);
         expect(c1.gt(c2)).toBe(real1 > real2);
         expect(c1.eq(c2)).toBe(real1 == real2);
         expect(c1.ge(c2)).toBe(real1 >= real2);
         expect(c1.le(c2)).toBe(real1 <= real2);

         expect(c2.lt(c1)).toBe(real2 < real1);
         expect(c2.gt(c1)).toBe(real2 > real1);
         expect(c2.eq(c1)).toBe(real2 == real1);
         expect(c2.ge(c1)).toBe(real2 >= real1);
         expect(c2.le(c1)).toBe(real2 <= real1);

      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Division", () => {
      // Division is performed by shifting a.value left by b.point, and then performing
      // integer division against b.value. a.point remains the same.
      
      expect(Cmath.div("4", "2").toString()).toBe("2");
      expect(Cmath.div("5", "2.0").toString()).toBe("2");
      expect(Cmath.div("6", "2.00").toString()).toBe("3");
      expect(Cmath.div("7", "2").toString()).toBe("3");
      expect(Cmath.div("10", "2").toString()).toBe("4");
      expect(Cmath.div("10", "0.4").toString()).toBe("20");
      
      try {
         Cmath.div("7", "0");
         fail("Division by zero should throw an exception");
      } catch(e) {
         // Pass
      }

      // Random integer division.
      for (let i = 0; i < 1000; i++) {
         const a = testInteger();
         const b = testInteger();
         if (b == 0) continue;
         const op = a.toString(8) + " \\ " + b.toString(8) + " = ";

         const c1 = new Coord(BigInt(a), 0);
         const c2 = new Coord(BigInt(b), 0);

         expect(op+Cmath.div(a.toString(8), b.toString(8)).toString()).toBe(op+(Math.floor(a / b)).toString(8));
         expect(op+c1.div(c2).toString()).toBe(op+(Math.floor(a / b)).toString(8));
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("Conversion to number", () => {
      // Small coords can be converted to a plain number.
      // Converting larger coords results in undefined behavior.
      expect(new Coord("2").toNumber()).toBe(2);
      expect(new Coord("2.0").toNumber()).toBe(2);
      expect(new Coord("2.4").toNumber()).toBe(0o24/0o10);
      expect(new Coord(".4").toNumber()).toBe(0o4/0o10);
      expect(new Coord("2.2").toNumber()).toBe(0o22/0o10);
      expect(new Coord("0.7").toNumber()).toBe(0o7/0o10);
      expect(new Coord("20400.33").toNumber()).toBe(0o2040033 / 0o100);
      expect(new Coord("13.57313").toNumber()).toBe(0o1357313 / 0o100000);
      expect(new Coord("-13.63643").toNumber()).toBe(-0o1363643/0o100000);

   });
});
