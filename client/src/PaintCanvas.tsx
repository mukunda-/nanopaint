// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import React, { useEffect, useRef } from 'react';
import { PaintEngine } from './paint/paintengine';
import { PaintController } from './paint/paintcontroller';
import { CanvasRenderBuffer } from './paint/renderbuffer';

//----------------------------------------------------------------------------------------
interface MyRenderBuffer {
   getCanvas: () => HTMLCanvasElement;
}

//----------------------------------------------------------------------------------------
export function PaintCanvas(props: {
   width: number,
   height: number,
}) {
   const engineRef = useRef<PaintEngine | null>(null);
   const captured = useRef(false);
   const canvasRef = useRef<HTMLCanvasElement | null>(null);
   const controllerRef = useRef<PaintController | null>(null);
   
   //-------------------------------------------------------------------------------------
   const renderFrame = () => {
      if (!captured.current) return;
      requestAnimationFrame(renderFrame);

      if (!engineRef.current) throw new Error("no engine");
      if (!canvasRef.current) throw new Error("no canvas");
      
      engineRef.current.render();

      const ctx = canvasRef.current.getContext("2d")!;
      const canvasBuffer = (engineRef.current.getBuffer() as unknown as MyRenderBuffer)
                           .getCanvas();
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      const sourceSize = engineRef.current.getBufferPixelSize();
      const bufferPos = engineRef.current.getBufferScreenPosition();
      ctx.drawImage(canvasBuffer, 0, 0, sourceSize[0], sourceSize[1], bufferPos[0], bufferPos[1], bufferPos[2], bufferPos[3]);
      
   };

   //-------------------------------------------------------------------------------------
   const captureCanvas = () => {
      if (captured.current) throw new Error("canvas already captured");
      if (!canvasRef.current) throw new Error("no canvas");

      captured.current = true;
      engineRef.current = new PaintEngine({
         renderBuffer: new CanvasRenderBuffer(props.width, props.height),
         imageDataFactory: (w, h) => new ImageData(w, h),
      });
      controllerRef.current = new PaintController(engineRef.current, canvasRef.current);
      
      requestAnimationFrame(renderFrame);
   };

   //-------------------------------------------------------------------------------------
   const releaseCanvas = () => {
      captured.current = false;
      controllerRef.current?.release();
   };

   //-------------------------------------------------------------------------------------
   useEffect(() => {
      captureCanvas();
      return releaseCanvas;
   }, []);

   return <canvas
      width={props.width}
      height={props.height}
      className="border-2 border-gray-200"
      ref={canvasRef}
   />;
}