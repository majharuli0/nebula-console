import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './Landing';
import GameSelector from './GameSelector';
import GameContainer from './GameContainer';

const HostLayout = () => {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/selector" element={<GameSelector />} />
        <Route path="/game" element={<GameContainer />} />
      </Routes>
    </div>
  );
};

export default HostLayout;
