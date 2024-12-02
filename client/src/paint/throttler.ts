// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

// Purpose: Provides rate limiting calculations and timing.

//----------------------------------------------------------------------------------------
export class Throttler {
   period: number;
   burst: number;
   nextRequestTime = 0;

   constructor(period: number, burst: number) {
      this.period = period;
      this.burst = burst;
   }

   //-------------------------------------------------------------------------------------
   // This is called when a request is attempted. It will return zero if the request is
   // allowed, or a number of ms that needs to be waited before the request can be made.
   allow(): number {
      const now = Date.now();
      
      const backlogTimeLimit = now - this.period * (this.burst - 1);
      if (this.nextRequestTime < backlogTimeLimit) {
         this.nextRequestTime = backlogTimeLimit;
      }

      if (now < this.nextRequestTime) {
         return this.nextRequestTime - now;
      }

      this.nextRequestTime += this.period;
      return 0;
   }
}