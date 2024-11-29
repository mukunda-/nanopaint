// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import GitHubButton from 'react-github-btn';
import { Toolbox } from './toolbox';
import { Palette } from './palette';

function Header() {
   return <header className="w-full flex items-center flex-col">
      <hgroup className="text-center">
         <h1 className="text-7xl font-black leading-[150%] text-gray-800">nanopaint</h1>
         <div className="flex gap-3 justify-center">
            <p className="text-lg font-bold">the canvas with infinite space</p>
            <GitHubButton href="https://github.com/mukunda-/nanopaint" data-color-scheme="no-preference: light; light: light; dark: dark;"  data-size="large" data-show-count="true" aria-label="Star Nanopaint on GitHub">Star</GitHubButton>
         </div>
         
      </hgroup>
   </header>;
}

function Main() {
   const [tool, setTool] = useState("look");

   return <main className="mt-8 max-w-[500px] m-auto">
      <div className="flex justify-center w-full mb-5">
         <canvas id="mainView" width="500" height="500" className="border-2 border-gray-200" />
      </div>
      <div className="flex justify-center w-full mb-5">
         <Toolbox selected={tool} onSelect={(tool: string) => {
            setTool(tool);
         }}/>
      </div>
      <div className="flex justify-center w-full mb-5">
         <Palette />
      </div>
      <div className="text-sm">
         <p className="mb-3">
            When someone paints, it will be wet for a short period before drying. Once dry, you can only paint the same area at a deeper resolution, the pixels getting smaller and smaller until you're working with atoms.
         </p>
      </div>
   </main>;
}

function Footer() {
   return <footer className="flex w-full justify-center">
      <p>(C) 2024 Mukunda Johnson, made with ❤️</p>
   </footer>;
}

const Root = () => {
   return <>
      <Header />
      <Main />
      <div className="h-8"></div>
      <Footer />
   </>;
};

void (async () => {
   console.log("Booting client...");

   const container = document.getElementById('reactor')!;
   const root = createRoot(container);
   root.render(<Root />);
})();
