'use strict';

const { spawnWithRecovery } = require('./processManager');

async function main() {
  console.log('[conservation-technology] Starting...');

  // Example: spawn a worker script; recovery from exit code 3221225785 is
  // handled automatically inside spawnWithRecovery.
  const workerScript = process.argv[2];
  if (!workerScript) {
    console.log('[conservation-technology] No worker script specified. Exiting cleanly.');
    return;
  }

  const code = await spawnWithRecovery(process.execPath, [workerScript]);
  process.exitCode = code;
}

main().catch((err) => {
  console.error('[conservation-technology] Fatal error:', err.message);
  process.exitCode = 1;
});
