const { execSync } = require('child_process');

const ports = [3201, 5181];

function getPidsForPort(port) {
  try {
    const output = execSync(`lsof -ti tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!output) return [];
    return [...new Set(output.split('\n').map((pid) => pid.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

let killedAny = false;

for (const port of ports) {
  const pids = getPidsForPort(port);

  if (pids.length === 0) {
    console.log(`Port ${port} is already clear.`);
    continue;
  }

  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGTERM');
      killedAny = true;
      console.log(`Stopped process ${pid} on port ${port}.`);
    } catch (err) {
      console.error(`Could not stop process ${pid} on port ${port}: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

if (!killedAny && process.exitCode !== 1) {
  console.log('No dev servers were running.');
}
