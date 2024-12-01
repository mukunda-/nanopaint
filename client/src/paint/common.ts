// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

//----------------------------------------------------------------------------------------
export async function delayMillis(ms: number) {
   return await new Promise(resolve => setTimeout(resolve, ms));
}
