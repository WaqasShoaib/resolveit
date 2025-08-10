import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import connectDB from './config/database';
import apiRoutes from './routes';

// Load env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();

// Connect DB once
connectDB();

// Core middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health checks
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ResolveIt API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});
// Also expose under /api (useful for the client baseURL == /api)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Mount REST API under /api
app.use('/api', apiRoutes);


// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  path: '/socket.io',
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    credentials: true,
  },
});

// Make io available to controllers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('🔌 Socket disconnected:', socket.id));
});

// Start server
const PORT = Number(process.env.PORT || 5000);
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
});

export default app;
