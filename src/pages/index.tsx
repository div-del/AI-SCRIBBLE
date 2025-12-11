import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/game');
  }, [router]);

  return <div>Redirecting to game...</div>;
}

import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // allow your frontend
    methods: ["GET", "POST"]
  }
});

app.get("/health", (req, res) => res.send("ok"));
server.listen(3001, () => console.log("Backend running on http://localhost:3001"));
