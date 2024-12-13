// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { ApiClient } from "./apiclient";
import { Block, BlockSource, PaintStatus } from "./blockcontroller";

function decodePixels(_data: string, _output: Uint32Array) {
   // todo.
}  

//----------------------------------------------------------------------------------------
// The normal connector that uses the server API to look up block data. Other block
// sources are for testing.
export class ApiBlockSource implements BlockSource {
   api: ApiClient;

   constructor(api: ApiClient) {
      this.api = api;
   }

   async getBlock(address: string): Promise<Block> {
      const resp = await this.api.getBlock(address);

      const block: Block = {
         pixels: new Uint32Array(64*64),
         revision: 1,
      };
      
      if (resp.code == "BLOCK") {
         decodePixels(resp.pixels, block.pixels);
         block.revision = resp.revision;
         return block;
      } else if (resp.code == "NOT_FOUND") {
         // Server does not have anything saved for this address. Return an empty block.
         return block;
      } else {
         throw new Error("block api failed: " + resp.code);
      }
   }
   
   
   async paint(_address: string, _color: number): Promise<PaintStatus> {
      throw new Error("not implemented yet");
   }
}
