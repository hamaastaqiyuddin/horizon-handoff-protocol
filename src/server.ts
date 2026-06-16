import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, mcpEvents } from './mcp/server';
import {
  getAllMessages,
  listTasks,
  getAllMemoryItems,
  getAccumulatedStats,
  getTokenLogs
} from './db/sqlite';

// CRITICAL: Prevent writing general server logs to stdout.
// StdioServerTransport uses stdout/stdin. Writing to stdout corrupts JSON-RPC.
const log = (...args: any[]) => {
  console.error('[Horizon Server]', ...args);
};

// 1. Initialize MCP Server
const mcpServer = createMCPServer();

// 2. Start MCP Stdio Transport
log('Initializing MCP Stdio transport...');
const transport = new StdioServerTransport();
mcpServer.connect(transport).then(() => {
  log('MCP Stdio transport connected.');
}).catch((err) => {
  log('Failed to connect MCP Stdio transport:', err);
});

// 3. Setup Express app for the Dashboard Web GUI
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 10800;

app.use(express.json());

// Serve static dashboard files
const dashboardDir = path.resolve(__dirname, '../dashboard');
app.use(express.static(dashboardDir));

// API Endpoints for UI to load initial state
app.get('/api/messages', (req, res) => {
  try {
    res.json(getAllMessages());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', (req, res) => {
  try {
    res.json(listTasks());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/memory', (req, res) => {
  try {
    res.json(getAllMemoryItems());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = getAccumulatedStats();
    const logs = getTokenLogs();
    res.json({ stats, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. WebSocket Communication for Real-Time UI Updates
const activeSockets = new Set<WebSocket>();

wss.on('connection', (socket) => {
  log('Dashboard client connected via WebSocket.');
  activeSockets.add(socket);

  socket.on('close', () => {
    log('Dashboard client disconnected.');
    activeSockets.delete(socket);
  });
});

// Integrate WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Broadcast Helper
function broadcast(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  for (const socket of activeSockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

// 5. Connect MCP event listeners to WebSockets
mcpEvents.on('message', (message) => {
  broadcast('message', message);
});

mcpEvents.on('message_read', (messageId) => {
  broadcast('message_read', messageId);
});

mcpEvents.on('task', (task) => {
  broadcast('task', task);
});

mcpEvents.on('task_update', (update) => {
  broadcast('task_update', update);
});

mcpEvents.on('memory', (memory) => {
  broadcast('memory', memory);
});

mcpEvents.on('heartbeat', (hb) => {
  broadcast('heartbeat', hb);
});

mcpEvents.on('token_stats', (stats) => {
  // Broadcast updated accumulated stats and new log
  try {
    const statsSummary = getAccumulatedStats();
    broadcast('token_stats', { stats: statsSummary, log: stats });
  } catch (err) {
    log('Failed to broadcast token stats:', err);
  }
});

mcpEvents.on('token_status_update', (update) => {
  broadcast('token_status_update', update);
});

mcpEvents.on('routing_recommendation', (recommendation) => {
  broadcast('routing_recommendation', recommendation);
});

// 6. Start Dashboard Server
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    log(`Port ${PORT} is already in use. Dashboard server skipped (already running in another process), but MCP server continues to run.`);
  } else {
    log('Dashboard server encountered an error:', err);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  log(`Local Dashboard Web GUI available at http://127.0.0.1:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('Shutting down Horizon Agent...');
  await mcpServer.close();
  server.close(() => {
    log('Dashboard server closed.');
    process.exit(0);
  });
});
