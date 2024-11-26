// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import cmath from "./cmath";

describe("cmath", () => {
   return; // disabled.
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
   test("addition", () => {
      
      expect(cmath.add("2", "2")).toBe("4");
      expect(cmath.add("2.0", "2")).toBe("4");
      expect(cmath.add("2.0", "2.0")).toBe("4");
      expect(cmath.add("2.4", "2.4")).toBe("5");
      expect(cmath.add(".4", ".4")).toBe("1");
      expect(cmath.add("2.2", "2")).toBe("4.2");
      expect(cmath.add("20400.33", "0.756532")).toBe("20401.306532");

      // integers
      for (let i = 0; i < 1000; i++) {
         const a = testInteger();
         const b = testInteger();
         const op = a.toString(8) + " + " + b.toString(8) + " = ";
         expect(op+cmath.add(a.toString(8), b.toString(8))).toBe(op+(a + b).toString(8));
      }

      // negative
      expect(cmath.add("-2", "2")).toBe("0");
      expect(cmath.add("-3", "2")).toBe("-1");
      expect(cmath.add("3", "-4")).toBe("-1");
      expect(cmath.add("3", "-4.1")).toBe("-1.1");

      // signed numbers
      for (let i = 0; i < 1000; i++) {
         const a = testSignedFractional();
         const b = testSignedFractional();
         const op = a.toString(8) + " + " + b.toString(8) + " = ";
         expect(op+cmath.add(a.toString(8), b.toString(8))).toBe(op+(a + b).toString(8));
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("doubling numbers", () => {
      // For this test, the number doubles each iteration. Every 3 iterations, we expect
      // the number of zeroes to change. This is building a huge number (~2^1000)
      let num = "0.000001";
      let expectedZeroes = -6;
      for (let i = 0; i < 1000; i++) {
         for (let j = 0; j < 3; j++) {
            const numZeroes = (num.match(/0/g) || []).length;
            expect(numZeroes).toBe(Math.abs(expectedZeroes));
            num = cmath.add(num, num);
         }
         expectedZeroes++;
      }
   });

   const testSub = (a: number, b: number) => {
      const op = a.toString(8) + " - " + b.toString(8) + " = ";
      expect(op+cmath.sub(a.toString(8), b.toString(8))).toBe(op+(a - b).toString(8));
   };

   const testSubc = (a: string, b: string) => {
      const op = a + " - " + b + " = ";
      expect(op+cmath.sub(a, b)).toBe(op+(parseCoords(a) - parseCoords(b)).toString(8));
   };

   ///////////////////////////////////////////////////////////////////////////////////////
   test("subtraction", () => {
      expect(cmath.sub("2", "2")).toBe("0");
      expect(cmath.sub("2.0", "2")).toBe("0");
      expect(cmath.sub("2.0", "2.0")).toBe("0");
      expect(cmath.sub("2.4", "2.4000")).toBe("0");
      expect(cmath.sub("2.4", "2.3000")).toBe("0.1");
      expect(cmath.sub("2.4", "2.5000")).toBe("-0.1");
      expect(cmath.sub("-1.151262", "1105.463")).toBe("-1106.634262");

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
   test("ones and sevens", () => {

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
         expect(cmath.sub(sevens, ones)).toBe(expected);
      }
   });

   ///////////////////////////////////////////////////////////////////////////////////////
   test("multiplication 1", () => {
      expect(cmath.mul("2", "2")).toBe("4");

      // let number = "0.123456701234567012345670000011112225413501351574350756456421231111000000000000000";
      // for (let i = 0; i < 1000; i++) {
      //    const doubled = cmath.add(number, number);
      //    const doubled2 = cmath.mul(number, "2");
      //    expect(doubled2).toBe(doubled);
      //    number = doubled;
      // }

      // for (let i = 0; i < 1000; i++) {
      //    const tripled = cmath.add(cmath.add(number, number), number);
      //    const tripled2 = cmath.mul(number, "3");
      //    expect(tripled).toBe(tripled2);
      //    number = tripled;
      // }
   });
});
