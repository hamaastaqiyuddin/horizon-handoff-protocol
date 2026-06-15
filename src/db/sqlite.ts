import path from 'path';
import fs from 'fs';
import { Message, Task, MemoryItem, TokenStats } from '../types';

const DB_PATH = path.resolve(__dirname, '../../horizon-agent-db.json');

interface DatabaseSchema {
  messages: Message[];
  tasks: Task[];
  memories: Record<string, { value: string; updatedAt: string }>;
  token_stats: TokenStats[];
}

const defaultData: DatabaseSchema = {
  messages: [],
  tasks: [],
  memories: {},
  token_stats: []
};

// Helper to read database
function readData(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeData(defaultData);
      return defaultData;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[DB Error] Failed to read database:', err);
    return defaultData;
  }
}

// Helper to write database
function writeData(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB Error] Failed to write database:', err);
  }
}

// Initialize database
export function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    writeData(defaultData);
  }
}

// ----------------------------------------------------
// Message DB Queries
// ----------------------------------------------------
export function addMessage(msg: Omit<Message, 'read'>): Message {
  const db = readData();
  const newMsg: Message = { ...msg, read: false };
  db.messages.push(newMsg);
  writeData(db);
  return newMsg;
}

export function getUnreadMessages(receiver: 'antigravity' | 'claude'): Message[] {
  const db = readData();
  return db.messages.filter(m => m.receiver === receiver && !m.read);
}

export function markMessageRead(id: string): void {
  const db = readData();
  const msg = db.messages.find(m => m.id === id);
  if (msg) {
    msg.read = true;
    writeData(db);
  }
}

export function getAllMessages(): Message[] {
  const db = readData();
  return db.messages;
}

// ----------------------------------------------------
// Task DB Queries
// ----------------------------------------------------
export function createTask(task: Task): Task {
  const db = readData();
  db.tasks.push(task);
  writeData(db);
  return task;
}

export function updateTaskStatus(
  id: string,
  status: 'pending' | 'in_progress' | 'completed' | 'failed',
  output?: string
): void {
  const db = readData();
  const task = db.tasks.find(t => t.id === id);
  if (task) {
    task.status = status;
    if (output !== undefined) {
      task.output = output;
    }
    task.updatedAt = new Date().toISOString();
    writeData(db);
  }
}

export function listTasks(assignee?: 'antigravity' | 'claude', status?: string): Task[] {
  const db = readData();
  let filtered = db.tasks;

  if (assignee) {
    filtered = filtered.filter(t => t.assignee === assignee);
  }
  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  // Sort descending by createdAt
  return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ----------------------------------------------------
// Memory DB Queries
// ----------------------------------------------------
export function setMemoryValue(key: string, value: string): void {
  const db = readData();
  const now = new Date().toISOString();
  db.memories[key] = { value, updatedAt: now };
  writeData(db);
}

export function getMemoryValue(key: string): string | null {
  const db = readData();
  const item = db.memories[key];
  return item ? item.value : null;
}

export function getAllMemoryItems(): MemoryItem[] {
  const db = readData();
  return Object.entries(db.memories).map(([key, item]) => ({
    key,
    value: item.value,
    updatedAt: item.updatedAt
  })).sort((a, b) => a.key.localeCompare(b.key));
}

// ----------------------------------------------------
// Token Stats DB Queries
// ----------------------------------------------------
export function logTokens(stats: TokenStats): void {
  const db = readData();
  db.token_stats.push(stats);
  writeData(db);
}

export function getAccumulatedStats(): { agent: string; total_prompt: number; total_completion: number; total_cost: number }[] {
  const db = readData();
  const summary: Record<string, { total_prompt: number; total_completion: number; total_cost: number }> = {
    antigravity: { total_prompt: 0, total_completion: 0, total_cost: 0 },
    claude: { total_prompt: 0, total_completion: 0, total_cost: 0 }
  };

  db.token_stats.forEach(s => {
    if (!summary[s.agent]) {
      summary[s.agent] = { total_prompt: 0, total_completion: 0, total_cost: 0 };
    }
    summary[s.agent].total_prompt += s.promptTokens;
    summary[s.agent].total_completion += s.completionTokens;
    summary[s.agent].total_cost += s.estimatedCost;
  });

  return Object.entries(summary).map(([agent, data]) => ({
    agent,
    total_prompt: data.total_prompt,
    total_completion: data.total_completion,
    total_cost: data.total_cost
  }));
}

export function getTokenLogs(): TokenStats[] {
  const db = readData();
  // Sort descending by timestamp
  return [...db.token_stats]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100);
}
