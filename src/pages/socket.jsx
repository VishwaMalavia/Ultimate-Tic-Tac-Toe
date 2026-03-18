import { io } from 'socket.io-client';

const SOCKET_SERVER = 'http://localhost:5000';
export const socket = io(SOCKET_SERVER);
