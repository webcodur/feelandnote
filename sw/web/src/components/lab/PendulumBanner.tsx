"use client";

import { useEffect, useRef } from "react";
import { Activity } from "lucide-react";

export default function PendulumBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    
    // Config
    const BALL_RADIUS = 30;
    const BALL_COUNT = 5;
    const ROPE_LENGTH = 300;
    const ORIGIN_Y = 150;
    const GRAVITY = 0.2; // Slower physics
    const DAMPING = 0.995; // Air resistance
    
    // Physics Bodies
    // We model them as simple pendulums constrained to X-axis movement mostly
    // But collision is the key.
    // For simplicity and stability, we simulate angular velocity.
    
    class Ball {
       index: number;
       angle: number; // 0 is down, -PI/2 left
       vAngular: number;
       x: number = 0;
       y: number = 0;
       mass: number = 10;
       
       constructor(index: number) {
          this.index = index;
          this.angle = 0;
          this.vAngular = 0;
          this.updatePos();
       }

       updatePos() {
          // Calculate pivot X based on index to keep them touching
          // Pivot spacing should be equal to diameter
          const spacing = BALL_RADIUS * 2;
          const totalWidth = (BALL_COUNT - 1) * spacing;
          const startX = width / 2 - totalWidth / 2;
          
          const pivotX = startX + this.index * spacing;
          const pivotY = ORIGIN_Y;
          
          this.x = pivotX + Math.sin(this.angle) * ROPE_LENGTH;
          this.y = pivotY + Math.cos(this.angle) * ROPE_LENGTH;
       }

       update() {
          // Gravity force
          const force = -GRAVITY * Math.sin(this.angle);
          this.vAngular += force / ROPE_LENGTH;
          this.vAngular *= DAMPING; // air resistance
          
          this.angle += this.vAngular;
          this.updatePos();
       }
    }

    let balls: Ball[] = [];
    let draggedBall: Ball | null = null;

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;

      balls = [];
      for (let i = 0; i < BALL_COUNT; i++) {
         balls.push(new Ball(i));
      }
      
      // Start with first ball pulled back
      balls[0].angle = -Math.PI / 4;
    };
    
    const resolveCollisions = () => {
       // Simple sweep for collisions between neighbors
       for (let i = 0; i < balls.length - 1; i++) {
          const b1 = balls[i];
          const b2 = balls[i+1];
          
          // Distance check
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < BALL_RADIUS * 2 - 0.5) { // Tolerance
             // Collision detected
             
             // Exchange velocities (Elastic collision of equal masses)
             // In angular terms
             const tempV = b1.vAngular;
             b1.vAngular = b2.vAngular;
             b2.vAngular = tempV;
             
             // Separate them to prevent sticking
             const overlap = (BALL_RADIUS * 2) - dist;
             // Push apart based on angle
             // Approximation: Just nudge angles slightly?
             // Better: Reset positions to touching.
             // Since they are on constrained paths, this is tricky.
             // Simple fix: If they are moving towards each other, exchange.
             // If moving apart, let them be.
             
             // Sound or flash effect could trigger here
             
             // Crude reposition to avoid overlap getting worse
             const angleDiff = overlap / ROPE_LENGTH;
             b1.angle -= angleDiff/2;
             b2.angle += angleDiff/2;
          }
       }
    };

    const handleMouseDown = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       const mx = e.clientX - rect.left;
       const my = e.clientY - rect.top;
       
       // Find clicked ball
       for (let b of balls) {
          const dx = b.x - mx;
          const dy = b.y - my;
          if (dx*dx + dy*dy < BALL_RADIUS*BALL_RADIUS) {
             // Only allow dragging first and last ball
             if (b.index === 0 || b.index === balls.length - 1) {
                draggedBall = b;
                b.vAngular = 0;
             }
             break;
          }
       }
    };
    
    const handleMouseUp = () => {
       draggedBall = null;
    };
    
    const handleMouseMove = (e: MouseEvent) => {
       if (draggedBall) {
          const rect = canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          
          // Calculate angle from pivot
          const spacing = BALL_RADIUS * 2;
          const totalWidth = (BALL_COUNT - 1) * spacing;
          const startX = width / 2 - totalWidth / 2;
          const pivotX = startX + draggedBall.index * spacing;
          
          const dx = mx - pivotX;
          const dy = my - ORIGIN_Y;
          
          let newAngle = Math.atan2(dx, dy);
          
          // Constrain angle based on index
          if (draggedBall.index === 0) {
             // Left ball: can only be pulled left (negative angle)
             if (newAngle > 0) newAngle = 0;
          } else if (draggedBall.index === balls.length - 1) {
             // Right ball: can only be pulled right (positive angle)
             if (newAngle < 0) newAngle = 0;
          }

          draggedBall.angle = newAngle;
          draggedBall.vAngular = 0;
          draggedBall.updatePos();
       }
    };

    const animate = () => {
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, width, height);

      // Floor reflection
      ctx.fillStyle = "#111";
      ctx.fillRect(0, height * 0.8, width, height * 0.2);

      // Physics
      // Sub-steps for better collision
      for(let i=0; i<4; i++) {
         if (!draggedBall) {
            balls.forEach(b => b.update());
            resolveCollisions();
         }
      }

      // Draw Support Structure
      const barY = ORIGIN_Y;
      const barLeft = balls[0].x - BALL_RADIUS; // Approx pivot
      const barRight = balls[BALL_COUNT-1].x + BALL_RADIUS;
      // Actual pivots
      const spacing = BALL_RADIUS * 2;
      const totalWidth = (BALL_COUNT - 1) * spacing;
      const startX = width / 2 - totalWidth / 2;
      
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX - 50, barY);
      ctx.lineTo(startX + totalWidth + 50, barY);
      ctx.stroke();

      balls.forEach(b => {
         // String
         const pivotX = startX + b.index * spacing;
         
         ctx.beginPath();
         ctx.moveTo(pivotX, barY);
         ctx.lineTo(b.x, b.y);
         ctx.strokeStyle = "rgba(255,255,255,0.2)";
         ctx.lineWidth = 1;
         ctx.stroke();
         
         // Ball
         ctx.beginPath();
         ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI*2);
         // Gold Gradient
         const grad = ctx.createRadialGradient(b.x - 10, b.y - 10, 5, b.x, b.y, BALL_RADIUS);
         grad.addColorStop(0, "#fff"); // Highlight
         grad.addColorStop(0.3, "#d4af37"); // Gold
         grad.addColorStop(1, "#332200"); // Dark Gold
         ctx.fillStyle = grad;
         ctx.fill();
         
         // Reflection
         // Check velocity for glow?
         if (Math.abs(b.vAngular) > 0.01) {
             ctx.shadowBlur = 10;
             ctx.shadowColor = "#d4af37";
         } else {
             ctx.shadowBlur = 0;
         }
      });
      ctx.shadowBlur = 0; // Reset

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    window.addEventListener("resize", init);
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    animate();

    return () => {
      window.removeEventListener("resize", init);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[700px] overflow-hidden bg-[#0c0c0c] cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center translate-y-[-150px]">
         <h2 className="text-5xl md:text-7xl font-serif font-black text-[#d4af37]/20 tracking-tighter blur-[1px]">
            MOMENTUM
         </h2>
      </div>
      
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
         <div className="mt-[300px] flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight mix-blend-overlay">
               CONSERVATION
            </h2>
            <p className="text-[#a0a0a0] tracking-[0.5em] text-xs mt-4 uppercase font-cinzel">
               Action and Reaction
            </p>
         </div>
      </div>
       {/* Instruction */}
       <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/10 text-[10px] font-mono pointer-events-none">
          DRAG SPHERES TO INTERACT
       </div>
    </div>
  );
}
