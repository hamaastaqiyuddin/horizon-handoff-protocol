export interface Message {
  id: string;
  sender: 'antigravity' | 'claude';
  receiver: 'antigravity' | 'claude';
  content: string;
  timestamp: string;
  replyToId: string | null;
  read: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: 'antigravity' | 'claude';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  contextFiles: string[];
  output: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryItem {
  key: string;
  value: string;
  updatedAt: string;
}

export interface TokenStats {
  id?: number;
  timestamp: string;
  agent: 'antigravity' | 'claude';
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
}
