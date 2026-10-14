import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = window.location.port === '3000'
  ? 'http://localhost:5000'
  : '/';

export const socket = io(SOCKET_SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000
});

export default socket;
