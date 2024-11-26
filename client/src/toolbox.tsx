// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import React from 'react';

type ToolboxProps = {
   selected: string;
   onSelect: (tool: string) => void;
};

function ToolboxButton(props: {
   tool: string;
   label: string;
   currentTool: string;
   onClick: (tool: string) => void;
}) {
   let className = "border-2 p-2";
   if (props.currentTool == props.tool) {
      className += " border-blue-500";
   } else {
      className += " border-gray-200";
   }
   return <button className={className} onClick={() => props.onClick(props.tool)}>{props.label}</button>;
}

export function Toolbox(props: ToolboxProps) {
   return <div className="flex justify-center w-full mb-5">
      <ToolboxButton tool="look" label="Look" currentTool={props.selected} onClick={props.onSelect} />
      <ToolboxButton tool="paint" label="Paint" currentTool={props.selected} onClick={props.onSelect} />
      <ToolboxButton tool="pick" label="Pick" currentTool={props.selected} onClick={props.onSelect} />
   </div>;
}
