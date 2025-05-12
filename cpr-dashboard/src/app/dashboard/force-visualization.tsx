// src/app/dashboard/force-visualization.tsx
"use client";

import { useEffect, useRef } from 'react';

interface ForceVisualizationProps {
  sensorData: {
    distance1: number;
    distance2: number;
    distance3: number;
    distance4: number;
    force: number;
  } | null;
}

export default function ForceVisualization({ sensorData }: ForceVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use maximum possible value for normalizing color intensity
  const maxPossibleSensorValue = 100; // Adjust this based on your sensor's range
  
  useEffect(() => {
    if (!canvasRef.current || !sensorData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw the base square
    ctx.fillStyle = '#f3f4f6'; // Light gray background
    ctx.fillRect(0, 0, width, height);
    
    // Extract sensor values
    const { distance1, distance2, distance3, distance4 } = sensorData;
    
    // Convert distance values to pressure (inverse relationship - closer means more pressure)
    // We'll normalize distances where lower values mean higher pressure
    const maxDistance = 50; // Adjust based on your sensor's range
    const pressure1 = Math.max(0, 1 - (distance1 / maxDistance));
    const pressure2 = Math.max(0, 1 - (distance2 / maxDistance));
    const pressure3 = Math.max(0, 1 - (distance3 / maxDistance));
    const pressure4 = Math.max(0, 1 - (distance4 / maxDistance));
    
    // Draw gradient background representing pressure distribution
    const gradient = createPressureGradient(ctx, width, height, pressure1, pressure2, pressure3, pressure4);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Mark the corners with sensor positions
    drawSensorMarker(ctx, 0, 0, pressure1, "1");                   // Top-left
    drawSensorMarker(ctx, width, 0, pressure2, "2");               // Top-right
    drawSensorMarker(ctx, 0, height, pressure3, "3");              // Bottom-left
    drawSensorMarker(ctx, width, height, pressure4, "4");          // Bottom-right
    
    // Indicate pressure center with a circle
    if (pressure1 > 0.1 || pressure2 > 0.1 || pressure3 > 0.1 || pressure4 > 0.1) {
      // Calculate pressure center (weighted average)
      const totalPressure = pressure1 + pressure2 + pressure3 + pressure4;
      if (totalPressure > 0) {
        const centerX = (pressure1 * 0 + pressure2 * width + pressure3 * 0 + pressure4 * width) / totalPressure;
        const centerY = (pressure1 * 0 + pressure2 * 0 + pressure3 * height + pressure4 * height) / totalPressure;
        
        // Draw pressure center
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
  }, [sensorData]);
  
  function createPressureGradient(
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    p1: number, 
    p2: number, 
    p3: number, 
    p4: number
  ) {
    // Create a radial gradient for each corner
    const gradients = [
      { x: 0, y: 0, r: width/2, pressure: p1 },         // Top-left
      { x: width, y: 0, r: width/2, pressure: p2 },     // Top-right
      { x: 0, y: height, r: width/2, pressure: p3 },    // Bottom-left
      { x: width, y: height, r: width/2, pressure: p4 } // Bottom-right
    ];
    
    // Create an off-screen canvas for compositing
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');
    
    if (!offCtx) return ctx.createLinearGradient(0, 0, 0, 0); // Fallback
    
    // Draw each gradient
    for (const { x, y, r, pressure } of gradients) {
      if (pressure < 0.05) continue; // Skip very low pressures
      
      const gradient = offCtx.createRadialGradient(x, y, 0, x, y, r);
      
      // Color intensity based on pressure (red to blue spectrum for heat map)
      // More pressure = more red
      const intensity = Math.min(1, pressure * 1.5); // Amplify for visibility
      gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity})`);
      gradient.addColorStop(0.7, `rgba(255, 0, 0, 0)`);
      
      offCtx.fillStyle = gradient;
      offCtx.globalCompositeOperation = 'source-over';
      offCtx.fillRect(0, 0, width, height);
    }
    
    // Create a pattern from the off-screen canvas
    const pattern = ctx.createPattern(offCanvas, 'no-repeat');
    return pattern || ctx.createLinearGradient(0, 0, 0, 0); // Fallback if pattern fails
  }
  
  function drawSensorMarker(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    pressure: number, 
    label: string
  ) {
    const radius = 20;
    ctx.beginPath();
    
    // Draw circle at corner
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    // Fill with color based on pressure
    const intensity = Math.min(255, Math.floor(pressure * 255));
    ctx.fillStyle = `rgb(${intensity}, ${255 - intensity}, 0)`;
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
    
    // Add pressure value
    const pressureValue = Math.round(pressure * 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.fillText(`${pressureValue}%`, x, y + 15);
  }
  
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-medium mb-2">Pressure Distribution</h3>
      <div className="relative border border-gray-300 rounded-lg overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={300} 
          className="bg-gray-100"
        />
        {!sensorData && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
            <p className="text-gray-500">No sensor data available</p>
          </div>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-500">
        <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span> High Pressure
        <span className="inline-block ml-4 w-3 h-3 rounded-full bg-yellow-500 mr-1"></span> Medium Pressure
        <span className="inline-block ml-4 w-3 h-3 rounded-full bg-green-500 mr-1"></span> Low Pressure
      </div>
    </div>
  );
}