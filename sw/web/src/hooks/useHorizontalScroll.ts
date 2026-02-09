import { useRef, useState, useEffect, useCallback } from 'react';

export function useHorizontalScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use a ref to store mutable state for event handlers to avoid dependency issues
  // and to ensure fresh values in window listeners without re-binding them.
  const state = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    isDragging: false
  });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    state.current.isDown = true;
    state.current.startX = e.pageX - scrollRef.current.offsetLeft;
    state.current.scrollLeft = scrollRef.current.scrollLeft;
    // We don't reset isDragging here immediately to false if we want to be super safe, 
    // but typically a new click means new drag.
    state.current.isDragging = false;
    // We might need to ensure setIsDragging(false) was called previously, but it should be.
    // However, if we click fast, previous timeout might be pending? 
    // It's safe to force false here to sync UI.
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!state.current.isDown || !scrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - state.current.startX) * 1.5; // Scroll speed multiplier
      
      // Threshold check (5px)
      if (Math.abs(x - state.current.startX) > 5) {
         if (!state.current.isDragging) {
            state.current.isDragging = true;
            setIsDragging(true); // Trigger re-render for cursor style
         }
         scrollRef.current.scrollLeft = state.current.scrollLeft - walk;
      }
    };

    const onMouseUp = () => {
      // Always handle mouseup if it happens, to ensure we reset isDown
      if (state.current.isDown) {
        state.current.isDown = false;
        
        if (state.current.isDragging) {
             // Delay resetting isDragging to allow onClickCapture to filter the click
             setTimeout(() => {
                state.current.isDragging = false;
                setIsDragging(false);
             }, 0);
        } else {
             // If we didn't drag, just reset state
             state.current.isDragging = false;
             // setIsDragging(false) is redundant since it's already false, but safe.
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    // Also listen to mouseleave on window? No, mouseup on window covers it usually.
    // But if mouse leaves the window, sometimes mouseup is missed until it comes back?
    // Modern browsers handle window mouseup well even if released outside.
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  /* Prevent native drag (ghost image) which breaks custom dragging */
  const onDragStart = useCallback((e: React.DragEvent) => {
      e.preventDefault();
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // Check ref directly for most up-to-date status
    if (state.current.isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    scrollRef,
    isDragging, // For UI styling
    events: {
      onMouseDown,
      onDragStart,
      onClickCapture
    }
  };
}

