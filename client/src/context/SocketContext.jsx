import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // In production, use the provided VITE_SERVER_URL or default to relative path (if served by same origin)
    // In development, use window.location.hostname with port 3001
    const serverUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
