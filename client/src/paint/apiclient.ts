// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: Low-level API client for the Nanopaint server.
// One additional responsibiltiy is handling rate limiting.

type TfetchResponse = {
   code: string;
   message?: string;
};

//----------------------------------------------------------------------------------------
// This wrapper handles unexpected errors or invalid responses.
// All valid responses from our server should contain JSON and a code.
async function tfetch(url: string, options: RequestInit): Promise<TfetchResponse> {
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

async function delayMillis(ms: number) {
   return await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<TfetchResponse> {
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

export class ApiClient {
   host: string;

   constructor(host: string) {
      this.host = host;
   }

   async getBlock(address: string) {
      return await fetchWithRetry(this.host + "/api/block/" + address, {
         method: "GET"
      });
   }

   async putBlock(address: string, data: Uint8Array) {
      return await tfetch("server" + "/api/block/" + address, {
         method: "PUT",
         body: data
      });
   }

   async getBlockList() {
      return await tfetch("server" + "/api/blocklist", {
         method: "GET"
      });
   }
}
