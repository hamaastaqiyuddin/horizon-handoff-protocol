<p align="center">
  <img src="assets/logo.png" alt="Horizon Handoff Protocol Logo" width="300" />
</p>

# Horizon Handoff Protocol (HHP)

> **Unlock the True Power of Multi-Agent Programming Across Any Platform!** 🚀
> 
> Are you tired of being locked into a single AI model's walled garden? Do you want to orchestrate Claude's brilliant analytical coding precision alongside Gemini's massive 2-million context window, or hand off tasks to GPT-4o, Cursor, or Aider seamlessly—without manual copy-pasting, and without wasting thousands of tokens on idle background polling?
> 
> Welcome to **Horizon Handoff Protocol (HHP)**! HHP is a **universal, platform-agnostic, and model-independent** Git-Ops developer tool that bridges the gap between independent AI systems. It is designed to save your hard-earned tokens, respect your CPU resources, and supercharge your collaborative coding workflows. Let's build the future, faster and smarter!

---

## ⚡ Supercharged Benefits: Why You Should Try It Today!

If you are coding with AI agents, HHP is a game-changer. Here is what you get out of the box:

* 🚀 **100% Zero-Daemon, Zero-Token Waste:** No background database servers, no idle processes, and zero polling. HHP runs on-demand and consumes **0 idle tokens** and **0 idle CPU**. Your token quota is spent purely on actual coding tasks!
* ⚡ **Universal Multi-Platform Handoff:** Not just for Claude Desktop or Antigravity! HHP works as a universal connector. Use it to hand off states between **Cursor IDE**, **Windsurf**, **Roo-Code**, **Cline**, or terminal CLI agents like **Aider** and **Claude Code**.
* 🧠 **Smart Diff Filtering (Token Optimizer):** HHP automatically filters out binary assets (images, audio, zip files), package manager lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`), and compiler artifacts (like `dist/`, `build/`). You save up to **90% on input tokens**!
* 🛡️ **Git-Ops Safe & Branch-Ready:** Track every single agent transition natively inside your Git branches. Safe, versioned, and completely developer-friendly.
* 🔌 **Model & IDE Agnostic:** Exposes standard MCP tools so it plugs right into Claude Desktop, Cursor, Windsurf, or VS Code. It is the universal "USB-C" port for AI agent memory!

---

## 🚀 How It Works

```
[Agent A (e.g., Claude)] ──► `hz save` ──► [.horizon/state.json] ──► `hz load` ──► [Agent B (e.g., Gemini)]
  (Writes UI & Code)              (Optimized Handoff State)                (Resumes & Writes Tests)
```

1. **Save:** Agent A finishes writing a module or runs out of tokens. It runs the `save_handoff` tool (or you run `hz save`).
2. **State:** A `.horizon/state.json` (metadata) and a human-readable `.horizon/handoff.md` are generated locally in your project.
3. **Load:** You open Agent B (Cursor, Antigravity, or terminal) and type `resume`. The agent calls `load_handoff` (or you run `hz load`) to inherit the exact sisa-tugas checklist, files modified, and target goals.

---

## 🤔 Why HHP? (The Pain Points vs. The Cure)

### ❓ What goes wrong when building multi-agent systems without HHP?

* **Problem 1: Forensic Context Re-exploration**
  * *Without HHP:* When you switch models (e.g. from Claude to Gemini due to token depletion), the new agent starts "cold." It has no idea what was recently modified, what planned steps are left, or what compiler errors just happened. The agent spends thousands of tokens doing "forensic exploration" to figure out where the previous agent left off.
  * *With HHP:* The receiving agent instantly loads `.horizon/state.json`. It knows the exact sisa-tugas checklist, files modified, active compiler errors, and shared memory variables in **1 second**.

* **Problem 2: The "Token Bleeding" Polling Trap**
  * *Without HHP:* Traditional multi-agent coordinators run active background polling loops (daemons or cron jobs). Every single minute they wake up, they send your entire project history to the LLM to check for tasks, quickly exhausting your API quotas even when you are idle.
  * *With HHP:* HHP is **100% stateless**. It runs purely on-demand, consuming **zero idle tokens** and **zero idle CPU**. 

* **Problem 3: Walled Gardens & Vendor Lock-In**
  * *Without HHP:* Big Tech providers want to lock you into their own chat windows. They will never build a tool that makes it easy to switch from Claude to Gemini.
  * *With HHP:* HHP acts as an independent, open-standard "USB-C" port for AI agent memory, giving you complete freedom to hot-swap models depending on their strengths.

---

## 🏆 What makes HHP uniquely different from other tools?

* **HHP vs. LangGraph / Microsoft Autogen:** Frameworks like LangGraph are developer libraries for building a *single* multi-agent application. HHP is an **interactive developer tool** designed to coordinate *different, independent* desktop and IDE agents (like Claude Desktop and VS Code/Antigravity) together.
* **HHP vs. Aider / Claude Code:** These are single-agent command-line runtimes. HHP is not a runtime; it is a **universal state-sharing protocol** that lets multiple different runtimes collaborate on the same repository.
* **HHP vs. Traditional RAG:** Vector search tools are built for humans to query documentation. HHP's state compactor is engineered specifically for **agent-to-agent kognitive handoffs**, utilizing AST and Git-diffs to package information for LLMs.

---

## 🏃‍♂️ Get Started in 60 Seconds!

Don't wait—experience the future of collaborative AI coding right now!

### 1. Install HHP CLI globally:
```bash
npm install -g .
```

### 2. Initialize HHP in your project:
```bash
hz init
```
This instantly prepares your workspace and creates the `.horizon/` folder. You are now ready to orchestrate handoffs!

### 🛠️ Setting up MCP

To let your AI agents call HHP automatically, add the server to your MCP configurations.

#### For Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "horizon-handoff": {
      "command": "node",
      "args": ["/absolute/path/to/horizon-agent/dist/mcp/server.js"]
    }
  }
}
```

#### For Cursor, Windsurf, or VS Code MCP plugins:
Add a new stdio MCP server configured with:
* **Command:** `node`
* **Argument:** `/absolute/path/to/horizon-agent/dist/mcp/server.js`

---

## 💻 CLI Commands Reference

### 1. `hz init`
Initialize HHP in the current project directory.

### 2. `hz save`
Capture the current workspace state (git status, diff, modified files) and write a handoff ticket.
```bash
hz save "Impl parsing logic" --remaining "Write test cases, debug router" --agent "antigravity"
```
* **Options:**
  * `-t, --title <title>`: Set/override task title.
  * `-d, --desc <desc>`: Set/override task description.
  * `-r, --remaining <items>`: Comma-separated sisa tugas.
  * `-a, --agent <agent>`: Target assignee (claude / cursor / antigravity / human / any).
  * `-e, --errors <log>`: Paste compiler/linter error messages to let the next agent debug.

### 3. `hz status`
Show the current handoff status, assignee, modified files, and sisa-tugas checklist in your terminal.
```bash
hz status
```

### 4. `hz load`
Print the raw JSON state payload (primarily used internally by MCP agents to ingest context).
```bash
hz load
```

---

## 🗺️ Roadmap & Planned Optimizations

We are actively developing HHP to make it the most advanced AI workflow coordinator. Here is what is planned:

1. **`hz save --shadow-branch` (Shadow Branching):** Automatically creates a shadow Git branch (e.g. `hhp/handoff-temp`) for the receiving agent. Safe, isolated workspace so the agent never breaks your main branch.
2. **`hz lint` (Auto-Check compiler):** Runs ESlist/TS compiler before saving, automatically attaching lint errors to the handoff ticket so the receiving agent knows what to fix.
3. **AST Skeleton Mapping:** Generates a lightweight structural skeleton map of the changed files (signatures, class maps, exports) instead of sending the entire raw code, reducing token usage.
4. **Local Token Tracker & Cost Estimator:** Keeps track of how many tokens are saved during handoffs, letting you know exactly how many dollars you've saved.
5. **Editor State Restoration:** Automatically stores the active editor's open files and cursor positions so the next agent resumes exactly where you focused.

---

## 💛 Support & Donations

If HHP has supercharged your workflow, saved you massive API token costs, and made your development life easier, consider supporting our open-source journey! Your support helps us keep this protocol completely free, optimized, and independent for developers worldwide.

* **Support on PayPal:** [Donate to hamaastaqiy on PayPal](https://paypal.me/hamaastaqiy)

### 📲 Connect with the Author
* **Instagram:** [@hamaastaqiyuddin](https://www.instagram.com/hamaastaqiyuddin)

---

## 📄 License
MIT License. Free to use, modify, and distribute for all developers globally.
