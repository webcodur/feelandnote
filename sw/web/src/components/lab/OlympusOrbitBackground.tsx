/*
  파일명: /components/lab/OlympusOrbitBackground.tsx
  기능: Canvas 기반 올림푸스 공전 배경 컴포넌트 (Solid 3D Engine)
  책임: Painter's Algorithm을 사용하여 부피감 있는 산과 디테일한 신전을 3D로 렌더링한다.
*/

"use client";

import React, { useEffect, useRef } from "react";

// --- 3D Engine Types ---
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface Face {
  indices: number[]; // Indices into the mesh's vertex array
  color: string;
  shading?: number; // 0 to 1 brightness multiplier
}

interface Mesh {
  vertices: Point3D[];
  faces: Face[];
  position: Point3D; // World position
}

interface Star extends Point3D {
  size: number;
  opacity: number;
  speed?: number;
}

type Cloud = Point3D & { size: number, opacity: number };

export default function OlympusOrbitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Camera Settings & Constants ---
    const FOCAL_LENGTH = 800; // Used in project
    const VIEW_DISTANCE = 1500;



    // --- Interfaces ---
    // (Assuming these are defined or inferred, but to be safe I will use the existing patterns)

    const createStars = (): Star[] => {
        const stars: Star[] = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: (Math.random() - 0.5) * 2000,
                y: (Math.random() - 0.5) * 2000,
                z: (Math.random() - 0.5) * 2000,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random(),
                speed: Math.random() * 0.05
            });
        }
        return stars;
    };

    const createClouds = (): Cloud[] => {
        const clouds: Cloud[] = [];
        for (let i = 0; i < 150; i++) {
            const y = 300 + Math.random() * 600; 
            const radius = 400 + Math.random() * 800; // Wide spread
            const theta = Math.random() * Math.PI * 2;
            
            clouds.push({
                x: Math.cos(theta) * radius,
                y: y,
                z: Math.sin(theta) * radius,
                size: 60 + Math.random() * 100, // Large puffs
                opacity: 0.05 + Math.random() * 0.15 // Subtle mist
            });
        }
        return clouds;
    };

    const createMountainMesh = (): Mesh => {
        const vertices: Point3D[] = [];
        const faces: Face[] = [];
        
        const layers = 15;
        const segments = 20;
        const baseY = 900; 
        const topY = -150; 
        const baseRadius = 900; 
        const topRadius = 40; 

        // 1. Generate Rings (Side)
        for (let i = 0; i <= layers; i++) {
            const progress = i / layers;
            const yBase = baseY + (topY - baseY) * progress; 
            const rProgress = 1 - Math.pow(1 - progress, 2); 
            const currentRadius = baseRadius * (1 - rProgress) + topRadius * rProgress;
            
            for (let j = 0; j < segments; j++) {
                const theta = (j / segments) * Math.PI * 2;
                const noiseRadius = (Math.random() - 0.5) * 30 + Math.sin(j * 0.5 + i) * 20;
                let x = Math.cos(theta) * (currentRadius + noiseRadius);
                let z = Math.sin(theta) * (currentRadius + noiseRadius);
                let y = yBase;

                if (i === layers) {
                    y += (Math.random() - 0.5) * 25;
                    const rimNoise = (Math.random() - 0.5) * 40;
                    x += Math.cos(theta) * rimNoise;
                    z += Math.sin(theta) * rimNoise;
                }
                vertices.push({ x, y, z });
            }
        }

        // 2. Generate Side Faces (Quads)
        for (let i = 0; i < layers; i++) {
            for (let j = 0; j < segments; j++) {
                const current = i * segments + j;
                const next = i * segments + (j + 1) % segments;
                const above = (i + 1) * segments + j;
                const aboveNext = (i + 1) * segments + (j + 1) % segments;

                // Dark/Black Mountain (Deep Grey)
                // Darker at bottom (10) -> Lighter at top (40)
                const v = Math.floor(10 + (i / layers) * 30); 
                const color = `rgb(${v}, ${v}, ${v})`;

                faces.push({
                    indices: [current, next, aboveNext, above],
                    color: color
                });
            }
        }

        // 3. Generate Top Cap (Plateau)
        vertices.push({ x: 0, y: topY, z: 0 }); 
        const centerIndex = vertices.length - 1;
        const topRingStart = layers * segments;

        for (let j = 0; j < segments; j++) {
            const current = topRingStart + j;
            const next = topRingStart + (j + 1) % segments;
            
            faces.push({
                indices: [current, next, centerIndex],
                color: "#0a0a0a" // Almost black
            });
        }
        
        return { vertices, faces, position: { x: 0, y: 0, z: 0 } };
    };

    const createTempleMesh = (): Mesh => {
        const vertices: Point3D[] = [];
        const faces: Face[] = [];
        let vIndex = 0;

        const addBlock = (w: number, h: number, d: number, y: number, color: string) => {
            const hw = w/2, hd = d/2;
            vertices.push(
                { x: -hw, y: y, z: -hd }, { x: hw, y: y, z: -hd },
                { x: hw, y: y, z: hd }, { x: -hw, y: y, z: hd },
                { x: -hw, y: y-h, z: -hd }, { x: hw, y: y-h, z: -hd },
                { x: hw, y: y-h, z: hd }, { x: -hw, y: y-h, z: hd }
            );
            
            const indices = [
                [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
                [4, 5, 6, 7], [3, 2, 1, 0]
            ];
            
            indices.forEach(idx => {
                faces.push({ indices: idx.map(i => i + vIndex), color });
            });
            vIndex += 8;
        };
        
        // Temple scale adjustment: Miniaturized (x0.4 scale)
        
        // Base - Gold
        addBlock(40, 2, 40, 0, "#D97706"); // Dark Gold
        addBlock(36, 2, 36, -2, "#F59E0B"); // Gold
        
        // Columns - Marble White
        const colW = 3, colH = 20, colD = 3;
        const colY = -4; // Start on top of base
        const positions = [
            [-14, -14], [0, -14], [14, -14], // Front
            [-14, 14], [0, 14], [14, 14]     // Back
        ];
        
        positions.forEach(([x, z]) => {
             const hw = colW/2, hd = colD/2;
             vertices.push(
                { x: x-hw, y: colY, z: z-hd }, { x: x+hw, y: colY, z: z-hd },
                { x: x+hw, y: colY, z: z+hd }, { x: x-hw, y: colY, z: z+hd },
                { x: x-hw, y: colY-colH, z: z-hd }, { x: x+hw, y: colY-colH, z: z-hd },
                { x: x+hw, y: colY-colH, z: z+hd }, { x: x-hw, y: colY-colH, z: z+hd }
            );
            const idxs = [
                [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]
            ];
            idxs.forEach(idx => {
                faces.push({ indices: idx.map(i => i + vIndex), color: "#F8FAFC" }); // Marble White
            });
            vIndex += 8;
        });

        // Entablature - Gold
        const entY = colY - colH; // -24
        addBlock(36, 4, 36, entY, "#F59E0B"); // Gold
        
        // Roof (Pediment) - Bright Gold
        const roofW = 36, roofH = 10, roofD = 36;
        const roofY = entY - 4; // -28
        vertices.push(
            { x: -roofW/2, y: roofY, z: -roofD/2 }, { x: roofW/2, y: roofY, z: -roofD/2 }, 
            { x: 0, y: roofY - roofH, z: -roofD/2 }, // Front Peak
            { x: -roofW/2, y: roofY, z: roofD/2 }, { x: roofW/2, y: roofY, z: roofD/2 },
            { x: 0, y: roofY - roofH, z: roofD/2 }   // Back Peak
        );
        const triIdx = [
            [0, 2, 1], [3, 4, 5], 
            [0, 1, 4, 3], // Bottom (hidden mostly)
            [0, 3, 5, 2], // Left Slope
            [1, 2, 5, 4]  // Right Slope
        ];
        triIdx.forEach(idx => {
            faces.push({ indices: idx.map(i => i + vIndex), color: "#FCD34D" }); // Bright Gold
        });
        vIndex += 6;

        return { vertices, faces, position: { x: 0, y: -150, z: 0 } }; // Match mountain topY
    };

    const mountain = useRef(createMountainMesh()).current;
    const temple = useRef(createTempleMesh()).current;
    
    // Create random stars & clouds once
    const stars = useRef(createStars()).current;
    const clouds = useRef(createClouds()).current;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let angle = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const project = (p: Point3D, cx: number, cy: number, rotAngle: number, worldOffset: Point3D): { x: number, y: number, z: number } | null => {
        // 1. Local Transform (Translation only for now)
        let x = p.x + worldOffset.x;
        let y = p.y + worldOffset.y;
        let z = p.z + worldOffset.z;

        // 2. World Rotation (Around Y axis)
        const cos = Math.cos(rotAngle);
        const sin = Math.sin(rotAngle);
        const rx = x * cos - z * sin;
        const rz = x * sin + z * cos;
        
        // 3. Camera Transform
        // Camera is at (0, 0, -VIEW_DISTANCE) look at (0,0,0)
        // So point relative to camera:
        const cz = rz + VIEW_DISTANCE;
        
        if (cz <= 0) return null; // Behind camera

        const scale = FOCAL_LENGTH / cz;
        
        return {
            x: cx + rx * scale,
            y: cy + y * scale,
            z: cz // Depth for sorting
        };
    };

    const draw = () => {
      if (!ctx || !canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      const CX = W / 2;
      const CY = H * 0.6; // Slightly lower center

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#020617");
      bgGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // --- Rendering Pipeline ---
      type RenderItem = 
          | { type: 'face', z: number, path: Point2D[], color: string } 
          | { type: 'star', z: number, x: number, y: number, s: Star }
          | { type: 'cloud', z: number, x: number, y: number, s: Cloud };
          
      const renderList: RenderItem[] = [];

      // 1. Process Meshes
      const meshes = [mountain, temple];
      meshes.forEach(mesh => {
          // Project all vertices first
          const projVerts = mesh.vertices.map(v => project(v, CX, CY, angle, mesh.position));
          
          // Process faces
          mesh.faces.forEach(face => {
              const pPoints = face.indices.map(i => projVerts[i]);
              
              // Culling: Check if all points are valid (in front of camera)
              if (pPoints.some(p => p === null)) return;
              
              const validPoints = pPoints as {x: number, y: number, z: number}[];

              // Backface Culling (Simple normal check for convex shapes? Skipped for noise terrain, imperative for speed)
              // For terrain, we just draw everything back-to-front. 
              
              // Compute Average Z for sorting
              const avgZ = validPoints.reduce((sum, p) => sum + p.z, 0) / validPoints.length;
              
              renderList.push({
                  type: 'face',
                  z: avgZ,
                  path: validPoints.map(p => ({x: p.x, y: p.y})),
                  color: face.color
              });
          });
      });

      // 2. Process Stars
      stars.forEach(s => {
          const p = project(s, CX, CY, angle, {x:0, y:0, z:0});
          if (p) renderList.push({ type: 'star', z: p.z, x: p.x, y: p.y, s: s });
      });

      // 3. Process Clouds
      clouds.forEach(c => {
           const p = project(c, CX, CY, angle, {x:0, y:0, z:0});
           if (p) {
               renderList.push({ type: 'cloud', z: p.z, x: p.x, y: p.y, s: c });
           }
      });

      // 4. Sort by Z (Painter's Algorithm)
      // Farther Z is larger value in our system (rz + VIEW_DISTANCE)
      renderList.sort((a, b) => b.z - a.z);

      // 4. Draw
      renderList.forEach(item => {
          if (item.type === 'face') {
              ctx.beginPath();
              item.path.forEach((p, i) => {
                  if (i === 0) ctx.moveTo(p.x, p.y);
                  else ctx.lineTo(p.x, p.y);
              });
              ctx.closePath();
              
              // Glow effect for Gold/Bright elements (Temple uses hex colors starting with #F or #D)
              if (item.color.startsWith('#F') || item.color.startsWith('#D')) {
                  ctx.shadowBlur = 20;
                  ctx.shadowColor = item.color;
              } else {
                  ctx.shadowBlur = 0;
              }

              ctx.fillStyle = item.color;
              ctx.fill();
              // Stroke for definition
               ctx.strokeStyle = "rgba(0,0,0,0.1)";
               ctx.lineWidth = 0.5;
               ctx.stroke();
          } else if (item.type === 'star') {
              const bgStar = item as any;
              ctx.beginPath();
              // Scale star size by depth
              const scale = 800 / item.z; 
              ctx.arc(bgStar.x, bgStar.y, bgStar.s.size * scale, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${bgStar.s.opacity})`;
              ctx.fill();
          } else if (item.type === 'cloud') {
              const c = item.s;
              const scale = 800 / item.z;
              ctx.beginPath();
              ctx.arc(item.x, item.y, c.size * scale, 0, Math.PI * 2);
              const g = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, c.size * scale);
              g.addColorStop(0, `rgba(255, 255, 255, ${c.opacity})`);
              g.addColorStop(1, "rgba(255, 255, 255, 0)");
              ctx.fillStyle = g;
              ctx.shadowBlur = 0;
              ctx.fill();
          }
      });
      
      // Post-processing Glow
        const bloom = ctx.createRadialGradient(CX, CY - 150, 0, CX, CY - 150, 400);
        bloom.addColorStop(0, "rgba(255, 215, 0, 0.1)");
        bloom.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = bloom;
        ctx.fillRect(0,0,W,H);

      angle += 0.003;
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-[#475569]/50 shadow-2xl bg-[#020617]">
      {/* 텍스트 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none">
        <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#e2e8f0] via-[#cbd5e1] to-[#64748b] opacity-80 tracking-widest drop-shadow-[0_4px_10px_rgba(255,255,255,0.2)]" style={{ marginTop: '-250px' }}>
          OLYMPUS
        </h2>
        <p className="mt-4 text-sm md:text-base text-[#94a3b8] tracking-[0.3em] uppercase opacity-60 drop-shadow-md">
          Sanctuary of the Gods
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
