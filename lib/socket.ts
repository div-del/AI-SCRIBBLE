// lib/socket.ts
import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

let socket: Socket | null = null;

export function connectSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not connected. Call connectSocket() first.");
  return socket;
}
