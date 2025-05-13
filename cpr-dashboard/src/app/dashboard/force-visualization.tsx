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
    
    // Use distance directly for visualization
    const d1 = distance1;
    const d2 = distance2;
    const d3 = distance3;
    const d4 = distance4;
    
    // Draw gradient background representing Distance distribution
    const gradient = createDistanceGradient(ctx, width, height, d1, d2, d3, d4);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Mark the corners with sensor positions
    drawSensorMarker(ctx, 0, 0, d1, "1");                   // Top-left
    drawSensorMarker(ctx, width, 0, d2, "2");               // Top-right
    drawSensorMarker(ctx, 0, height, d3, "3");              // Bottom-left
    drawSensorMarker(ctx, width, height, d4, "4");          // Bottom-right
    
    // Indicate Distance center with a circle
    if (d1 > 0.1 || d2 > 0.1 || d3 > 0.1 || d4 > 0.1) {
      // Calculate Distance center (weighted average)
      const totalDistance = d1 + d2 + d3 + d4;
      if (totalDistance > 0) {
        const centerX = (d1 * 0 + d2 * width + d3 * 0 + d4 * width) / totalDistance;
        const centerY = (d1 * 0 + d2 * 0 + d3 * height + d4 * height) / totalDistance;
        
        // Draw Distance center
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
  
  function createDistanceGradient(
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
      { x: 0, y: 0, r: width/2, Distance: p1 },         // Top-left
      { x: width, y: 0, r: width/2, Distance: p2 },     // Top-right
      { x: 0, y: height, r: width/2, Distance: p3 },    // Bottom-left
      { x: width, y: height, r: width/2, Distance: p4 } // Bottom-right
    ];
    
    // Create an off-screen canvas for compositing
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');
    
    if (!offCtx) return ctx.createLinearGradient(0, 0, 0, 0); // Fallback
    
    // Draw each gradient
    for (const { x, y, r, Distance } of gradients) {
      if (Distance < 0.05) continue; // Skip very low Distances
      
      const gradient = offCtx.createRadialGradient(x, y, 0, x, y, r);
      
      // Color intensity based on Distance (red to blue spectrum for heat map)
      // More Distance = more red
      const intensity = Math.min(1, Distance * 1.5); // Amplify for visibility
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
    Distance: number, 
    label: string
  ) {
    const radius = 20;
    ctx.beginPath();
    
    // Draw circle at corner
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    // Fill with color based on Distance
    const intensity = Math.min(255, Math.floor(Distance * 255));
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
    
    // Add Distance value
    const DistanceValue = Math.round(Distance * 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.fillText(`${DistanceValue}%`, x, y + 15);
  }
  
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-medium mb-2">Distance Distribution</h3>
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
        <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span> Distance Too Low/High
        {/* <span className="inline-block ml-4 w-3 h-3 rounded-full bg-yellow-500 mr-1"></span> Medium Distance */}
        <span className="inline-block ml-4 w-3 h-3 rounded-full bg-green-500 mr-1"></span> Proper Distance
      </div>
    </div>
  );
}