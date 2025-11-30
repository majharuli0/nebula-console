import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useSocket } from '../context/SocketContext';
import NeonSoccer from '../games/NeonSoccer';
import NeonSnake from '../games/NeonSnake';
import { GAMES, INPUT_TYPES, INPUT_MAP } from '../constants';
import { Eye, EyeOff, Settings, X, Trophy } from 'lucide-react';

const PLAYER_COLORS = [
  '#ff00ff', // Magenta
  '#00ff00', // Green
  '#ffff00', // Yellow
  '#ff0000', // Red
  '#0000ff', // Blue
  '#00ffff', // Cyan
];

const GameContainer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState(location.state?.roomCode || '');
  const gameId = location.state?.gameId || GAMES.SOCCER;
  const { socket, createPeer } = useSocket();
  const gameRef = useRef(null);
  const [players, setPlayers] = useState([]);
  const [showUI, setShowUI] = useState(true);
  
  // New State for Snake Enhancements
  const [timer, setTimer] = useState(180);
  const [scores, setScores] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null); // { scores: [] }

  useEffect(() => {
    // Recover room code
    if (!roomCode) {
        const storedCode = sessionStorage.getItem('roomCode');
        if (storedCode) {
            setRoomCode(storedCode);
        } else {
            navigate('/');
            return;
        }
    }

    // Warn on refresh/leave
    const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomCode, navigate]);

  useEffect(() => {
    if (!socket || !roomCode) return;

    const handleWebRTCInput = (data, playerId) => {
        try {
            // --- 1. Decode Data ---
            // WebRTC data can arrive as a String or ArrayBuffer (depending on browser/network)
            let parsed;
            if (typeof data === 'string') {
                parsed = JSON.parse(data);
            } else {
                const text = new TextDecoder().decode(data);
                parsed = JSON.parse(text);
            }

            // --- 2. Unpack Optimized Payload ---
            // If data is an array, it's our optimized protocol (see SocketContext.jsx)
            if (Array.isArray(parsed)) {
                const [type] = parsed;
                if (type === INPUT_TYPES.JOYSTICK) {
                    const [, x, y] = parsed;
                    parsed = { type: 'JOYSTICK', x, y };
                } else if (type === INPUT_TYPES.BUTTON_DOWN) {
                    const [, btnId] = parsed;
                    // Reverse map ID to Key (e.g., 0 -> 'A')
                    const btnKey = Object.keys(INPUT_MAP).find(key => INPUT_MAP[key] === btnId);
                    parsed = { type: 'BUTTON_DOWN', button: btnKey };
                } else if (type === INPUT_TYPES.FIRE_SHOT) {
                    const [, angle, power] = parsed;
                    parsed = { type: 'FIRE_SHOT', angle, power };
                } else if (type === INPUT_TYPES.DPAD) {
                    const [, dirId] = parsed;
                    const dirKey = Object.keys(INPUT_MAP).find(key => INPUT_MAP[key] === dirId);
                    parsed = { type: 'DPAD', direction: dirKey };
                }
            }
            
            // --- 3. Inject Identity ---
            // P2P messages don't have sender info, so we inject the playerId manually
            parsed.playerId = playerId;

            // console.log('WebRTC Input:', parsed); // Uncomment for debugging
            
            // --- 4. Route to Game Engine ---
            if (gameRef.current) {
                gameRef.current.events.emit('INPUT', parsed);
            }
        } catch (e) {
            console.error('Failed to parse WebRTC data:', e, data);
        }
    };

    socket.on('PLAYER_JOINED', (player) => {
      setPlayers((prev) => {
        const color = PLAYER_COLORS[prev.length % PLAYER_COLORS.length];
        const playerWithColor = { ...player, color };
        
        if (gameRef.current) {
          gameRef.current.events.emit('PLAYER_JOINED', playerWithColor);
        }

        // Initiate WebRTC Peer
        const peer = createPeer(player.id);
        if (peer) {
            peer.removeAllListeners('data'); // Prevent duplicates
            peer.on('data', (data) => handleWebRTCInput(data, player.id));
        }
        
        return [...prev, playerWithColor];
      });
    });

    socket.on('INPUT', (data) => {
      // Check if data is wrapped { playerId, data: [...] } or direct
      let inputData = data;
      
      // Unpack if it's the optimized format from server relay
      if (data.data && Array.isArray(data.data)) {
          const parsedArray = data.data;
          const [type] = parsedArray;
          
          if (type === INPUT_TYPES.JOYSTICK) {
              const [, x, y] = parsedArray;
              inputData = { type: 'JOYSTICK', x, y };
          } else if (type === INPUT_TYPES.BUTTON_DOWN) {
              const [, btnId] = parsedArray;
              const btnKey = Object.keys(INPUT_MAP).find(key => INPUT_MAP[key] === btnId);
              inputData = { type: 'BUTTON_DOWN', button: btnKey };
          } else if (type === INPUT_TYPES.FIRE_SHOT) {
              const [, angle, power] = parsedArray;
              inputData = { type: 'FIRE_SHOT', angle, power };
          } else if (type === INPUT_TYPES.DPAD) {
              const [, dirId] = parsedArray;
              const dirKey = Object.keys(INPUT_MAP).find(key => INPUT_MAP[key] === dirId);
              inputData = { type: 'DPAD', direction: dirKey };
          }
          // Inject playerId from the wrapper
          inputData.playerId = data.playerId;
      }

      if (gameRef.current) {
        gameRef.current.events.emit('INPUT', inputData);
      }
    });

    socket.on('PLAYER_LEFT', (data) => {
      setPlayers((prev) => prev.filter(p => p.id !== data.id));
      if (gameRef.current) {
        gameRef.current.events.emit('PLAYER_LEFT', data);
      }
    });

    socket.on('PLAYER_LIST', (existingPlayers) => {
      const playersWithColors = existingPlayers.map((p, i) => ({
        ...p,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length]
      }));
      setPlayers(playersWithColors);
      
      if (gameRef.current) {
        playersWithColors.forEach(p => {
            gameRef.current.events.emit('PLAYER_JOINED', p);
            
            // Initiate WebRTC Peer for existing players
            const peer = createPeer(p.id);
            if (peer) {
                peer.removeAllListeners('data'); // Prevent duplicates
                peer.on('data', (data) => handleWebRTCInput(data, p.id));
            }
        });
      }
    });

    socket.emit('GET_PLAYERS', { roomCode });

    return () => {
      socket.off('PLAYER_JOINED');
      socket.off('INPUT');
      socket.off('PLAYER_LEFT');
      socket.off('PLAYER_LIST');
    };
  }, [socket, roomCode]);

  useEffect(() => {
    const sceneClass = gameId === GAMES.SNAKE ? NeonSnake : NeonSoccer;
    const sceneKey = gameId === GAMES.SNAKE ? 'NeonSnake' : 'NeonSoccer';

    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: 'phaser-game',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: [sceneClass]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.registry.set('socket', socket);
    game.registry.set('roomCode', roomCode);
    
    game.scene.start(sceneKey);

    // --- Event Listeners for Game Updates ---
    game.events.on('TIME_UPDATE', (time) => setTimer(time));
    game.events.on('SCORE_UPDATE', (newScores) => setScores(newScores));
    game.events.on('GAME_OVER', (finalScores) => setLeaderboard(finalScores));
    
    // Relay Power Shot Status to Controller
    game.events.on('POWER_SHOT_STATUS', ({ playerId, available }) => {
        socket.emit('POWER_SHOT_STATUS', { roomCode, playerId, available });
    });

    return () => {
      game.destroy(true);
    };
  }, [gameId]);

  const handleControl = (action) => {
    if (gameRef.current) {
      gameRef.current.events.emit(action);
    }
  };

  const toggleSettings = () => {
    const newSettingsState = !showSettings;
    setShowSettings(newSettingsState);
    if (newSettingsState) {
        handleControl('PAUSE_GAME');
    } else {
        handleControl('RESUME_GAME');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
      <div id="phaser-game" className="w-full h-full" />
      
      {/* Hide/Show Toggle */}
      <button 
        onClick={() => setShowUI(!showUI)}
        className="absolute bottom-4 left-4 z-50 p-2 bg-black text-white hover:bg-yellow-400 hover:text-black transition-colors border-2 border-white"
      >
        {showUI ? <Eye size={24} /> : <EyeOff size={24} />}
      </button>

      {/* Settings Toggle */}
      <button
        onClick={toggleSettings}
        className="absolute top-4 right-4 z-50 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-3 py-1 transform -skew-x-12 hover:bg-yellow-400 transition-colors active:translate-y-0.5 active:shadow-none"
      >
        <div className="transform skew-x-12">
            <Settings size={18} className="text-black" />
        </div>
      </button>

      {/* Settings Menu - Centered Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6 w-full max-w-md transform scale-100 animate-in zoom-in duration-200">
                <h2 className="text-4xl font-black text-center uppercase tracking-tighter mb-4 text-black">Paused</h2>
                
                <button 
                    onClick={toggleSettings}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black text-xl font-black uppercase py-4 px-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    Resume
                </button>

                <button 
                    onClick={() => navigate('/selector', { state: { roomCode } })}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-black text-xl font-black uppercase py-4 px-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    Change Game
                </button>
                
                <button 
                    onClick={() => navigate('/')}
                    className="bg-red-600 hover:bg-red-700 text-white border-2 border-black text-xl font-black uppercase py-4 px-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    Quit Room
                </button>
            </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {leaderboard && (
        <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white border-4 border-black p-8 max-w-2xl w-full shadow-[12px_12px_0px_0px_rgba(234,179,8,1)]">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-5xl font-black text-black italic uppercase tracking-tighter flex items-center gap-4">
                        <Trophy size={48} className="text-yellow-500" />
                        Leaderboard
                    </h2>
                    <button onClick={() => setLeaderboard(null)} className="text-black hover:text-red-600 transition-colors">
                        <X size={32} />
                    </button>
                </div>

                <div className="space-y-4 mb-8">
                    {leaderboard.map((player, index) => (
                        <div key={player.id} className={`flex items-center justify-between p-4 border-2 border-black ${
                            index === 0 ? 'bg-yellow-400' :
                            index === 1 ? 'bg-gray-300' :
                            index === 2 ? 'bg-orange-400' :
                            'bg-white'
                        }`}>
                            <div className="flex items-center gap-4">
                                <span className="text-3xl font-black w-12 text-center text-black">#{index + 1}</span>
                                <span className="text-2xl font-bold text-black uppercase" style={{ color: index > 2 ? player.color : 'black' }}>{player.nickname}</span>
                            </div>
                            <span className="text-3xl font-mono font-bold text-black">{player.score}</span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <button 
                        onClick={() => {
                            setLeaderboard(null);
                            handleControl('RESTART_GAME');
                        }}
                        className="bg-green-500 hover:bg-green-600 text-black border-2 border-black text-2xl font-black uppercase py-4 px-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        </div>
      )}

      {showUI && (
        <>
          {/* HUD: Timer */}
          {gameId === GAMES.SNAKE && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2">
                <div className="bg-white border-2 border-black px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className={`text-4xl font-mono font-black tracking-widest text-black`}>
                        {formatTime(timer)}
                    </span>
                </div>
                {/* Timer Controls for Snake */}
                 <div className="flex gap-2 pointer-events-auto">
                    <button 
                    onClick={() => handleControl('ADD_TIME')}
                    className="px-2 py-1 bg-cyan-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all text-black font-black text-[10px] uppercase tracking-wider"
                    >
                    +1 Min
                    </button>
                    <button 
                    onClick={() => handleControl('SUB_TIME')}
                    className="px-2 py-1 bg-orange-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all text-black font-black text-[10px] uppercase tracking-wider"
                    >
                    -1 Min
                    </button>
                </div>
             </div>
          )}

          {/* HUD: Player List & Scores */}
          <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
            {/* Use scores if available (Snake), otherwise fallback to players list (Soccer) */}
            {(gameId === GAMES.SNAKE && scores.length > 0 ? scores : players).map((player, index) => (
              <div key={player.id} className="flex items-center gap-2 bg-white border border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {/* Color Indicator */}
                <div 
                    className="w-3 h-3 border border-black"
                    style={{ backgroundColor: player.color }}
                />
                <span 
                  className="text-sm font-medium uppercase tracking-wide text-black"
                  style={{ 
                    fontFamily: 'Impact, sans-serif'
                  }}
                >
                  {player.nickname}
                </span>
                {gameId === GAMES.SNAKE && (
                    <span className="text-black font-mono font-bold text-sm border-l border-black pl-2">
                        {player.score !== undefined ? player.score : 0}
                    </span>
                )}
              </div>
            ))}
          </div>

          {/* Room Code */}
          <div className="absolute top-4 right-16 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-3 py-1 transform -skew-x-12 pointer-events-none">
            <div className="transform skew-x-12 flex items-center gap-2">
              <span className="text-black font-black text-xs uppercase tracking-tighter">Room</span>
              <span className="bg-black text-yellow-400 px-1.5 py-0.5 text-sm font-mono font-bold tracking-widest border border-white">{roomCode}</span>
            </div>
          </div>
          
          {/* Control Panel (Soccer Only) */}
          {gameId === GAMES.SOCCER && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto">
                <button 
                onClick={() => handleControl('START_GAME')}
                className="px-4 py-1.5 bg-green-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all text-black font-black text-xs uppercase tracking-wider"
                >
                Start
                </button>
                <button 
                onClick={() => handleControl('PAUSE_GAME')}
                className="px-4 py-1.5 bg-yellow-400 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all text-black font-black text-xs uppercase tracking-wider"
                >
                Pause
                </button>
                <button 
                onClick={() => handleControl('RESTART_GAME')}
                className="px-4 py-1.5 bg-red-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all text-black font-black text-xs uppercase tracking-wider"
                >
                Restart
                </button>
                <div className="flex flex-col gap-1">
                    <button 
                    onClick={() => handleControl('ADD_TIME')}
                    className="px-3 py-1 bg-cyan-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all text-black font-black text-[10px] uppercase tracking-wider"
                    >
                    +1 Min
                    </button>
                    <button 
                    onClick={() => handleControl('SUB_TIME')}
                    className="px-3 py-1 bg-orange-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all text-black font-black text-[10px] uppercase tracking-wider"
                    >
                    -1 Min
                    </button>
                </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GameContainer;


