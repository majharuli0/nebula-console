import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const JoinScreen = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('JOIN_SUCCESS', ({ code, nickname, gameId }) => {
      navigate('/controller/gamepad', { state: { roomCode: code, nickname, gameId } });
    });

    socket.on('ERROR', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('JOIN_SUCCESS');
      socket.off('ERROR');
    };
  }, [socket, navigate]);

  const joinRoom = () => {
    if (socket && code.length === 4 && nickname) {
      socket.emit('JOIN_ROOM', { code: code.toUpperCase(), nickname });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 space-y-6 md:space-y-8 bg-white relative overflow-hidden">
       {/* Decorative Background Elements */}
       <div className="hidden md:block absolute top-[-50px] right-[-50px] w-40 h-40 bg-yellow-400 border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
       <div className="hidden md:block absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-cyan-400 border-4 border-black transform rotate-45 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>

      <h1 className="text-4xl md:text-6xl font-black text-black uppercase tracking-tighter transform -skew-x-6 text-center" style={{ textShadow: '3px 3px 0px #eab308' }}>
        Join Game
      </h1>
      
      <div className="w-full max-w-md space-y-4 md:space-y-6 z-10">
        <input
            type="text"
            placeholder="ROOM CODE"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full p-3 md:p-4 text-center text-xl md:text-3xl font-black text-black bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:translate-y-1 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none transition-all placeholder-gray-400 uppercase"
        />
        
        <input
            type="text"
            placeholder="NICKNAME"
            maxLength={12}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-3 md:p-4 text-center text-lg md:text-2xl font-bold text-black bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:translate-y-1 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none transition-all placeholder-gray-400"
        />

        <button
            onClick={joinRoom}
            disabled={!code || !nickname}
            className="w-full py-3 md:py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-black border-4 border-black text-2xl md:text-3xl font-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
            Join
        </button>
      </div>
    </div>
  );
};

export default JoinScreen;
