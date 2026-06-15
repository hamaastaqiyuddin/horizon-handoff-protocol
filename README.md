# Horizon Agent: Collaborative Multi-Agent Bridge

Horizon Agent is a local-first Model Context Protocol (MCP) server and orchestrator designed to bridge the gap between **Google AI (Gemini via Antigravity)** and **Anthropic Claude (via Claude Desktop)**. It allows them to communicate directly, share variables and files, delegate tasks, and log token usage to maximize cost savings and performance.

---

## Architecture Overview

```
                   +-------------------+
                   |   Dashboard UI    |
                   | (localhost:10800) |
                   +---------+---------+
                             ^
                             | (WebSockets)
                             v
+-------------+      +-------+-------+      +---------------+
| Antigravity | <==> | Horizon Server| <==> | Claude Desktop|
|  (Gemini)   | (MCP) | (Node/SQLite) | (MCP)|   (Claude)    |
+-------------+      +---------------+      +---------------+
                             |
                             +---> Shared Workspace (`/shared-workspace`)
```

*   **MCP Tools:** Exposes functions for sending messages, creating tasks, managing shared variables, counting tokens, and routing recommendations.
*   **Local Web Server:** Express app hosting a dark-themed glassmorphism dashboard (port `10800`).
*   **Local DB:** SQLite DB (`horizon-agent.db`) tracking active states.

---

## Getting Started

### 1. Build the Server
Ensure you have Node.js (v18+) installed. Install dependencies and build the TypeScript files:
```bash
npm install
npm run build
```

### 2. Configure Claude Desktop
Add Horizon Agent to your local Claude Desktop config. Open the configuration file (usually located at `~/.config/Claude/claude_desktop_config.json` on Linux) and add the following entry under `mcpServers`:

```json
{
  "mcpServers": {
    "horizon-agent": {
      "command": "node",
      "args": [
        "/home/ultimatezee/.gemini/antigravity/scratch/horizon-agent/dist/server.js"
      ],
      "env": {
        "PORT": "10800"
      }
    }
  }
}
```
*Restart Claude Desktop after saving the configuration.*

### 3. Configure Antigravity / Gemini Agent
Make sure your Gemini agent has the `horizon-agent` MCP server enabled. It will connect using stdio, running the same server executable.

---

## Exposed MCP Tools

### Agent Messaging
*   `send_message(to_agent, content, reply_to_id?)`: Send a direct message to the other agent.
*   `get_unread_messages(agent)`: Retrieve new messages waiting for this agent.
*   `mark_message_read(message_id)`: Mark a message as read.

### Task Delegation
*   `create_task(assignee, title, description, context_files?)`: Delegate a sub-task.
*   `update_task_status(task_id, status, output?)`: Mark a task as `in_progress`, `completed`, or `failed` with results.
*   `list_tasks(assignee?, status?)`: Retrieve tasks list.

### Shared Memory & Files
*   `set_memory_value(key, value)`: Write a shared variable key-value pair.
*   `get_memory_value(key)`: Retrieve a shared variable.
*   `shared-workspace/` directory: Write and reference files in this directory to share context.

### Optimization
*   `recommend_routing(prompt, context_size_chars)`: Returns recommendation (`claude` or `antigravity`) and estimated cost savings based on prompt style and context size.
*   `log_token_usage(agent, prompt_tokens, completion_tokens)`: Records token consumption and calculates costs.

---

## Visualizing Collaborations

Start the daemon directly to inspect or view the GUI:
```bash
npm run dev
```
Open **`http://localhost:10800`** in your browser. The beautiful Dashboard UI shows:
1.  **Topology map:** Pulse animations when messages flow between agents.
2.  **Live Log Feed:** Real-time messages exchanged.
3.  **Task Board:** Kanban view of active/completed delegated tasks.
4.  **Token & Savings Analytics:** Real-time cost comparisons and token metrics.
