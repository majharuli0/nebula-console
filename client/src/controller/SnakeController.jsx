import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const SnakeController = ({ onInput }) => {
  const handlePress = (direction) => {
    if (navigator.vibrate) navigator.vibrate(50);
    onInput({ type: 'DPAD', direction });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4">
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm aspect-square">
        {/* Top Row */}
        <div />
        <button
          className="bg-slate-800 active:bg-green-500 rounded-xl flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 transition-all"
          onTouchStart={() => handlePress('UP')}
          onMouseDown={() => handlePress('UP')}
        >
          <ArrowUp size={48} className="text-white" />
        </button>
        <div />

        {/* Middle Row */}
        <button
          className="bg-slate-800 active:bg-green-500 rounded-xl flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 transition-all"
          onTouchStart={() => handlePress('LEFT')}
          onMouseDown={() => handlePress('LEFT')}
        >
          <ArrowLeft size={48} className="text-white" />
        </button>
        <div className="bg-slate-900/50 rounded-full flex items-center justify-center">
            <span className="text-slate-700 font-black text-2xl">SNAKE</span>
        </div>
        <button
          className="bg-slate-800 active:bg-green-500 rounded-xl flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 transition-all"
          onTouchStart={() => handlePress('RIGHT')}
          onMouseDown={() => handlePress('RIGHT')}
        >
          <ArrowRight size={48} className="text-white" />
        </button>

        {/* Bottom Row */}
        <div />
        <button
          className="bg-slate-800 active:bg-green-500 rounded-xl flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 transition-all"
          onTouchStart={() => handlePress('DOWN')}
          onMouseDown={() => handlePress('DOWN')}
        >
          <ArrowDown size={48} className="text-white" />
        </button>
        <div />
      </div>
    </div>
  );
};

export default SnakeController;
