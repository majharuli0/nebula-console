import React, { useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useLocation } from 'react-router-dom';

const AimController = () => {
  const socket = useSocket();
  const location = useLocation();
  const { roomCode } = location.state || {};
  
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const containerRef = useRef(null);

  const handleStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
    setDragCurrent({ x: clientX, y: clientY });
  };

  const handleMove = (e) => {
    if (!dragStart) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragCurrent({ x: clientX, y: clientY });
  };

  const handleEnd = () => {
    if (!dragStart || !dragCurrent) return;
    
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    
    // Calculate angle and power
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx*dx + dy*dy);
    const power = Math.min(distance / 5, 100); // Cap power

    if (power > 10) { // Minimum threshold
      socket.emit('INPUT', {
        roomCode,
        type: 'FIRE_SHOT',
        angle,
        power
      });
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-gray-900 flex items-center justify-center relative touch-none"
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
    >
      <div className="text-gray-500 pointer-events-none select-none">
        Pull back and release to fire!
      </div>

      {dragStart && dragCurrent && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line 
            x1={dragStart.x} 
            y1={dragStart.y} 
            x2={dragCurrent.x} 
            y2={dragCurrent.y} 
            stroke="white" 
            strokeWidth="4" 
            strokeDasharray="10 5"
          />
          <circle cx={dragStart.x} cy={dragStart.y} r="10" fill="white" />
          <circle cx={dragCurrent.x} cy={dragCurrent.y} r="20" fill="red" opacity="0.5" />
        </svg>
      )}
    </div>
  );
};

export default AimController;
