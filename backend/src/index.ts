import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import {
  createRoom, getRoom, addPlayerToRoom, removePlayerFromRoom,
  startNewRound, setDrawing, recordGuess, endCurrentRound, getScoreboard,
  Player
} from './gameManager';
import { generateSVGDrawing, guessFromImage } from './aiService';

const PORT = process.env.PORT || 3000;

// Check for required environment variable on startup
if (!process.env.VERCEL_AI_GATEWAY_TOKEN) {
  console.error('FATAL: VERCEL_AI_GATEWAY_TOKEN environment variable not set.');
  process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Be more restrictive in production
    methods: ['GET', 'POST'],
  },
});

// --- HTTP API ---

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).send({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/rooms', (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).send({ error: 'Room ID is required.' });
    }
    const room = createRoom(roomId);
    res.status(201).send({ message: `Room ${roomId} created.`, room: { id: room.id, status: room.status } });
  } catch (error) {
    res.status(409).send({ error: error instanceof Error ? error.message : 'Could not create room.' });
  }
});

// --- Socket.IO Game Logic ---

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Tracks the room the player is currently in
  let currentRoomId: string | null = null;

  socket.on('joinRoom', ({ roomId, playerName }: { roomId: string, playerName: string }) => {
    if (!roomId || !playerName) {
      return socket.emit('roomError', 'Room ID and player name are required.');
    }

    try {
      const players = addPlayerToRoom(roomId, socket.id, playerName);
      currentRoomId = roomId;

      socket.join(roomId);
      console.log(`${playerName} (${socket.id}) joined room ${roomId}`);

      // Broadcast updated player list and scoreboard
      io.to(roomId).emit('playerList', players);
      io.to(roomId).emit('scoreboard', getScoreboard(roomId));
      socket.emit('roomJoined', { roomId, players });
    } catch (error) {
      console.error(`Error joining room ${roomId}:`, error);
      socket.emit('roomError', error instanceof Error ? error.message : 'Failed to join room.');
    }
  });

  socket.on('startRound', async ({ roomId, drawerType, word, modelId }: { roomId: string, drawerType: 'ai' | 'player', word: string, modelId: string }) => {
    const room = getRoom(roomId);
    if (!room) return socket.emit('roomError', `Room ${roomId} not found.`);
    if (room.currentRound) return socket.emit('roundError', 'A round is already in progress.');

    // For simplicity, if AI is drawing, drawerId is 'ai'. Otherwise, use the player's id.
    const drawerId = drawerType === 'ai' ? 'ai' : socket.id;

    try {
      const newRound = startNewRound(roomId, drawerId, word, modelId);
      io.to(roomId).emit('roundStarted', { round: newRound, drawer: drawerId === 'ai' ? 'AI' : room.players.get(drawerId)?.name });

      if (drawerType === 'ai') {
        // AI Drawing Logic
        const { svg, pngBase64 } = await generateSVGDrawing(modelId, word);

        setDrawing(roomId, svg, pngBase64!); // pngBase64 will exist unless sharp is missing

        io.to(roomId).emit('drawingReady', {
          drawer: 'AI',
          svg: svg, // Only send to drawer/admin for debugging, or sanitize for all players
          pngBase64: pngBase64 // The image to guess from
        });
      } else {
        // Player Drawing Logic (not fully implemented, player would manually draw)
        // For 'AI Scribble', focus is on the AI part.
        socket.emit('drawingInstruction', { word });
      }

    } catch (error) {
      console.error(`Error starting AI drawing for room ${roomId}:`, error);
      io.to(roomId).emit('roundError', `Failed to start round: ${error instanceof Error ? error.message : 'Unknown AI error'}`);
    }
  });

  socket.on('playerGuess', ({ roomId, guess }: { roomId: string, guess: string }) => {
    const room = getRoom(roomId);
    if (!room || !room.currentRound) return;

    try {
      const { correct } = recordGuess(roomId, socket.id, guess);
      const player = room.players.get(socket.id);

      // Broadcast the guess to everyone
      io.to(roomId).emit('newGuess', {
        playerId: socket.id,
        playerName: player?.name,
        guess: guess,
        isCorrect: correct // Reveals correctness
      });

      if (correct) {
        // Broadcast updated scoreboard
        io.to(roomId).emit('scoreboard', getScoreboard(roomId));
      }

      // Check if all players have guessed (basic round end condition)
      const numPlayers = room.players.size;
      const correctGuessesCount = room.currentRound.guesses.filter(g => g.correct).length;
      if (correctGuessesCount >= numPlayers - (room.currentRound.drawerId === 'ai' ? 0 : 1)) {
        const endedRound = endCurrentRound(roomId);
        io.to(roomId).emit('roundEnded', { round: endedRound, reason: 'All players guessed correctly.' });
        io.to(roomId).emit('scoreboard', getScoreboard(roomId));
      }

    } catch (error) {
      console.error(`Error processing guess in room ${roomId}:`, error);
    }
  });

  socket.on('askAIToGuess', async ({ roomId, imageType }: { roomId: string, imageType: 'svg' | 'png' }) => {
    const room = getRoom(roomId);
    if (!room || !room.currentRound) return socket.emit('roundError', 'No active round to ask AI to guess.');

    try {
      // Use the PNG base64 URL for the multimodal model
      const imageRef = room.currentRound.pngBase64;
      if (!imageRef) return socket.emit('roundError', 'No drawing image available for AI guessing.');

      // TODO: Replace with a multimodal model ID that supports image input
      const aiGuessModel = 'vercel-ai/google/gemini-1.5-flash';
      const aiGuess = await guessFromImage(aiGuessModel, imageRef);

      const isCorrect = aiGuess === room.currentRound.word;

      io.to(roomId).emit('aiGuess', {
        guess: aiGuess,
        isCorrect: isCorrect,
        correctWord: room.currentRound.word,
        model: aiGuessModel
      });

    } catch (error) {
      console.error(`Error asking AI to guess in room ${roomId}:`, error);
      socket.emit('roundError', `AI Guessing Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      const players = removePlayerFromRoom(currentRoomId, socket.id);
      console.log(`Player disconnected: ${socket.id} from room ${currentRoomId}`);
      io.to(currentRoomId).emit('playerList', players);
      io.to(currentRoomId).emit('scoreboard', getScoreboard(currentRoomId));

      // TODO: Handle room cleanup if empty
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n🎉 AI Scribble Backend running on http://localhost:${PORT}`);
  console.log(`Health check at http://localhost:${PORT}/health`);
  console.log(`Socket.IO listening for connections.`);
});
