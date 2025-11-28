import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const Landing = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('ROOM_CREATED', (code) => {
      setRoomCode(code);
      sessionStorage.setItem('roomCode', code); // Persist room code
      navigate('/selector', { state: { roomCode: code } });
    });

    return () => {
      socket.off('ROOM_CREATED');
    };
  }, [socket, navigate]);

  const createRoom = () => {
    if (socket) {
      socket.emit('CREATE_ROOM');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-white relative overflow-hidden p-4">
      {/* Decorative Background Elements - Hidden on small screens, visible on md+ */}
      <div className="hidden md:block absolute top-10 left-10 w-32 h-32 bg-yellow-400 border-4 border-black transform -rotate-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"></div>
      <div className="hidden md:block absolute bottom-10 right-10 w-48 h-48 bg-cyan-400 border-4 border-black transform rotate-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-full"></div>
      
      <h1 className="text-5xl md:text-8xl font-black mb-8 md:mb-12 text-black uppercase tracking-tighter transform -skew-x-6 text-center" style={{ textShadow: '3px 3px 0px #eab308' }}>
        NEBULA CONSOLE
      </h1>
      
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 z-10 w-full md:w-auto px-4 md:px-0">
        <button
          onClick={createRoom}
          className="w-full md:w-auto px-8 py-4 md:px-12 md:py-6 bg-yellow-400 hover:bg-yellow-500 text-black border-4 border-black text-xl md:text-3xl font-black uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all transform hover:-rotate-2"
        >
          Create Room
        </button>
        <button
          onClick={() => navigate('/controller')}
          className="w-full md:w-auto px-8 py-4 md:px-12 md:py-6 bg-cyan-400 hover:bg-cyan-500 text-black border-4 border-black text-xl md:text-3xl font-black uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all transform hover:rotate-2"
        >
          Controller
        </button>
      </div>
    </div>
  );
};

export default Landing;
