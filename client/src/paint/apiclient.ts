// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { delayMillis } from "./common";

// Purpose: Low-level API client for the Nanopaint server.
// Includes rate limit backoff/retry responsibility.

export type BlockAddress = string;
export type PixelAddress = string;
export type Color = number;

export type ServerResponse = {
   // All responses must contain a code.
   code: string;
   // Message is optional and for the developer.
   message?: string;

   // Additional payload data.
   [key: string]: any;
};

//----------------------------------------------------------------------------------------
// This wrapper handles unexpected errors or invalid responses.
// All valid responses from our server should contain JSON and a code.
async function tfetch(url: string, options: RequestInit): Promise<ServerResponse> {
   try {
      const resp = await fetch(url, options);
      try {
         const json = await resp.json();
         if (json.code) {
            json.status = resp.status;
            return json;
         } else {
            json.code = "INVALID_RESPONSE";
            json.message = "Unexpected response from server.";
            return json;
         }
      } catch (e) {
         return {
            code: "INVALID_RESPONSE",
         };
      }
   } catch (e) {
      return {
         code: "FETCH_FAILED"
      };
   }
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<ServerResponse> {
   let backoff = 100;
   for (let retries = 0; retries < 5; retries++) {
      const resp = await tfetch(url, options);
      if (resp.code == "RATE_LIMITED") {
         await delayMillis(backoff);
         backoff *= 2;
         continue;
      }
      return resp;
   }
   return {
      code: "FETCH_FAILED",
      message: "Retries exceeded.",
   };
}

//----------------------------------------------------------------------------------------
export interface ApiClient {
   getBlock(address: BlockAddress): Promise<ServerResponse>;
   paint(address: PixelAddress, color: Color): Promise<ServerResponse>;
}

//----------------------------------------------------------------------------------------
export class DefaultApiClient implements ApiClient {
   host: string;

   //-------------------------------------------------------------------------------------
   constructor(host: string) {
      this.host = host;
   }

   //-------------------------------------------------------------------------------------
   async getBlock(address: BlockAddress) {
      return await fetchWithRetry(this.host + "/api/block/" + address, {
         method: "GET"
      });
   }

   //-------------------------------------------------------------------------------------
   async paint(address: PixelAddress, color: Color) {
      return await fetchWithRetry(this.host + "/api/paint/" + address, {
         method: "POST",
         body: JSON.stringify({ color }),
      });
   }
}
