const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const validProfiles = new Set(['development', 'production', 'test']);
const profile = process.argv[2];
const separatorIndex = process.argv.indexOf('--');

if (!validProfiles.has(profile) || separatorIndex === -1 || separatorIndex === process.argv.length - 1) {
  console.error('Usage: node scripts/run-with-env.js <development|production|test> -- <command> [args...]');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const command = process.argv[separatorIndex + 1];
const args = process.argv.slice(separatorIndex + 2);
const nodeEnv = profile === 'production' ? 'production' : profile === 'test' ? 'test' : 'development';

const expectedFiles = [
  path.join(root, 'backend', `.env.${profile}`),
  path.join(root, 'frontend', `.env.${profile}`),
];
const missingFiles = expectedFiles.filter((file) => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.warn(`Missing profile file(s): ${missingFiles.map((file) => path.relative(root, file)).join(', ')}`);
  console.warn('Using existing environment variables and any fallback .env files.');
}

function quoteForShell(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

const commandLine = [command, ...args].map(quoteForShell).join(' ');

const spawnCommand = process.platform === 'win32' ? commandLine : command;
const spawnArgs = process.platform === 'win32' ? [] : args;

const child = spawn(spawnCommand, spawnArgs, {
  cwd: root,
  env: {
    ...process.env,
    APP_ENV: profile,
    NODE_ENV: nodeEnv,
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
