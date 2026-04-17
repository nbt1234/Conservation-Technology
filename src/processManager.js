'use strict';

const { spawn } = require('child_process');
const { execSync } = require('child_process');

// Windows NTSTATUS 0xC0000139: a native addon (.node file) was compiled for a
// different Node.js version — the DLL entry point no longer exists.
const STATUS_ENTRYPOINT_NOT_FOUND = 3221225785;

function describeExitCode(code) {
  if (code === STATUS_ENTRYPOINT_NOT_FOUND) {
    return (
      'Exit code 3221225785 (0xC0000139 STATUS_ENTRYPOINT_NOT_FOUND): ' +
      'a native Node.js addon was compiled for a different Node.js version. ' +
      'Run `npm rebuild` to recompile native modules for the current runtime.'
    );
  }
  return `Process exited with code ${code}`;
}

function rebuildNativeModules() {
  console.log('[processManager] Rebuilding native modules with `npm rebuild`...');
  try {
    execSync('npm rebuild', { stdio: 'inherit', cwd: process.cwd() });
    console.log('[processManager] Rebuild complete.');
    return true;
  } catch (err) {
    console.error('[processManager] Rebuild failed:', err.message);
    return false;
  }
}

/**
 * Spawns a child process and handles exit code 3221225785 by automatically
 * rebuilding native modules and retrying once.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {object} [options]
 * @returns {Promise<number>} resolved exit code
 */
function spawnWithRecovery(command, args = [], options = {}, _retried = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === STATUS_ENTRYPOINT_NOT_FOUND && !_retried) {
        console.error(`[processManager] ${describeExitCode(code)}`);
        const rebuilt = rebuildNativeModules();
        if (rebuilt) {
          console.log('[processManager] Retrying process after rebuild...');
          spawnWithRecovery(command, args, options, true).then(resolve).catch(reject);
        } else {
          reject(new Error(describeExitCode(code)));
        }
        return;
      }

      if (code !== 0) {
        console.error(`[processManager] ${describeExitCode(code)}`);
      }

      resolve(code);
    });
  });
}

module.exports = { spawnWithRecovery, describeExitCode, STATUS_ENTRYPOINT_NOT_FOUND };
