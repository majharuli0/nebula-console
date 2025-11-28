import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { GAMES } from '../constants';

const GameSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const [roomCode, setRoomCode] = useState(location.state?.roomCode || '');

  useEffect(() => {
    // Recover room code from session storage if needed
    if (!roomCode) {
        const storedCode = sessionStorage.getItem('roomCode');
        if (storedCode) {
            setRoomCode(storedCode);
        } else {
            navigate('/');
        }
    }
  }, [roomCode, navigate]);

  const handleSelectGame = (gameId) => {
    console.log('Selecting game:', gameId, 'Room:', roomCode);
    if (socket && roomCode) {
      socket.emit('SELECT_GAME', { roomCode, gameId });
      navigate('/game', { state: { roomCode, gameId } });
    } else {
      console.error('Cannot select game: Socket or RoomCode missing', { socket: !!socket, roomCode });
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-6xl font-black text-white mb-12 uppercase tracking-tighter transform -skew-x-6"
          style={{ textShadow: '4px 4px 0 #000' }}>
        Select Game
      </h1>

      <div className="flex gap-12">
        {/* Neon Soccer Card */}
        <div 
          onClick={() => handleSelectGame(GAMES.SOCCER)}
          className="group relative w-80 h-96 bg-gradient-to-br from-blue-600 to-purple-600 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          <div className="p-6 flex flex-col h-full items-center justify-center text-center">
            <div className="text-6xl mb-4">⚽</div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2" style={{ textShadow: '2px 2px 0 #000' }}>
              Neon Soccer
            </h2>
            <p className="text-white font-bold bg-black/50 px-2 py-1">
              2-4 Players
            </p>
          </div>
        </div>

        {/* Neon Snake Card */}
        <div 
          onClick={() => handleSelectGame(GAMES.SNAKE)}
          className="group relative w-80 h-96 bg-gradient-to-br from-green-500 to-emerald-700 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          <div className="p-6 flex flex-col h-full items-center justify-center text-center">
            <div className="text-6xl mb-4">🐍</div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2" style={{ textShadow: '2px 2px 0 #000' }}>
              Neon Snake
            </h2>
            <p className="text-white font-bold bg-black/50 px-2 py-1">
              2-8 Players
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-white border-2 border-black px-4 py-2 transform skew-x-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="transform -skew-x-12 flex gap-2 items-center">
          <span className="font-bold text-black uppercase">Room Code:</span>
          <span className="font-mono font-black text-xl bg-black text-yellow-400 px-2">{roomCode}</span>
        </div>
      </div>
    </div>
  );
};

export default GameSelector;
