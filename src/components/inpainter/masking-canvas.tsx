
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Eraser, CheckSquare } from 'lucide-react';

interface MaskingCanvasProps {
  originalImageSrc: string;
  onMaskReady: (maskDataUrl: string) => void;
}

export function MaskingCanvas({ originalImageSrc, onMaskReady }: MaskingCanvasProps) {
  const imageCanvasRef = useRef<HTMLCanvasElement>(null); // For displaying original image
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null); // For drawing mask
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 512, height: 512 }); // Default/fallback

  const getCanvasAndContext = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    return { canvas, ctx };
  };

  // Load and draw original image
  useEffect(() => {
    const { canvas: imgCanvas, ctx: imgCtx } = getCanvasAndContext(imageCanvasRef);
    const { canvas: drawCanvas } = getCanvasAndContext(drawingCanvasRef);
    const img = new window.Image();
    img.crossOrigin = "anonymous"; // Important for toDataURL if image is from other origin (not relevant for data URL)
    img.src = originalImageSrc;
    img.onload = () => {
      // Determine canvas size based on image, but cap it for performance/consistency
      const MAX_DIM = 768; // Max dimension for canvas
      let newWidth = img.width;
      let newHeight = img.height;

      if (newWidth > MAX_DIM || newHeight > MAX_DIM) {
        if (newWidth > newHeight) {
          newHeight = (newHeight / newWidth) * MAX_DIM;
          newWidth = MAX_DIM;
        } else {
          newWidth = (newWidth / newHeight) * MAX_DIM;
          newHeight = MAX_DIM;
        }
      }
      setImageDimensions({ width: newWidth, height: newHeight });

      if (imgCanvas && imgCtx && drawCanvas) {
        imgCanvas.width = newWidth;
        imgCanvas.height = newHeight;
        drawCanvas.width = newWidth;
        drawCanvas.height = newHeight;

        imgCtx.drawImage(img, 0, 0, newWidth, newHeight);
        clearMask(); // Initialize mask canvas
      }
    };
     img.onerror = () => {
      console.error("Failed to load image onto canvas.");
    };
  }, [originalImageSrc]);

  const clearMask = useCallback(() => {
    const { canvas, ctx } = getCanvasAndContext(drawingCanvasRef);
    if (canvas && ctx) {
      // Fill with black (transparent for drawing, but will be inverted for mask)
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);


  const getMousePos = (canvas: HTMLCanvasElement, evt: MouseEvent | TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in evt ? evt.touches[0].clientX : evt.clientX;
    const clientY = 'touches' in evt ? evt.touches[0].clientY : evt.clientY;
    return {
      x: (clientX - rect.left) / (rect.right - rect.left) * canvas.width,
      y: (clientY - rect.top) / (rect.bottom - rect.top) * canvas.height,
    };
  };

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { canvas } = getCanvasAndContext(drawingCanvasRef);
    if (!canvas) return;
    const pos = getMousePos(canvas, e.nativeEvent);
    setLastPos(pos);
    setIsDrawing(true);
    draw(pos.x, pos.y); // For dots on click/tap
  }, []);

  const draw = useCallback((x: number, y: number) => {
    const { ctx } = getCanvasAndContext(drawingCanvasRef);
    if (!ctx || !lastPos) return;

    ctx.beginPath();
    ctx.strokeStyle = 'white'; // Draw mask in white
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setLastPos({ x, y });
  }, [lastPos, brushSize]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPos(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { canvas } = getCanvasAndContext(drawingCanvasRef);
    if (!canvas) return;
    const pos = getMousePos(canvas, e.nativeEvent);
    draw(pos.x, pos.y);
  }, [isDrawing, draw]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { canvas } = getCanvasAndContext(drawingCanvasRef);
    if (!canvas) return;
    const pos = getMousePos(canvas, e.nativeEvent);
    draw(pos.x, pos.y);
  }, [isDrawing, draw]);


  const generateMask = () => {
    const { canvas: drawingCanvas, ctx: drawingCtx } = getCanvasAndContext(drawingCanvasRef);
    if (!drawingCanvas || !drawingCtx) return;

    // The drawing canvas already has black background and white strokes.
    // This is typically what Stable Diffusion inpainting models expect for a mask
    // (white where to inpaint, black where to keep original).
    const maskDataUrl = drawingCanvas.toDataURL('image/png');
    onMaskReady(maskDataUrl);
  };


  return (
    <div className="space-y-4 flex flex-col items-center">
      <p className="text-sm text-muted-foreground text-center">
        Dessinez sur l'image ci-dessous pour marquer les zones que vous souhaitez modifier.
        La zone peinte en blanc sera celle que l'IA tentera de remplir.
      </p>
      <div className="relative w-full max-w-[${imageDimensions.width}px] aspect-square mx-auto cursor-crosshair border rounded-md shadow-sm overflow-hidden">
        <canvas
          ref={imageCanvasRef}
          className="absolute top-0 left-0 w-full h-full object-contain"
          style={{ imageRendering: 'pixelated' }} // Better for pixel art masks if scaled
        />
        <canvas
          ref={drawingCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing} // Stop drawing if mouse leaves canvas
          onTouchStart={startDrawing}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDrawing}
          className="absolute top-0 left-0 w-full h-full object-contain touch-none" // touch-none to prevent page scroll while drawing
           style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <div className="w-full max-w-md space-y-3 p-4 bg-muted/50 rounded-lg">
        <div className="grid gap-2">
          <Label htmlFor="brush-size" className="text-sm font-medium">
            Taille du Pinceau : <span className="text-primary font-semibold">{brushSize}px</span>
          </Label>
          <Slider
            id="brush-size"
            min={5}
            max={100}
            step={1}
            value={[brushSize]}
            onValueChange={(value) => setBrushSize(value[0])}
          />
        </div>
        <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={clearMask} className="w-full">
                <Eraser className="mr-2 h-4 w-4" /> Effacer le Masque
            </Button>
            <Button onClick={generateMask} className="w-full">
                <CheckSquare className="mr-2 h-4 w-4" /> Confirmer le Masque
            </Button>
        </div>
      </div>
    </div>
  );
}
