import React from 'react';
import { Routes, Route } from 'react-router-dom';
import JoinScreen from './JoinScreen';
import ControllerRouter from './ControllerRouter';
import { useSocket } from '../context/SocketContext';
import { Wifi, Zap } from 'lucide-react';

const ControllerLayout = () => {
  const { connectionType } = useSocket() || {};

  return (
    <div className="w-full h-full bg-gray-900 text-white touch-none relative">
      <Routes>
        <Route path="/" element={<JoinScreen />} />
        <Route path="/gamepad" element={<ControllerRouter />} />
      </Routes>
      
      {/* Connection Status Indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full pointer-events-none">
        {connectionType === 'WEBRTC' ? (
            <>
                <Zap size={12} className="text-green-400" />
                <span className="text-[10px] font-bold text-green-400">P2P</span>
            </>
        ) : (
            <>
                <Wifi size={12} className="text-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-400">NET</span>
            </>
        )}
      </div>
    </div>
  );
};

export default ControllerLayout;
