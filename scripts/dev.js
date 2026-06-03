const { spawn, spawnSync } = require('child_process');
const net = require('net');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'Java Drip', 'backend');
const portChecks = [
  { name: 'backend', port: 3201, hosts: ['127.0.0.1', '::1'] },
  { name: 'frontend', port: 5181, hosts: ['127.0.0.1', '::1'] }
];
const projects = [
  {
    name: 'backend',
    cwd: backendDir,
    color: '\x1b[33m',
  },
  {
    name: 'frontend',
    cwd: path.join(rootDir, 'Java Drip', 'frontend'),
    color: '\x1b[36m',
  }
];

const reset = '\x1b[0m';
const children = [];
let shuttingDown = false;

function runCommand(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'utf8',
  });
}

function ensureBackendNativeModules() {
  const check = runCommand(
    'node',
    ['-e', 'const Database = require("better-sqlite3"); const db = new Database(":memory:"); db.prepare("select 1").get(); db.close(); console.log("better-sqlite3 ok")'],
    backendDir
  );

  if (check.status === 0) return;

  const output = `${check.stdout || ''}\n${check.stderr || ''}`;
  const hasNativeMismatch =
    output.includes('NODE_MODULE_VERSION') ||
    output.includes('ERR_DLOPEN_FAILED') ||
    output.includes('better_sqlite3.node');

  if (!hasNativeMismatch) {
    process.stderr.write(output);
    throw new Error('Backend dependency check failed before startup.');
  }

  console.log('Rebuilding better-sqlite3 for the current Node version...');
  const rebuild = runCommand('npm', ['rebuild', 'better-sqlite3'], backendDir);

  if (rebuild.stdout) process.stdout.write(rebuild.stdout);
  if (rebuild.stderr) process.stderr.write(rebuild.stderr);

  if (rebuild.status !== 0) {
    throw new Error(
      'Could not rebuild better-sqlite3 for the current Node version. ' +
      'Run `cd "Java Drip/backend" && npm install` and try again.'
    );
  }
}

function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      resolve(err.code !== 'EADDRINUSE');
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function isPortBlocked(port, hosts) {
  for (const host of hosts) {
    const available = await isPortAvailable(port, host);
    if (!available) return true;
  }

  return false;
}

function prefixOutput(name, color, stream, chunk) {
  const lines = chunk.toString().split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    stream.write(`${color}[${name}]${reset} ${line}\n`);
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }

  setTimeout(() => process.exit(exitCode), 100);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  ensureBackendNativeModules();

  for (const check of portChecks) {
    const blocked = await isPortBlocked(check.port, check.hosts);
    if (blocked) {
      console.error(
        `Port ${check.port} is already in use, so the ${check.name} dev server cannot start cleanly. ` +
        `Stop the existing process on that port and run npm run dev again.`
      );
      process.exit(1);
    }
  }

  for (const project of projects) {
    const child = spawn('npm', ['run', 'dev'], {
      cwd: project.cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      env: process.env,
    });

    children.push(child);

    child.stdout.on('data', (chunk) => prefixOutput(project.name, project.color, process.stdout, chunk));
    child.stderr.on('data', (chunk) => prefixOutput(project.name, project.color, process.stderr, chunk));

    child.on('exit', (code) => {
      if (shuttingDown) return;

      if (code !== 0) {
        console.error(`${project.color}[${project.name}]${reset} exited with code ${code}`);
        shutdown(code || 1);
        return;
      }

      shutdown(0);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
