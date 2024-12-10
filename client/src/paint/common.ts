// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

export type UnixMillis = number;

//----------------------------------------------------------------------------------------
export async function delayMillis(ms: number) {
   return await new Promise(resolve => setTimeout(resolve, ms));
}

//----------------------------------------------------------------------------------------
export async function yieldToEvents() {
   return await new Promise(resolve => setTimeout(resolve, 1));
}

