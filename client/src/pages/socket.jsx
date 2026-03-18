import { io } from 'socket.io-client';

const SOCKET_SERVER = import.meta.env.VITE_SOCKET_URL;

export const socket = io(SOCKET_SERVER, {
  transports: ["websocket"],   // better for render
  withCredentials: true
});