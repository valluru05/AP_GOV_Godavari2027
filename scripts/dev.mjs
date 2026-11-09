#!/usr/bin/env node

/**
 * CivicProof Dev Server Orchestrator
 * Runs both FastAPI backend (port 8008) and Vite frontend (port 5173) concurrently
 * with single command: `npm run dev`
 */

import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const FRONTEND_DIR = resolve(ROOT_DIR, 'frontend');
const BACKEND_DIR = resolve(ROOT_DIR, 'backend');

// CLI Flags
const args = process.argv.slice(2);
const backendOnly = args.includes('--backend-only');
const frontendOnly = args.includes('--frontend-only');

// Terminal ANSI styling
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const RED_ORANGE = '\x1b[38;5;208m'; // Pushkaralu Saffron / Red-Orange
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

function getPythonExecutable() {
  const venvPythonUnix = join(ROOT_DIR, '.venv', 'bin', 'python');
  const venvPythonWin = join(ROOT_DIR, '.venv', 'Scripts', 'python.exe');
  const altVenvUnix = join(ROOT_DIR, 'venv', 'bin', 'python');
  const altVenvWin = join(ROOT_DIR, 'venv', 'Scripts', 'python.exe');

  if (existsSync(venvPythonUnix)) return venvPythonUnix;
  if (existsSync(venvPythonWin)) return venvPythonWin;
  if (existsSync(altVenvUnix)) return altVenvUnix;
  if (existsSync(altVenvWin)) return altVenvWin;

  if (process.env.VIRTUAL_ENV) {
    const activePyUnix = join(process.env.VIRTUAL_ENV, 'bin', 'python');
    const activePyWin = join(process.env.VIRTUAL_ENV, 'Scripts', 'python.exe');
    if (existsSync(activePyUnix)) return activePyUnix;
    if (existsSync(activePyWin)) return activePyWin;
  }

  return 'python3';
}

function checkPort(port) {
  return new Promise((res) => {
    const s = net.createServer();
    s.once('error', (err) => {
      res(err.code === 'EADDRINUSE');
    });
    s.once('listening', () => {
      s.close(() => res(false));
    });
    s.listen(port, '127.0.0.1');
  });
}

function tryFreePort(port) {
  try {
    if (process.platform === 'win32') {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`, { stdio: 'ignore' });
    } else {
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
    }
  } catch {
    // Process might be owned by another session or protected
  }
}

function printBanner() {
  console.log(`
${BOLD}${RED_ORANGE}========================================================================${RESET}
${BOLD}${RED_ORANGE}  CIVICPROOF  —  SRI GODAVARI PUSHKARALU 2027 INFRASTRUCTURE PLATFORM  ${RESET}
${BOLD}${RED_ORANGE}========================================================================${RESET}
  ${GREEN}✓${RESET} ${BOLD}Mode:${RESET}         Unified Development Server (Frontend + Backend)
  ${CYAN}➜${RESET} ${BOLD}Web Portal:${RESET}   ${BOLD}http://localhost:5173${RESET}
  ${RED_ORANGE}➜${RESET} ${BOLD}FastAPI Docs:${RESET} ${BOLD}http://127.0.0.1:8008/docs${RESET}
  ${YELLOW}➜${RESET} ${BOLD}Health Check:${RESET} ${BOLD}http://127.0.0.1:8008/health${RESET}
${DIM}------------------------------------------------------------------------${RESET}
${DIM}Press [Ctrl+C] to stop both servers simultaneously.${RESET}
${BOLD}${RED_ORANGE}========================================================================${RESET}
`);
}

const childProcesses = [];

function streamOutput(prefix, stream, color) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${color}${BOLD}${prefix}${RESET} ${line}`);
      }
    }
  });
  stream.on('end', () => {
    if (buffer.trim().length > 0) {
      console.log(`${color}${BOLD}${prefix}${RESET} ${buffer}`);
    }
  });
}

async function startBackend() {
  const inUse = await checkPort(8008);
  if (inUse) {
    tryFreePort(8008);
    await new Promise((r) => setTimeout(r, 400));
  }

  const stillInUse = await checkPort(8008);
  if (stillInUse) {
    console.log(`${YELLOW}${BOLD}[BACKEND]${RESET} Port 8008 is currently active and serving. Connecting frontend to active backend at http://127.0.0.1:8008.`);
    return null;
  }

  const pythonBin = getPythonExecutable();
  console.log(`${RED_ORANGE}${BOLD}[BACKEND]${RESET} Launching uvicorn on http://127.0.0.1:8008 via ${DIM}${pythonBin}${RESET}...`);

  const env = {
    ...process.env,
    PYTHONPATH: BACKEND_DIR,
    PYTHONUNBUFFERED: '1',
  };

  const proc = spawn(
    pythonBin,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8008', '--reload'],
    {
      cwd: ROOT_DIR,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  streamOutput('[BACKEND]', proc.stdout, RED_ORANGE);
  streamOutput('[BACKEND]', proc.stderr, RED_ORANGE);

  proc.on('close', (code, signal) => {
    if (code !== null && code !== 0) {
      console.log(`${RED_ORANGE}${BOLD}[BACKEND]${RESET} Process ended (code ${code ?? signal})`);
    }
  });

  childProcesses.push(proc);
  return proc;
}

async function startFrontend() {
  const inUse = await checkPort(5173);
  if (inUse) {
    tryFreePort(5173);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`${CYAN}${BOLD}[FRONTEND]${RESET} Launching Vite dev server on http://localhost:5173...`);

  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  const proc = spawn(npmCmd, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: FRONTEND_DIR,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  streamOutput('[FRONTEND]', proc.stdout, CYAN);
  streamOutput('[FRONTEND]', proc.stderr, CYAN);

  proc.on('close', (code, signal) => {
    if (code !== null && code !== 0) {
      console.log(`${CYAN}${BOLD}[FRONTEND]${RESET} Process ended (code ${code ?? signal})`);
    }
  });

  childProcesses.push(proc);
  return proc;
}

// Graceful termination
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${YELLOW}${BOLD}Shutting down CivicProof servers (${signal})...${RESET}`);

  for (const proc of childProcesses) {
    try {
      proc.kill('SIGTERM');
    } catch {
      // ignore
    }
  }

  setTimeout(() => {
    for (const proc of childProcesses) {
      try {
        proc.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
    process.exit(0);
  }, 1500).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Execution start
printBanner();

if (!frontendOnly) {
  await startBackend();
}

if (!backendOnly) {
  await startFrontend();
}
