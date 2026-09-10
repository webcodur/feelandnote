"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

const PENDULUM_BALL_RADIUS = 30;
const PENDULUM_BALL_COUNT = 5;
const PENDULUM_ROPE_LENGTH = 300;
const PENDULUM_ORIGIN_Y = 150;
const PENDULUM_GRAVITY = 0.08;
const PENDULUM_DAMPING = 0.9992;

class PendulumBall {
  index: number;
  angle: number;
  vAngular: number;
  x = 0;
  y = 0;
  mass = 10;

  constructor(index: number, width: number) {
    this.index = index;
    this.angle = 0;
    this.vAngular = 0;
    this.updatePos(width);
  }

  updatePos(width: number) {
    const spacing = PENDULUM_BALL_RADIUS * 2;
    const totalWidth = (PENDULUM_BALL_COUNT - 1) * spacing;
    const startX = width / 2 - totalWidth / 2;
    const pivotX = startX + this.index * spacing;
    this.x = pivotX + Math.sin(this.angle) * PENDULUM_ROPE_LENGTH;
    this.y = PENDULUM_ORIGIN_Y + Math.cos(this.angle) * PENDULUM_ROPE_LENGTH;
  }

  update(width: number) {
    const force = -PENDULUM_GRAVITY * Math.sin(this.angle);
    this.vAngular += force / PENDULUM_ROPE_LENGTH;
    this.vAngular *= PENDULUM_DAMPING;
    this.angle += this.vAngular;
    this.updatePos(width);
  }
}

export default function PendulumBanner({ children }: Props) {
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
    let balls: PendulumBall[] = [];
    let draggedBall: PendulumBall | null = null;

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;

      balls = [];
      for (let i = 0; i < PENDULUM_BALL_COUNT; i++) {
         balls.push(new PendulumBall(i, width));
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
          
          if (dist < PENDULUM_BALL_RADIUS * 2 - 0.5) { // Tolerance
             // Collision detected
             
             // Exchange velocities (Elastic collision of equal masses)
             // In angular terms
             const tempV = b1.vAngular;
             b1.vAngular = b2.vAngular;
             b2.vAngular = tempV;
             
             // Separate them to prevent sticking
             const overlap = (PENDULUM_BALL_RADIUS * 2) - dist;
             // Push apart based on angle
             // Approximation: Just nudge angles slightly?
             // Better: Reset positions to touching.
             // Since they are on constrained paths, this is tricky.
             // Simple fix: If they are moving towards each other, exchange.
             // If moving apart, let them be.
             
             // Sound or flash effect could trigger here
             
             // Crude reposition to avoid overlap getting worse
             const angleDiff = overlap / PENDULUM_ROPE_LENGTH;
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
       for (const b of balls) {
          const dx = b.x - mx;
          const dy = b.y - my;
          if (dx*dx + dy*dy < PENDULUM_BALL_RADIUS * PENDULUM_BALL_RADIUS) {
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
          const spacing = PENDULUM_BALL_RADIUS * 2;
          const totalWidth = (PENDULUM_BALL_COUNT - 1) * spacing;
          const startX = width / 2 - totalWidth / 2;
          const pivotX = startX + draggedBall.index * spacing;
          
          const dx = mx - pivotX;
          const dy = my - PENDULUM_ORIGIN_Y;
          
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
          draggedBall.updatePos(width);
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
            balls.forEach(b => b.update(width));
            resolveCollisions();
         }
      }

      // Draw Support Structure
      const barY = PENDULUM_ORIGIN_Y;
      // Actual pivots
      const spacing = PENDULUM_BALL_RADIUS * 2;
      const totalWidth = (PENDULUM_BALL_COUNT - 1) * spacing;
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
         ctx.arc(b.x, b.y, PENDULUM_BALL_RADIUS, 0, Math.PI*2);
         // Gold Gradient
         const grad = ctx.createRadialGradient(b.x - 10, b.y - 10, 5, b.x, b.y, PENDULUM_BALL_RADIUS);
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
      {children && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
