import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { EVENTS, INPUT_TYPES, INPUT_MAP } from '../constants';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionType, setConnectionType] = useState('SOCKET'); // 'SOCKET' | 'WEBRTC'
  
  // Host: Map<socketId, Peer>
  // Controller: Peer (single instance)
  const peersRef = useRef({}); 
  const socketRef = useRef(null);

  useEffect(() => {
    // In production, use the provided VITE_SERVER_URL or default to relative path
    const serverUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;
    const newSocket = io(serverUrl);
    socketRef.current = newSocket;
    setSocket(newSocket);

    // Handle WebRTC Signaling
    newSocket.on(EVENTS.SIGNAL, ({ signal, sender }) => {
      const peer = peersRef.current[sender];
      if (peer) {
        peer.signal(signal);
      } else {
        // If we are Host and receive a signal from a new player (Controller)
        // We might need to accept it, but usually Host initiates for stability?
        // Actually, simple-peer pattern: Initiator creates offer.
        // Let's say Host is always Initiator for simplicity when Player joins.
        // Or Controller initiates.
        // Let's stick to: Host initiates when it gets PLAYER_JOINED.
        // So if we get a signal here and no peer exists, it might be an answer to our offer?
        // Or if we are Controller, we get an offer from Host.
        
        // If we are Controller and receive offer from Host:
        if (!peer && !newSocket.id) return; // Wait for ID
        
        // Logic for Controller receiving offer from Host (sender)
        // We need to create a non-initiator peer
        const newPeer = new SimplePeer({
          initiator: false,
          trickle: false,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        newPeer.on('signal', (data) => {
          newSocket.emit(EVENTS.SIGNAL, { target: sender, signal: data });
        });

        newPeer.on('connect', () => {
          console.log('WebRTC Connected to Host');
          setConnectionType('WEBRTC');
        });
        
        newPeer.on('close', () => {
             console.log('WebRTC Closed');
             setConnectionType('SOCKET');
             delete peersRef.current[sender];
        });

        newPeer.on('error', (err) => {
            console.error('WebRTC Error:', err);
            setConnectionType('SOCKET');
        });

        newPeer.signal(signal);
        peersRef.current[sender] = newPeer;
      }
    });

    return () => {
      newSocket.close();
      Object.values(peersRef.current).forEach(p => p.destroy());
    };
  }, []);

  // Host Logic: Create peer for new player
  const createPeer = (playerId) => {
    if (peersRef.current[playerId]) return peersRef.current[playerId]; // Return existing

    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      socketRef.current.emit(EVENTS.SIGNAL, { target: playerId, signal });
    });

    peer.on('connect', () => {
      console.log(`WebRTC Connected to Player ${playerId}`);
    });
    
    peer.on('data', (data) => {
        // Handle data received via WebRTC (e.g. Input)
        // We need to route this to the game.
        // Since this is Context, we might need a way to subscribe to data.
        // For now, we'll emit a local event or just expose peers.
        // Better: Emit a socket-like event locally?
        // Or just let GameContainer handle peers directly if we expose them.
    });

    peer.on('close', () => {
        delete peersRef.current[playerId];
    });

    peersRef.current[playerId] = peer;
    return peer;
  };
  
  // Controller Logic: Send Input
  const sendInput = (data) => {
    // --- 1. Payload Optimization ---
    // Pack data into a compact array to reduce bandwidth usage (requested by user).
    // Format depends on input type (see INPUT_TYPES in constants).
    let payload = data;
    if (data.type === 'JOYSTICK') {
        // [TYPE, X, Y] - Truncate decimals for efficiency
        const x = Math.round(data.x * 10000) / 10000;
        const y = Math.round(data.y * 10000) / 10000;
        payload = [INPUT_TYPES.JOYSTICK, x, y];
    } else if (data.type === 'BUTTON_DOWN') {
        // [TYPE, BUTTON_ID]
        payload = [INPUT_TYPES.BUTTON_DOWN, INPUT_MAP[data.button]];
    } else if (data.type === 'FIRE_SHOT') {
        // [TYPE, ANGLE, POWER]
        const angle = Math.round(data.angle * 10000) / 10000;
        const power = Math.round(data.power * 100) / 100;
        payload = [INPUT_TYPES.FIRE_SHOT, angle, power];
    } else if (data.type === 'DPAD') {
        // [TYPE, DIRECTION_ID]
        payload = [INPUT_TYPES.DPAD, INPUT_MAP[data.direction]];
    }

    // --- 2. WebRTC Transmission (Primary) ---
    // Find the host peer (Controller usually has only one peer: the Host)
    const peerKeys = Object.keys(peersRef.current);
    const peer = peerKeys.length > 0 ? peersRef.current[peerKeys[0]] : null;

    if (peer && peer.connected) {
      try {
        // Send as JSON stringified array. 
        // Note: simple-peer supports strings and buffers.
        const jsonPayload = JSON.stringify(payload);
        peer.send(jsonPayload);
        // console.log('Sent via WebRTC:', payload);
        return; 
      } catch (e) {
        console.error('WebRTC Send Failed', e);
      }
    }
    
    // --- 3. Socket.IO Fallback (Secondary) ---
    // If WebRTC fails or isn't connected, fall back to the relay server.
    if (socketRef.current) {
        // Wrap the array payload in an object so the server can extract the roomCode.
        // The server relays this object to the Host.
        socketRef.current.emit(EVENTS.INPUT, { roomCode: data.roomCode, data: payload });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, createPeer, peersRef, sendInput, connectionType }}>
      {children}
    </SocketContext.Provider>
  );
};
