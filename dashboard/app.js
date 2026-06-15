// Local Dashboard Script
const API_BASE = window.location.origin;

// DOM Elements
const elMessageList = document.getElementById('message-list');
const elTaskList = document.getElementById('task-list');
const elMemoryList = document.getElementById('memory-list');

const elMessageCount = document.getElementById('message-count');
const elTaskCount = document.getElementById('task-count');
const elMemoryCount = document.getElementById('memory-count');

const elGeminiCost = document.getElementById('stat-gemini-cost');
const elClaudeCost = document.getElementById('stat-claude-cost');
const elSavings = document.getElementById('stat-savings');
const elGeminiTokens = document.getElementById('stat-gemini-tokens');
const elClaudeTokens = document.getElementById('stat-claude-tokens');
const elBarGemini = document.getElementById('bar-gemini');
const elBarClaude = document.getElementById('bar-claude');

const nodeAntigravity = document.getElementById('node-antigravity');
const nodeClaude = document.getElementById('node-claude');
const nodeHorizon = document.getElementById('node-horizon');

const pulseLeft = document.getElementById('pulse-left');
const pulseRight = document.getElementById('pulse-right');

// Initial State
let messages = [];
let tasks = [];
let memories = {};

// ----------------------------------------------------
// UI Renderers
// ----------------------------------------------------

function renderMessages() {
  if (messages.length === 0) {
    elMessageList.innerHTML = `<div class="empty-state">No conversation logs yet. Waiting for agents to call send_message...</div>`;
    elMessageCount.textContent = '0';
    return;
  }

  elMessageCount.textContent = messages.length.toString();
  elMessageList.innerHTML = messages.map(msg => {
    const isGemini = msg.sender === 'antigravity';
    const bubbleClass = isGemini ? 'from-gemini' : 'from-claude';
    const senderName = isGemini ? 'Antigravity (Gemini)' : 'Claude';
    const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
      <div class="message-bubble ${bubbleClass}">
        <div class="msg-meta">
          <span>${senderName}</span>
          <span>${formattedTime}</span>
        </div>
        <div class="msg-text">${escapeHtml(msg.content)}</div>
        ${msg.replyToId ? `<div class="msg-reply-info">Replying to msg: ${msg.replyToId}</div>` : ''}
      </div>
    `;
  }).join('');
  elMessageList.scrollTop = elMessageList.scrollHeight;
}

function renderTasks() {
  if (tasks.length === 0) {
    elTaskList.innerHTML = `<div class="empty-state">No active subtasks. Use create_task to delegate.</div>`;
    elTaskCount.textContent = '0';
    return;
  }

  elTaskCount.textContent = tasks.length.toString();
  elTaskList.innerHTML = tasks.map(task => {
    const isGemini = task.assignee === 'antigravity';
    const assigneeLabel = isGemini ? 'Antigravity' : 'Claude';
    const assigneeClass = isGemini ? 'gemini' : 'claude';
    const formattedDate = new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="task-item" id="task-card-${task.id}">
        <div class="task-title-row">
          <h4>${escapeHtml(task.title)}</h4>
          <span class="task-status-badge ${task.status}">${task.status.replace('_', ' ')}</span>
        </div>
        <div class="task-desc">${escapeHtml(task.description)}</div>
        
        ${task.output ? `<div class="task-output">${escapeHtml(task.output)}</div>` : ''}

        <div class="task-footer">
          <div class="task-assignee ${assigneeClass}">
            <span class="dot"></span>
            <span>Assignee: ${assigneeLabel}</span>
          </div>
          <span>Ref: ${task.id} | ${formattedDate}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderMemory() {
  const keys = Object.keys(memories);
  if (keys.length === 0) {
    elMemoryList.innerHTML = `<div class="empty-state">Shared variables list is empty.</div>`;
    elMemoryCount.textContent = '0';
    return;
  }

  elMemoryCount.textContent = keys.length.toString();
  elMemoryList.innerHTML = keys.map(key => {
    return `
      <div class="memory-item">
        <span class="memory-key">${escapeHtml(key)}</span>
        <span class="memory-value">${escapeHtml(memories[key])}</span>
      </div>
    `;
  }).join('');
}

function updateStats(statsData) {
  let geminiCost = 0;
  let claudeCost = 0;
  let geminiTokens = 0;
  let claudeTokens = 0;

  // Aggregate stats
  statsData.forEach(item => {
    if (item.agent === 'antigravity') {
      geminiCost = item.total_cost;
      geminiTokens = item.total_prompt + item.total_completion;
    } else if (item.agent === 'claude') {
      claudeCost = item.total_cost;
      claudeTokens = item.total_prompt + item.total_completion;
    }
  });

  // Calculate savings:
  // If we had routed Gemini's massive prompt tokens to Claude, what would it cost?
  // Let's assume we saved money by running large contexts in Gemini.
  // We estimate Claude equivalent cost of Gemini tokens (which is $3/M instead of $1.25/M).
  // So savings = GeminiTokens * ($3.00 - $1.25)/1,000,000.
  const diffRatePerMillion = (3.0 - 1.25);
  const estimatedSavings = (geminiTokens / 1_000_000) * diffRatePerMillion;

  elGeminiCost.textContent = `$${geminiCost.toFixed(4)}`;
  elClaudeCost.textContent = `$${claudeCost.toFixed(4)}`;
  elSavings.textContent = `$${estimatedSavings.toFixed(4)}`;

  elGeminiTokens.textContent = `${geminiTokens.toLocaleString()} tkn`;
  elClaudeTokens.textContent = `${claudeTokens.toLocaleString()} tkn`;

  // Update progress bars relative to each other
  const totalTokens = geminiTokens + claudeTokens;
  if (totalTokens > 0) {
    elBarGemini.style.width = `${(geminiTokens / totalTokens) * 100}%`;
    elBarClaude.style.width = `${(claudeTokens / totalTokens) * 100}%`;
  } else {
    elBarGemini.style.width = '0%';
    elBarClaude.style.width = '0%';
  }
}

// ----------------------------------------------------
// Animation Trigger Helpers
// ----------------------------------------------------

function animateFlow(direction) {
  // Clear any existing animation classes
  pulseLeft.className = 'pulse-dot';
  pulseRight.className = 'pulse-dot';
  
  nodeHorizon.classList.add('active-pulse');
  
  if (direction === 'gemini_to_claude') {
    nodeAntigravity.classList.add('active-gemini-pulse');
    pulseLeft.classList.add('pulse-left-to-right');
    
    // Delayed pulse to second line segment
    setTimeout(() => {
      pulseRight.classList.add('pulse-left-to-right');
      nodeClaude.classList.add('active-claude-pulse');
    }, 750);
  } else if (direction === 'claude_to_gemini') {
    nodeClaude.classList.add('active-claude-pulse');
    pulseRight.classList.add('pulse-right-to-left');
    
    // Delayed pulse to first line segment
    setTimeout(() => {
      pulseLeft.classList.add('pulse-right-to-left');
      nodeAntigravity.classList.add('active-gemini-pulse');
    }, 750);
  }

  // Remove glows after animation cycle
  setTimeout(() => {
    nodeAntigravity.classList.remove('active-gemini-pulse');
    nodeClaude.classList.remove('active-claude-pulse');
    nodeHorizon.classList.remove('active-pulse');
  }, 2000);
}

// ----------------------------------------------------
// Data Loading & Websockets
// ----------------------------------------------------

async function fetchInitialState() {
  try {
    const resMsgs = await fetch(`${API_BASE}/api/messages`);
    messages = await resMsgs.json();
    renderMessages();

    const resTasks = await fetch(`${API_BASE}/api/tasks`);
    tasks = await resTasks.json();
    renderTasks();

    const resMemory = await fetch(`${API_BASE}/api/memory`);
    const memoryArr = await resMemory.json();
    memories = {};
    memoryArr.forEach(m => { memories[m.key] = m.value; });
    renderMemory();

    const resStats = await fetch(`${API_BASE}/api/stats`);
    const statsObj = await resStats.json();
    updateStats(statsObj.stats);
  } catch (err) {
    console.error('Failed to fetch initial state:', err);
  }
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('Connected to Horizon Agent WebSocket.');
  };

  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    const { type, data } = payload;

    switch (type) {
      case 'message':
        messages.push(data);
        renderMessages();
        // Trigger flow line animations
        if (data.sender === 'antigravity') {
          animateFlow('gemini_to_claude');
        } else {
          animateFlow('claude_to_gemini');
        }
        break;

      case 'message_read':
        const unread = messages.find(m => m.id === data);
        if (unread) {
          unread.read = true;
        }
        break;

      case 'task':
        tasks.unshift(data); // Add new tasks to the top
        renderTasks();
        if (data.assignee === 'claude') {
          animateFlow('gemini_to_claude');
        } else {
          animateFlow('claude_to_gemini');
        }
        break;

      case 'task_update':
        const task = tasks.find(t => t.id === data.id);
        if (task) {
          task.status = data.status;
          task.output = data.output || task.output;
          task.updatedAt = data.updatedAt;
          renderTasks();
        }
        break;

      case 'memory':
        memories[data.key] = data.value;
        renderMemory();
        break;

      case 'token_stats':
        updateStats(data.stats);
        break;

      case 'routing_recommendation':
        // Show active pulses
        if (data.recommendedAgent === 'claude') {
          animateFlow('gemini_to_claude');
        } else {
          animateFlow('claude_to_gemini');
        }
        break;
    }
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed. Retrying in 3 seconds...');
    setTimeout(connectWebSocket, 3000);
  };
}

// ----------------------------------------------------
// Utilities
// ----------------------------------------------------

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start
fetchInitialState();
connectWebSocket();
