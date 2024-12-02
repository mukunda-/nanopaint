// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: Low-level API client for the Nanopaint server.

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

export class ApiClient {
   host: string;

   constructor(host: string) {
      this.host = host;
   }

   async getBlock(address: string) {
      return await tfetch("server" + "/api/block/" + address, {
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
