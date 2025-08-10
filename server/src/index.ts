import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer, Socket } from 'socket.io';
import routes from './routes';

const app = express();
app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors());

const server = http.createServer(app);

// ✅ set a fixed path explicitly
const io = new SocketIOServer(server, {
  path: '/socket.io',
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket: Socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// REST routes
app.use('/api', routes);

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
