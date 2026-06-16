import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import EventEmitter from 'events';
import {
  initDB,
  addMessage,
  getUnreadMessages,
  markMessageRead,
  createTask,
  updateTaskStatus,
  listTasks,
  setMemoryValue,
  getMemoryValue,
  logTokens,
  getAccumulatedStats
} from '../db/sqlite';
import { Message, Task, TokenStats } from '../types';

export const mcpEvents = new EventEmitter();

export function createMCPServer(): Server {
  // Initialize Database on startup
  initDB();

  const server = new Server(
    {
      name: 'horizon-agent',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // --- Agent Messaging ---
        {
          name: 'send_message',
          description: 'Send a message or question to the other agent (Antigravity/Claude) for collaboration.',
          inputSchema: {
            type: 'object',
            properties: {
              to_agent: {
                type: 'string',
                enum: ['antigravity', 'claude'],
                description: 'The recipient agent name.',
              },
              content: {
                type: 'string',
                description: 'The message body/question.',
              },
              reply_to_id: {
                type: 'string',
                description: 'Optional ID of the message being replied to.',
              },
            },
            required: ['to_agent', 'content'],
          },
        },
        {
          name: 'get_unread_messages',
          description: 'Fetch all unread messages addressed to the current agent.',
          inputSchema: {
            type: 'object',
            properties: {
              agent: {
                type: 'string',
                enum: ['antigravity', 'claude'],
                description: 'The current agent name querying for its messages.',
              },
            },
            required: ['agent'],
          },
        },
        {
          name: 'mark_message_read',
          description: 'Mark a message as read.',
          inputSchema: {
            type: 'object',
            properties: {
              message_id: {
                type: 'string',
                description: 'The ID of the message to mark read.',
              },
            },
            required: ['message_id'],
          },
        },
        // --- Task Management ---
        {
          name: 'create_task',
          description: 'Delegate or assign a new task to the other agent.',
          inputSchema: {
            type: 'object',
            properties: {
              assignee: {
                type: 'string',
                enum: ['antigravity', 'claude'],
                description: 'The agent who should perform this task.',
              },
              title: {
                type: 'string',
                description: 'A brief title for the task.',
              },
              description: {
                type: 'string',
                description: 'Detailed description of the task, instructions, and target output.',
              },
              context_files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Paths to files in the workspace related to this task.',
              },
            },
            required: ['assignee', 'title', 'description'],
          },
        },
        {
          name: 'update_task_status',
          description: 'Update the status and output of a delegated task.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'The unique ID of the task to update.',
              },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed', 'failed'],
                description: 'The new status of the task.',
              },
              output: {
                type: 'string',
                description: 'Optional result, explanation, or code output from completing the task.',
              },
            },
            required: ['task_id', 'status'],
          },
        },
        {
          name: 'list_tasks',
          description: 'List delegated tasks, optionally filtered by assignee or status.',
          inputSchema: {
            type: 'object',
            properties: {
              assignee: {
                type: 'string',
                enum: ['antigravity', 'claude'],
                description: 'Filter tasks assigned to this agent.',
              },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed', 'failed'],
                description: 'Filter tasks by their current status.',
              },
            },
          },
        },
        // --- Shared Memory / Variables ---
        {
          name: 'set_memory_value',
          description: 'Set a global variable/shared memory key-value pair that both agents can read.',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The key name for the memory value.',
              },
              value: {
                type: 'string',
                description: 'The string value to associate with the key.',
              },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'get_memory_value',
          description: 'Get a global variable/shared memory value by key.',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The key name to lookup.',
              },
            },
            required: ['key'],
          },
        },
        // --- Token Optimization & Stats ---
        {
          name: 'recommend_routing',
          description: 'Analyze a prompt and context length to recommend which agent (Gemini vs Claude) is optimal.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'The prompt text or task description.',
              },
              context_size_chars: {
                type: 'number',
                description: 'Estimated size of files/context in characters.',
              },
            },
            required: ['prompt', 'context_size_chars'],
          },
        },
        {
          name: 'log_token_usage',
          description: 'Log the tokens consumed for a completed task to track performance and pricing.',
          inputSchema: {
            type: 'object',
            properties: {
              agent: {
                type: 'string',
                enum: ['antigravity', 'claude'],
                description: 'Which agent used the tokens.',
              },
              prompt_tokens: {
                type: 'number',
                description: 'The number of prompt tokens used.',
              },
              completion_tokens: {
                type: 'number',
                description: 'The number of completion tokens used.',
              },
            },
            required: ['agent', 'prompt_tokens', 'completion_tokens'],
          },
        },
        {
          name: 'set_agent_token_status',
          description: 'Manually set the token/rate-limit status of an agent to trigger automatic routing.',
          inputSchema: {
            type: 'object',
            properties: {
              agent: {
                type: 'string',
                enum: ['antigravity', 'claude'],
                description: 'The agent name.',
              },
              status: {
                type: 'string',
                enum: ['normal', 'low', 'depleted'],
                description: 'The token/rate-limit status.',
              },
            },
            required: ['agent', 'status'],
          },
        },
        {
          name: 'get_agent_token_status',
          description: 'Get the token/rate-limit status of an agent.',
          inputSchema: {
            type: 'object',
            properties: {
              agent: {
                type: 'string',
                enum: ['antigravity', 'claude'],
                description: 'The agent name.',
              },
            },
            required: ['agent'],
          },
        },
      ],
    };
  });

  // Helper to update agent heartbeat
  function updateHeartbeat(agent: 'antigravity' | 'claude') {
    const now = new Date().toISOString();
    setMemoryValue(`heartbeat_${agent}`, now);
    mcpEvents.emit('heartbeat', { agent, timestamp: now });
  }

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // --- Agent Messaging ---
        case 'send_message': {
          const { to_agent, content, reply_to_id } = args as any;
          const sender = to_agent === 'claude' ? 'antigravity' : 'claude';
          updateHeartbeat(sender);
          const msg: Omit<Message, 'read'> = {
            id: Math.random().toString(36).substring(2, 11),
            sender,
            receiver: to_agent,
            content,
            timestamp: new Date().toISOString(),
            replyToId: reply_to_id || null,
          };
          const created = addMessage(msg);
          mcpEvents.emit('message', created);
          return {
            content: [{ type: 'text', text: `Message sent to ${to_agent} with ID: ${created.id}` }],
          };
        }

        case 'get_unread_messages': {
          const { agent } = args as any;
          updateHeartbeat(agent);
          const messages = getUnreadMessages(agent);
          return {
            content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }],
          };
        }

        case 'mark_message_read': {
          const { message_id } = args as any;
          markMessageRead(message_id);
          mcpEvents.emit('message_read', message_id);
          return {
            content: [{ type: 'text', text: `Message ${message_id} marked as read.` }],
          };
        }

        // --- Task Management ---
        case 'create_task': {
          const { assignee, title, description, context_files } = args as any;
          const creator = assignee === 'claude' ? 'antigravity' : 'claude';
          updateHeartbeat(creator);
          const task: Task = {
            id: 'task_' + Math.random().toString(36).substring(2, 9),
            title,
            description,
            assignee,
            status: 'pending',
            contextFiles: context_files || [],
            output: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const created = createTask(task);
          mcpEvents.emit('task', created);
          return {
            content: [{ type: 'text', text: `Task created and assigned to ${assignee}. Task ID: ${created.id}` }],
          };
        }

        case 'update_task_status': {
          const { task_id, status, output } = args as any;
          // Find task to identify assignee
          const allTasks = listTasks();
          const targetTask = allTasks.find(t => t.id === task_id);
          if (targetTask) {
            updateHeartbeat(targetTask.assignee);
          }
          updateTaskStatus(task_id, status, output);
          mcpEvents.emit('task_update', { id: task_id, status, output, updatedAt: new Date().toISOString() });
          return {
            content: [{ type: 'text', text: `Task ${task_id} updated to status: ${status}` }],
          };
        }

        case 'list_tasks': {
          const { assignee, status } = args as any;
          if (assignee) {
            updateHeartbeat(assignee);
          }
          const tasks = listTasks(assignee, status);
          return {
            content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
          };
        }

        // --- Shared Memory ---
        case 'set_memory_value': {
          const { key, value } = args as any;
          setMemoryValue(key, value);
          mcpEvents.emit('memory', { key, value, updatedAt: new Date().toISOString() });
          return {
            content: [{ type: 'text', text: `Shared memory set: ${key} = ${value}` }],
          };
        }

        case 'get_memory_value': {
          const { key } = args as any;
          const value = getMemoryValue(key);
          return {
            content: [{ type: 'text', text: value !== null ? value : `Key "${key}" not found in memory.` }],
          };
        }

        // --- Token Optimization & Stats ---
        case 'recommend_routing': {
          const { prompt, context_size_chars } = args as any;
          const lowerPrompt = prompt.toLowerCase();
          
          // Check agent token statuses from shared memory
          const statusClaude = getMemoryValue('token_status_claude') || 'normal';
          const statusAntigravity = getMemoryValue('token_status_antigravity') || 'normal';

          let recommendedAgent: 'claude' | 'antigravity' = 'claude';
          let reason = '';
          const estimatedTokens = Math.ceil(context_size_chars / 4);

          // Priority 1: Token exhaustion routing overrides
          if (statusClaude !== 'normal' && statusAntigravity === 'normal') {
            recommendedAgent = 'antigravity';
            reason = `Claude token budget is currently flagged as ${statusClaude.toUpperCase()}. Automatically routing all processes to Gemini (Antigravity) to preserve resources.`;
          } else if (statusAntigravity !== 'normal' && statusClaude === 'normal') {
            recommendedAgent = 'claude';
            reason = `Gemini (Antigravity) token budget is flagged as ${statusAntigravity.toUpperCase()}. Automatically routing all processes to Claude.`;
          } else {
            // Default size and capability-based heuristics
            if (estimatedTokens > 120000) {
              recommendedAgent = 'antigravity';
              reason = `Context size is extremely large (${estimatedTokens.toLocaleString()} tokens). Gemini is recommended due to its native 2M token context window and cost-efficiency.`;
            } else if (lowerPrompt.includes('refactor') || lowerPrompt.includes('algorithm') || lowerPrompt.includes('debug complex') || lowerPrompt.includes('optimize logic')) {
              recommendedAgent = 'claude';
              reason = 'The task demands high reasoning depth and precise code architecture logic. Claude 3.5 Sonnet excels at these programming tasks.';
            } else if (lowerPrompt.includes('read code') || lowerPrompt.includes('survey') || lowerPrompt.includes('explain') || lowerPrompt.includes('summarize')) {
              recommendedAgent = 'antigravity';
              reason = 'This is a synthesis/retrieval task across multiple files. Gemini (Antigravity) is ideal and significantly more cost-effective for large reads.';
            } else {
              recommendedAgent = 'claude';
              reason = 'General programming task of moderate size; Claude 3.5 Sonnet is recommended for default coding tasks.';
            }
          }

          // Simple cost estimates
          const claudeCost = (estimatedTokens / 1000) * 0.003;
          const geminiCost = (estimatedTokens / 1000) * 0.00125;
          const savings = Math.max(0, claudeCost - geminiCost);

          const result = {
            recommendedAgent,
            reason,
            estimatedTokens,
            potentialCostSavingsUSD: savings,
            statusOverrideApplied: (statusClaude !== 'normal' || statusAntigravity !== 'normal'),
          };

          mcpEvents.emit('routing_recommendation', result);

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'log_token_usage': {
          const { agent, prompt_tokens, completion_tokens } = args as any;
          updateHeartbeat(agent);
          
          let estimatedCost = 0;
          if (agent === 'claude') {
            estimatedCost = (prompt_tokens / 1_000_000) * 3.0 + (completion_tokens / 1_000_000) * 15.0;
          } else {
            estimatedCost = (prompt_tokens / 1_000_000) * 1.25 + (completion_tokens / 1_000_000) * 5.0;
          }

          const stats: TokenStats = {
            timestamp: new Date().toISOString(),
            agent,
            promptTokens: prompt_tokens,
            completionTokens: completion_tokens,
            estimatedCost,
          };

          logTokens(stats);
          mcpEvents.emit('token_stats', stats);

          // Auto-calculate Token Budget and adjust statuses
          try {
            const allStats = getAccumulatedStats();
            const agentStats = allStats.find(s => s.agent === agent);
            if (agentStats) {
              const totalTokens = agentStats.total_prompt + agentStats.total_completion;
              const budgetStr = getMemoryValue(`budget_${agent}`);
              const budget = budgetStr ? parseInt(budgetStr) : (agent === 'claude' ? 200000 : 2000000);

              let newStatus = 'normal';
              if (totalTokens >= budget) {
                newStatus = 'depleted';
              } else if (totalTokens >= budget * 0.8) {
                newStatus = 'low';
              }

              const currentStatus = getMemoryValue(`token_status_${agent}`) || 'normal';
              if (newStatus !== currentStatus) {
                setMemoryValue(`token_status_${agent}`, newStatus);
                mcpEvents.emit('token_status_update', { agent, status: newStatus, totalTokens, budget });
              }
            }
          } catch (err) {
            console.error('[Token check error]', err);
          }

          return {
            content: [{ type: 'text', text: `Logged ${prompt_tokens + completion_tokens} tokens for ${agent}. Estimated cost: $${estimatedCost.toFixed(5)}` }],
          };
        }

        case 'set_agent_token_status': {
          const { agent, status } = args as any;
          setMemoryValue(`token_status_${agent}`, status);
          mcpEvents.emit('token_status_update', { agent, status, manual: true });
          return {
            content: [{ type: 'text', text: `Agent ${agent} token status manually set to: ${status}` }],
          };
        }

        case 'get_agent_token_status': {
          const { agent } = args as any;
          const status = getMemoryValue(`token_status_${agent}`) || 'normal';
          return {
            content: [{ type: 'text', text: status }],
          };
        }

        default:
          throw new Error(`Tool not found: ${name}`);
      }
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${error.message}` }],
      };
    }
  });

  return server;
}
