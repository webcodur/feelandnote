"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  height?: number;
  compact?: boolean;
}

export default function SacredGeometryBanner({ children, height = 700, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let canvasWidth = 0;
    let canvasHeight = 0;
    const canvasHeightProp = height;
    let animationFrameId: number;
    let time = 0;

    // --------------------------------------------------------
    // Geometry Data Helpers
    // --------------------------------------------------------

    // 3D Point
    type Point3D = { x: number; y: number; z: number };

    // Rotation Matrices
    const rotateX = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
    };

    const rotateY = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: p.x * cos - p.z * sin, y: p.y, z: p.x * sin + p.z * cos };
    };

    const rotateZ = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z };
    };

    // Golden Ratio
    const PHI = (1 + Math.sqrt(5)) / 2;

    // Icosahedron Vertices (12 vertices)
    // (0, ±1, ±PHI)
    // (±1, ±PHI, 0)
    // (±PHI, 0, ±1)
    const getIcosahedronVertices = (scale: number): Point3D[] => {
      const vertices: Point3D[] = [];
      const add = (x: number, y: number, z: number) => vertices.push({ x: x * scale, y: y * scale, z: z * scale });
      
      add(0, 1, PHI); add(0, 1, -PHI); add(0, -1, PHI); add(0, -1, -PHI);
      add(1, PHI, 0); add(1, -PHI, 0); add(-1, PHI, 0); add(-1, -PHI, 0);
      add(PHI, 0, 1); add(PHI, 0, -1); add(-PHI, 0, 1); add(-PHI, 0, -1);
      
      return vertices;
    };

    // Dodecahedron Vertices (20 vertices) - Dual of Icosahedron
    // (±1, ±1, ±1)
    // (0, ±1/PHI, ±PHI)
    // (±1/PHI, ±PHI, 0)
    // (±PHI, 0, ±1/PHI)
    const getDodecahedronVertices = (scale: number): Point3D[] => {
        const vertices: Point3D[] = [];
        const add = (x: number, y: number, z: number) => vertices.push({ x: x * scale, y: y * scale, z: z * scale });

        // Cube part
        add(1,1,1); add(1,1,-1); add(1,-1,1); add(1,-1,-1);
        add(-1,1,1); add(-1,1,-1); add(-1,-1,1); add(-1,-1,-1);

        // Rectangles
        add(0, 1/PHI, PHI); add(0, 1/PHI, -PHI); add(0, -1/PHI, PHI); add(0, -1/PHI, -PHI);
        add(1/PHI, PHI, 0); add(1/PHI, -PHI, 0); add(-1/PHI, PHI, 0); add(-1/PHI, -PHI, 0);
        add(PHI, 0, 1/PHI); add(PHI, 0, -1/PHI); add(-PHI, 0, 1/PHI); add(-PHI, 0, -1/PHI);
        
        return vertices;
    };

    // Connections (Edges) - A naive distance-based connection is often easiest for sacred geometry aesthetics
    // because standard edges can look too "solid". 
    // But let's do distance check tailored to the shape size to only draw real edges.
    
    // --------------------------------------------------------
    // Initialization
    // --------------------------------------------------------

    // Shapes - scale based on compact mode
    const outerScale = compact ? 110 : 180;
    const innerScale = compact ? 65 : 100;
    const shape1 = getIcosahedronVertices(outerScale); // Outer
    const shape2 = getDodecahedronVertices(innerScale); // Inner

    const init = () => {
      canvasWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      canvasHeight = canvas.parentElement?.clientHeight || canvasHeightProp;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    };

    const drawShape = (vertices: Point3D[], rotation: Point3D, color: string, connectionDist: number) => {
        const rotatedVertices = vertices.map(v => {
            let p = rotateX(v, rotation.x);
            p = rotateY(p, rotation.y);
            p = rotateZ(p, rotation.z);
            return p;
        });

        const projected = rotatedVertices.map(v => {
            // Simple Perspective
            const fov = 1000;
            const distance = 500;
            const scale = fov / (fov + distance + v.z);
            return {
                x: v.x * scale + canvasWidth / 2,
                y: v.y * scale + canvasHeight / 2,
                scale: scale,
                z: v.z
            };
        });

        // Draw Edges
        ctx.lineWidth = 1;
        ctx.strokeStyle = color;
        
        // Find connections based on distance (topology reconstruction-ish)
        // For regular solids, edges are all same length.
        // We use a small epsilon.
        for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < projected.length; j++) {
                const p1 = rotatedVertices[i];
                const p2 = rotatedVertices[j];
                const d = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2);
                
                // Magic number specific to shape scale. 
                // Icosahedron edge = 2 (if radius is roughly PHI? No, math is complex).
                // Let's just pass a threshold.
                if (Math.abs(d - connectionDist) < 10) {
                    const start = projected[i];
                    const end = projected[j];
                    
                    // Depth based opacity
                    const avgZ = (start.z + end.z) / 2;
                    const alpha = Math.max(0.1, (1 - (avgZ + 200) / 600)); 

                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();
                }
            }
        }
        
        ctx.globalAlpha = 1;

        // Draw Vertices
        ctx.fillStyle = "#d4af37";
        projected.forEach(p => {
             const size = Math.max(1, 4 * p.scale);
             ctx.beginPath();
             ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
             ctx.fill();
        });
    };

    const animate = () => {
        time += 0.002;

        // Clear
        const gradBG = ctx.createRadialGradient(canvasWidth/2, canvasHeight/2, 0, canvasWidth/2, canvasHeight/2, canvasWidth*0.8);
        gradBG.addColorStop(0, "#1a1a1a");
        gradBG.addColorStop(1, "#050505");
        ctx.fillStyle = gradBG;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Grid (Floor) - Optional, adds depth
        // Let's skip floor for "floating in void" feel

        // Draw Outer Icosahedron
        // Side length of Icosahedron(scale 1) is 2.
        // With scale 140, edge is 280. But Icosahedron coords are (0, 1, PHI).
        // dist((0,1,PHI), (0,-1,PHI)) = 2.
        // dist((0,1,PHI), (1,PHI,0)) = sqrt(1 + (PHI-1)^2 + PHI^2) ... = 2.
        // So edge length is 2 * scale.
        drawShape(shape1, { x: time, y: time * 0.5, z: 0 }, "rgba(212, 175, 55, 0.4)", 2 * outerScale);

        // Draw Inner Dodecahedron
        drawShape(shape2, { x: -time, y: -time * 0.5, z: time * 0.2 }, "rgba(255, 255, 255, 0.3)", (2/PHI) * innerScale);

        // Connecting Lines between Outer and Inner?
        // Maybe just let them spin independently.
        
        // Center Glow
        const glowSize = compact ? 80 : 150;
        const glow = ctx.createRadialGradient(canvasWidth/2, canvasHeight/2, 10, canvasWidth/2, canvasHeight/2, glowSize);
        glow.addColorStop(0, "rgba(212, 175, 55, 0.2)");
        glow.addColorStop(1, "rgba(212, 175, 55, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        animationFrameId = requestAnimationFrame(animate);
    };

    init();
    window.addEventListener("resize", init);
    animate();

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, [height, compact]);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#050505] ${compact ? "h-[250px] sm:h-[300px] md:h-[350px]" : ""}`}
      style={compact ? undefined : { height }}
    >
      <canvas ref={canvasRef} className="block" />

      {/* Overlay Content */}
      {children && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
