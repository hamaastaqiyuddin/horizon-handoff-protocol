import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface HandoffState {
  version: string;
  timestamp: string;
  task: {
    title: string;
    description: string;
    status: 'pending' | 'completed' | 'in_progress';
    remainingTasks: string[];
  };
  context: {
    gitBranch: string;
    lastCommit: string;
    gitDiff: string;
    filesModified: string[];
    compilerErrors: string;
  };
  variables: Record<string, any>;
  metadata: {
    lastAgent: string;
    nextAgent: string;
    os: string;
  };
}

const HORIZON_DIR = '.horizon';
const STATE_FILE = 'state.json';
const HANDOFF_MD = 'handoff.md';

function getGitInfo(): { branch: string; commit: string; diff: string; files: string[] } {
  try {
    // Check if git is initialized
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

    const branch = execSync('git branch --show-current').toString().trim();
    const commit = execSync('git log -1 --format=%h').toString().trim();

    // Optimize tokens: exclude lockfiles, compiled artifacts, and binary assets
    const excludePatterns = [
      "':!package-lock.json'",
      "':!pnpm-lock.yaml'",
      "':!yarn.lock'",
      "':!node_modules/*'",
      "':!dist/*'",
      "':!build/*'",
      "':!*.png'",
      "':!*.jpg'",
      "':!*.jpeg'",
      "':!*.gif'",
      "':!*.ico'",
      "':!*.pdf'",
      "':!*.zip'",
      "':!*.tar.gz'"
    ].join(' ');

    const diff = execSync(`git diff HEAD -- . ${excludePatterns}`).toString().trim();
    
    const statusOutput = execSync('git status --porcelain').toString().trim();
    
    const isExcluded = (file: string) => {
      const excludedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar.gz'];
      const excludedFiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
      const excludedDirs = ['node_modules/', 'dist/', 'build/'];
      
      return (
        excludedFiles.includes(file) ||
        excludedExtensions.some(ext => file.endsWith(ext)) ||
        excludedDirs.some(dir => file.startsWith(dir) || file.includes(`/${dir}`))
      );
    };

    const files = statusOutput
      ? statusOutput
          .split('\n')
          .map(line => line.substring(3).trim())
          .filter(file => !isExcluded(file))
      : [];

    return { branch, commit, diff, files };
  } catch (error) {
    return { branch: 'none', commit: 'none', diff: '', files: [] };
  }
}

export function initState(projectPath: string): void {
  const targetDir = path.join(projectPath, HORIZON_DIR);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const statePath = path.join(targetDir, STATE_FILE);
  if (!fs.existsSync(statePath)) {
    const defaultState: HandoffState = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      task: {
        title: 'Initial Project State',
        description: 'Horizon Handoff Protocol initialized.',
        status: 'pending',
        remainingTasks: []
      },
      context: {
        gitBranch: 'main',
        lastCommit: 'none',
        gitDiff: '',
        filesModified: [],
        compilerErrors: ''
      },
      variables: {},
      metadata: {
        lastAgent: 'human',
        nextAgent: 'any',
        os: process.platform
      }
    };
    fs.writeFileSync(statePath, JSON.stringify(defaultState, null, 2), 'utf8');
  }

  const gitignorePath = path.join(targetDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    // We want to commit the templates and metadata, but maybe ignore state cache or local temporary logs if any.
    // Usually, .horizon/state.json and handoff.md SHOULD be committed so the other agent can pull it via Git!
    // So we don't ignore them. We can leave .gitignore empty or put temporary cache there.
    fs.writeFileSync(gitignorePath, '# Local horizon cache\n# state.json and handoff.md should be tracked in Git for handoffs\n', 'utf8');
  }
}

export function readState(projectPath: string): HandoffState {
  const statePath = path.join(projectPath, HORIZON_DIR, STATE_FILE);
  if (!fs.existsSync(statePath)) {
    initState(projectPath);
  }
  const content = fs.readFileSync(statePath, 'utf8');
  return JSON.parse(content);
}

export function saveState(projectPath: string, state: Partial<HandoffState>): HandoffState {
  const targetDir = path.join(projectPath, HORIZON_DIR);
  if (!fs.existsSync(targetDir)) {
    initState(projectPath);
  }

  const currentState = readState(projectPath);
  const gitInfo = getGitInfo();

  const updatedState: HandoffState = {
    ...currentState,
    ...state,
    timestamp: new Date().toISOString(),
    task: {
      ...currentState.task,
      ...(state.task || {})
    },
    context: {
      ...currentState.context,
      ...(state.context || {}),
      gitBranch: gitInfo.branch,
      lastCommit: gitInfo.commit,
      gitDiff: gitInfo.diff,
      filesModified: gitInfo.files
    },
    variables: {
      ...currentState.variables,
      ...(state.variables || {})
    },
    metadata: {
      ...currentState.metadata,
      ...(state.metadata || {}),
      os: process.platform
    }
  };

  const statePath = path.join(targetDir, STATE_FILE);
  fs.writeFileSync(statePath, JSON.stringify(updatedState, null, 2), 'utf8');

  // Regenerate handoff.md
  generateHandoffMarkdown(projectPath, updatedState);

  return updatedState;
}

function generateHandoffMarkdown(projectPath: string, state: HandoffState): void {
  const markdown = `# Horizon Handoff Protocol (HHP) Ticket
**Generated on:** ${state.timestamp} | **OS:** ${state.metadata.os}
**Git Branch:** \`${state.context.gitBranch}\` (Commit: \`${state.context.lastCommit}\`)

---

## 📋 Task: ${state.task.title}
> ${state.task.description}

### Remaining Checklist:
${state.task.remainingTasks.map(t => `- [ ] ${t}`).join('\n') || '- None'}

---

## 🛠️ Codebase State

### Modified Files:
${state.context.filesModified.map(f => `* \`${f}\``).join('\n') || '* No files modified.'}

${state.context.gitDiff ? `
### Git Diff (Summary):
\`\`\`diff
${state.context.gitDiff.substring(0, 5000)}${state.context.gitDiff.length > 5000 ? '\n... (truncated for context compression) ...' : ''}
\`\`\`
` : ''}

${state.context.compilerErrors ? `
### ⚠️ Compiler/Lint Errors:
\`\`\`
${state.context.compilerErrors}
\`\`\`
` : ''}

---

## 🧠 Shared Memory Variables
\`\`\`json
${JSON.stringify(state.variables, null, 2)}
\`\`\`

---

## 🚀 Transition Metadata
* **Last Active Agent:** \`${state.metadata.lastAgent}\`
* **Target Handover Agent:** \`${state.metadata.nextAgent}\`

> [!TIP]
> **Instructions for the receiving Agent:**
> 1. Read the modified files above.
> 2. Fix any compiler/lint errors listed.
> 3. Complete the remaining checklist items.
> 4. Once finished, run the \`hz save\` tool or call \`save_handoff\` to yield control back.
`;

  const mdPath = path.join(projectPath, HORIZON_DIR, HANDOFF_MD);
  fs.writeFileSync(mdPath, markdown, 'utf8');
}
