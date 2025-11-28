import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import HostLayout from './host/HostLayout';
import ControllerLayout from './controller/ControllerLayout';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/controller/*" element={<ControllerLayout />} />
          <Route path="/*" element={<HostLayout />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
