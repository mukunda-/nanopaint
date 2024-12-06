// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: Converting to base64 is an ugly operation in JS, with cross-environment issues
// (btoa is deprecated in Node.js) We'll use this slower/dirty implementation just for
// sanity's sake.

const codes = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const rcodes: Record<string, number> = {"=": 0};
for (let i = 0; i < codes.length; i++) {
   rcodes[codes[i]] = i;
}

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

//----------------------------------------------------------------------------------------
export function fromBase64url(url: string): Uint8Array {
   if (url.length % 4 != 0) {
      url += "=".repeat(4 - (url.length % 4));
   }
   const result: number[] = [];
   for (let i = 0; i < url.length; i += 4) {
      
      const c1 = rcodes[url[i]];
      const c2 = rcodes[url[i + 1]];
      const c3 = rcodes[url[i + 2]];
      const c4 = rcodes[url[i + 3]];

      const b1 = (c1 << 2) | (c2 >> 4);
      const b2 = (c2 << 4) | (c3 >> 2);
      const b3 = (c3 << 6) | c4;

      result.push(b1);
      if (url[i + 2] != "=") result.push(b2);
      if (url[i + 3] != "=") result.push(b3);
   }
   return new Uint8Array(result);
}