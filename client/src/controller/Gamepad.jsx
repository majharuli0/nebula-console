import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Joystick } from 'react-joystick-component';
import { useSocket } from '../context/SocketContext';

const Gamepad = () => {
  const location = useLocation();
  const { roomCode } = location.state || {};
  const { socket, sendInput } = useSocket();
  
  // Power Shot State
  const [powerShotAvailable, setPowerShotAvailable] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('POWER_SHOT_STATUS', ({ available }) => {
        setPowerShotAvailable(available);
        if (available && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    });

    return () => {
        socket.off('POWER_SHOT_STATUS');
    };
  }, [socket]);

  // --- Joystick Logic (Rotated for Landscape) ---
  const handleMove = (event) => {
    if (roomCode) {
      // Rotated Mapping (Phone held with Top to the Left)
      // Physical Up (Screen Left, X-) -> Game Up (Y-) => Game Y = Event X
      // Physical Right (Screen Bottom, Y-) -> Game Right (X+) => Game X = -Event Y
      // User requested Y inversion: "top will be bottom"
      sendInput({
        roomCode,
        type: 'JOYSTICK',
        x: -event.y, 
        y: -event.x // Inverted Y as requested
      });
    }
  };

  const handleStop = () => {
    if (roomCode) {
      sendInput({ roomCode, type: 'JOYSTICK', x: 0, y: 0 });
    }
  };

  // --- Button Logic ---
  const handleBtnPress = (btn) => {
    if (roomCode) {
      sendInput({
        roomCode,
        type: 'BUTTON_DOWN',
        button: btn
      });
    }
  };

  // --- Fullscreen Logic ---
  const triggerFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    }
  };

  return (
    <div 
        className="flex flex-col h-[100dvh] w-full select-none overflow-hidden bg-slate-900"
        onTouchStart={triggerFullScreen}
        onClick={triggerFullScreen}
    >
      {/* Top Area - Fixed Joystick (Left Hand) */}
      <div className="w-full h-1/2 flex items-center justify-center border-b-2 border-white/20 bg-white/5 relative">
        <div className="absolute top-4 right-4 rotate-90 text-white/20 text-xs font-bold uppercase tracking-widest">
            Joystick
        </div>
        <Joystick 
          size={150} 
          sticky={false} 
          baseColor="#374151" 
          stickColor="#60A5FA" 
          move={handleMove} 
          stop={handleStop} 
        />
      </div>

      {/* Bottom Area - Split Controls (Right Hand) */}
      {/* Flex Row in Portrait -> Top/Bottom in Landscape (CCW) */}
      <div className="w-full h-1/2 flex flex-row">
        {/* Left Side (Portrait) -> Top (Landscape) - Power Shot */}
        <div 
            className={`w-1/2 h-full flex items-center justify-center border-r-2 border-white/20 transition-all duration-300 ${
                powerShotAvailable 
                ? 'bg-gradient-to-b from-yellow-400 to-orange-500 active:from-yellow-500 active:to-orange-600' 
                : 'bg-slate-800 opacity-50 cursor-not-allowed'
            }`}
            onTouchStart={(e) => {
                e.stopPropagation(); // Prevent double firing with container
                triggerFullScreen();
                if (powerShotAvailable) handleBtnPress('POWER');
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                triggerFullScreen();
                if (powerShotAvailable) handleBtnPress('POWER');
            }}
        >
            <div className={`flex flex-col items-center ${powerShotAvailable ? 'animate-pulse' : ''} transform rotate-90`}>
                <span className={`text-3xl font-black uppercase italic ${powerShotAvailable ? 'text-black' : 'text-white/30'}`}>
                    Power Shot
                </span>
                {powerShotAvailable && <span className="text-xs font-bold text-black uppercase tracking-widest">Unlocked!</span>}
            </div>
        </div>

        {/* Right Side (Portrait) -> Bottom (Landscape) - Standard Shot (A) */}
        <div 
            className="w-1/2 h-full bg-blue-600 active:bg-blue-700 flex items-center justify-center transition-colors"
            onTouchStart={(e) => {
                e.stopPropagation();
                triggerFullScreen();
                handleBtnPress('A');
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                triggerFullScreen();
                handleBtnPress('A');
            }}
        >
            <span className="transform rotate-90 text-6xl font-black text-white drop-shadow-md">A</span>
        </div>
      </div>
    </div>
  );
};

export default Gamepad;
