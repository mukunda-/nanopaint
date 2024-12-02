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

   // const testFractional = () => {
   //    return Math.floor(Math.random() * 1000000) / Math.pow(8, Math.floor(Math.random() * 8));
   // }

   const testSignedFractional = () => {
      return (Math.random() > 0.5 ? -1 : 1) * Math.floor(Math.random() * 1000000) / Math.pow(8, Math.floor(Math.random() * 8));
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
});
