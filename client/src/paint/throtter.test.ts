// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////

import { Throttler } from "./throttler";

//////////////////////////////////////////////////////////////////////////////////////////
describe("Throttler", () => {

   ///////////////////////////////////////////////////////////////////////////////////////
   test("SingleThrottler request limiting", () => {
      const period = 1357;
      const burst = 6;
      const throttler = new Throttler(period, burst);

      jest.useFakeTimers();

      /////////////////////////////////////////////
      // We allow up to `burst` requests at a time.
      for (let i = 0; i < burst; i++) {
         ////////////////////////////////////////////////////////////////////////////////
         // The `check` function will return the delay until the next request is allowed.
         // Zero is returned when the request is allowed now. When getting a zero
         // response from check, it is treated as a successful request (and it uses up
         // quota).
         expect(throttler.check()).toBe(0);
      }

      ////////////////////////////////////////////////////////////////////
      // Once the quota is exceeded, it regenerates at `period` intervals.
      expect(throttler.check()).toBe(period);

      jest.advanceTimersByTime(100);
      expect(throttler.check()).toBe(period - 100);
      
      jest.advanceTimersByTime(period - 100 + 1);
      expect(throttler.check()).toBe(0);
      expect(throttler.check()).toBe(period - 1);

      /////////////////////////////////////////////////////////////////////////////////
      // We cannot accumulate more than `burst` requests at a time. The backlogged time
      // is capped to that point if we wait too long.
      jest.advanceTimersByTime(period * 20);
      for (let i = 0; i < burst; i++) {
         expect(throttler.check()).toBe(0);
         jest.advanceTimersByTime(50);
      }
      expect(throttler.check()).toBe(period - 50 * burst);

   });

   ///////////////////////////////////////////////////////////////////////////////////////
   afterEach(() => {
      jest.useRealTimers();
   });
});
