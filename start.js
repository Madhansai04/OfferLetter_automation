import { spawnSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');
const frontendDist = path.join(frontendDir, 'dist');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(path.join(backendDir, 'node_modules'))) {
  console.log('Installing backend dependencies (first run only)...');
  run('npm', ['install'], backendDir);
}

if (!existsSync(path.join(frontendDir, 'node_modules'))) {
  console.log('Installing frontend dependencies (first run only)...');
  run('npm', ['install'], frontendDir);
}

if (!existsSync(frontendDist)) {
  console.log('Building the app (first run only)...');
  run('npm', ['run', 'build'], frontendDir);
}

const port = process.env.PORT || 3001;
const url = `http://localhost:${port}`;

const server = spawn('node', ['server.js'], {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port) }
});

setTimeout(() => {
  const openCommand = process.platform === 'win32'
    ? 'start'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  spawn(openCommand, [url], { shell: true, stdio: 'ignore', detached: true });
}, 1500);

server.on('exit', (code) => process.exit(code ?? 0));
