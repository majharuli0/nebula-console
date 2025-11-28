import React from 'react';
import { Routes, Route } from 'react-router-dom';
import JoinScreen from './JoinScreen';
import ControllerRouter from './ControllerRouter';

const ControllerLayout = () => {
  return (
    <div className="w-full h-full bg-gray-900 text-white touch-none">
      <Routes>
        <Route path="/" element={<JoinScreen />} />
        <Route path="/gamepad" element={<ControllerRouter />} />
      </Routes>
    </div>
  );
};

export default ControllerLayout;
