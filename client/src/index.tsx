// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import React from 'react';
import { createRoot } from 'react-dom/client';
import GitHubButton from 'react-github-btn';

const Hello = () => {
   return <div className="">
      <header className="w-full flex items-center flex-col">
         <hgroup className="text-center">
            <h1 className="text-7xl font-black leading-[150%] text-gray-800">nanopaint</h1>
            <div className="flex gap-3 justify-center">
               <p className="text-lg font-bold">a tiny canvas with infinite space</p>
               <GitHubButton href="https://github.com/mukunda-/nanopaint" data-color-scheme="no-preference: light; light: light; dark: dark;"  data-size="large" data-show-count="true" aria-label="Star Nanopaint on GitHub">Star</GitHubButton>
            </div>
            
         </hgroup>
      </header>
      <main className="mt-8 max-w-[600px] m-auto">
         <div className="flex justify-center w-full">
            <canvas id="mainView" width="500" height="500" className="border-2"></canvas>
         </div>
         <div className="text-sm">
            <p className="mb-3">
               Imagine a canvas that's only a half-inch wide but with infinite resolution.
            </p>
            <p className="mb-3">
               When someone paints, it will be wet for a short period before drying. Once dry, you can still paint the same square, but only at a deeper resolution, the units of paint getting smaller and smaller.
            </p>
            <p>
               The smallest units are over a hundred orders of magnitude smaller than atoms.
            </p>
         </div>
      </main>
      <div className="h-8"></div>
      <footer className="flex w-full justify-center">
         <p>(C) 2024 Mukunda Johnson, made with ❤️</p>
      </footer>
   </div>;
};

void (async () => {
   console.log("Booting client...");

   const container = document.getElementById('reactor')!;
   const root = createRoot(container);
   root.render(<Hello />);
})();
