import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Gamepad from './Gamepad';
import SnakeController from './SnakeController';
import { GAMES, CONTROLLERS } from '../constants';

const ControllerRouter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const { roomCode, gameId } = location.state || {};
  const [activeGame, setActiveGame] = useState(gameId || GAMES.SOCCER);

  console.log('ControllerRouter mounted. Room:', roomCode, 'Initial Game:', gameId, 'Active Game:', activeGame);

  useEffect(() => {
    if (!socket || !roomCode) {
      navigate('/');
      return;
    }

    // Initial fetch
    socket.emit('GET_GAME_STATE', { roomCode });

    // Poll for game state every 2 seconds (Robust fallback)
    const pollInterval = setInterval(() => {
      socket.emit('GET_GAME_STATE', { roomCode });
    }, 2000);

    socket.on('GAME_CHANGED', (newGameId) => {
      console.log('Controller received GAME_CHANGED:', newGameId);
      setActiveGame(newGameId);
    });

    socket.on('GAME_STATE', (gameState) => {
      // Only update if changed to avoid re-renders (though React handles this)
      setActiveGame((prev) => {
        if (prev !== gameState) {
            console.log('Controller received GAME_STATE (Polling):', gameState);
            return gameState;
        }
        return prev;
      });
    });

    return () => {
      clearInterval(pollInterval);
      socket.off('GAME_CHANGED');
      socket.off('GAME_STATE');
    };
  }, [socket, roomCode, navigate]);

  const handleInput = (data) => {
    if (socket && roomCode) {
      socket.emit('INPUT', { roomCode, ...data });
    }
  };

  const renderController = () => {
    switch (activeGame) {
      case GAMES.SNAKE:
        return <SnakeController onInput={handleInput} />;
      case GAMES.SOCCER:
      default:
        return <Gamepad />; // Gamepad handles its own input emission currently, might need refactor
    }
  };

  return renderController();
};

export default ControllerRouter;
