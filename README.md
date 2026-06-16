# Horizon Handoff Protocol (HHP)

> **Unlock the True Power of Multi-Agent Programming!** 🚀
> 
> Are you tired of being locked into a single AI model's walled garden? Do you want to orchestrate Claude's brilliant analytical coding precision alongside Gemini's massive 2-million context window seamlessly—without manual copy-pasting, and without wasting thousands of tokens on idle background polling?
> 
> Welcome to **Horizon Handoff Protocol (HHP)**! HHP is the ultimate, open-source, stateless Git-Ops developer tool that bridges the gap between independent AI systems. It is designed to save your hard-earned tokens, respect your CPU resources, and supercharge your collaborative coding workflows. Let's build the future, faster and smarter!

---

## ⚡ Supercharged Benefits: Why You Should Try It Today!

If you are coding with AI agents, HHP is a game-changer. Here is what you get out of the box:

* 🚀 **100% Zero-Daemon, Zero-Token Waste:** No background database servers, no idle processes, and zero polling. HHP runs on-demand and consumes **0 idle tokens** and **0 idle CPU**. Your token quota is spent purely on actual coding tasks!
* ⚡ **Estafet Tanpa Copy-Paste (Instant Handoff):** Running out of Claude tokens? Simply type `resume` in Antigravity or Cursor. The next agent immediately inherits the sisa-tugas checklist, modified files, and variables in less than a second.
* 🧠 **Cognitive Context Compression:** Our smart Git-Ops integration harvests only the relevant git diffs, files modified, and compiler errors. No bloated prompt histories, saving you up to **90% on input tokens**!
* 🛡️ **Git-Ops Safe & Branch-Ready:** Track every single agent transition natively inside your Git branches. Safe, versioned, and completely developer-friendly.
* 🔌 **Model & IDE Agnostic:** Exposes standard MCP tools so it plugs right into Claude Desktop, Cursor, Windsurf, or VS Code. It is the universal "USB-C" port for AI agent memory!

---

## 🚀 How It Works

```
[Claude Desktop] ──► `hz save` ──► [.horizon/state.json] ──► `hz load` ──► [Antigravity IDE]
 (Sonnet 3.5)                     (Handoff Ticket & Diff)                (Gemini Pro)
```

1. **Save:** Claude finishes writing a module or runs out of tokens. It runs the `save_handoff` tool (or you run `hz save`).
2. **State:** A `.horizon/state.json` (metadata) and a human-readable `.horizon/handoff.md` are generated locally in your project.
3. **Load:** You open Antigravity (or another IDE chat panel) and type `resume`. The agent calls `load_handoff` (or you run `hz load`) to inherit the exact sisa-tugas checklist, files modified, and target goals.

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

#### For Antigravity (`mcp_config.json`):
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
  * `-a, --agent <agent>`: Target assignee (claude / antigravity / human / any).
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

## 💛 Support & Donations

If HHP has supercharged your workflow, saved you massive API token costs, and made your development life easier, consider supporting our open-source journey! Your support helps us keep this protocol completely free, optimized, and independent for developers worldwide.

* **Support on PayPal:** [Donate to hamaastaq on PayPal](https://paypal.me/hamaastaq)

---

## 📄 License
MIT License. Free to use, modify, and distribute for all developers globally.
