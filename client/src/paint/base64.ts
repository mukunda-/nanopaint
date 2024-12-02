// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: Converting to base64 is an ugly operation in JS, with cross-environment issues
// (btoa is deprecated in Node.js) We'll use this slower dirty implementation just for
// sanity's sake.

const codes = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function toBase64url(bytes: Uint8Array) {
   const result: string[] = [];
   for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i];
      const b2 = bytes[i + 1] || 0;
      const b3 = bytes[i + 2] || 0;

      const c1 = b1 >> 2;
      const c2 = ((b1 & 3) << 4) | (b2 >> 4);
      const c3 = ((b2 & 15) << 2) | (b3 >> 6);
      const c4 = b3 & 63;
      
      if (i + 1 >= bytes.length) {
         result.push(codes[c1], codes[c2]);
      } else if (i + 2 >= bytes.length) {
         result.push(codes[c1], codes[c2], codes[c3]);
      } else {
         result.push(codes[c1], codes[c2], codes[c3], codes[c4]);
      }
   }
   return result.join("");
}



// export const universalBtoa = str => {
//    try {
//       return window.btoa(str);
//    } catch (err) {
//       return Buffer.from(str).toString('base64url');
//    }
// };

// https://developer.mozilla.org/en-US/docs/Web/API/Window/btoa
// export function bytesToBase64(bytes: Uint8Array): string {
//    const mybtoa = btoa || window?.btoa;
//    if (mybtoa) {
//       const binString = Array.from(bytes, (byte: number) =>
//          String.fromCodePoint(byte),
//       ).join("");
//       return mybtoa(binString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
//    } else {
//       return Buffer.from(bytes).toString("base64url");
//    }
// }