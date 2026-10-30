#!/usr/bin/env node
/**
 * Downloads the Obscura build for this OS, starts `obscura serve`, then runs the
 * test command that follows `--`. Stops the server when that command exits.
 * A later run reuses the binary already stored under the user home directory.
 * If something is already listening on the CDP port, that server is left running.
 */

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

const releaseBase = 'https://github.com/h4ckf0r0day/obscura/releases/latest/download';

/** @type {Record<string, string>} */
const assets = {
  'win32:x64': 'obscura-x86_64-windows.zip',
  'darwin:arm64': 'obscura-aarch64-macos.tar.gz',
  'darwin:x64': 'obscura-x86_64-macos.tar.gz',
  'linux:x64': 'obscura-x86_64-linux.tar.gz',
  'linux:arm64': 'obscura-aarch64-linux.tar.gz'
};

/**
 * Port from `OBSCURA_CDP_URL` when it is a WebSocket URL; otherwise 9222.
 * @returns {string}
 */
function resolvePort() {
  const fromEnv = process.env.OBSCURA_CDP_URL?.trim();
  if (!fromEnv) {
    return '9222';
  }
  try {
    return new URL(fromEnv).port || '9222';
  } catch {
    return '9222';
  }
}

/**
 * Downloads a URL, following redirects, into `destination`.
 * @param {string} url
 * @param {string} destination
 * @returns {Promise<void>}
 */
function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if (status >= 300 && status < 400 && location) {
        response.resume();
        download(new URL(location, url).href, destination).then(resolve, reject);
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error(`Download failed (${status}) for ${url}`));
        return;
      }
      const file = createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    });
    request.on('error', reject);
  });
}

/**
 * Runs a command and resolves when it exits with code 0.
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? 1}`));
    });
  });
}

/**
 * Finds `obscura.exe` on Windows or `obscura` on other systems.
 * @param {string} directory
 * @returns {Promise<string | null>}
 */
async function findBinary(directory) {
  const wanted = process.platform === 'win32' ? 'obscura.exe' : 'obscura';
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findBinary(fullPath);
      if (nested) {
        return nested;
      }
    } else if (entry.name === wanted) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Downloads and extracts the Obscura archive for this machine.
 * @param {string} installDir
 * @param {string} asset
 * @returns {Promise<string>}
 */
async function installObscura(installDir, asset) {
  const archivePath = path.join(installDir, asset);
  console.log(`Downloading ${asset} for ${process.platform} ${process.arch}...`);
  await download(`${releaseBase}/${asset}`, archivePath);

  const extractArgs = asset.endsWith('.zip')
    ? ['-xf', archivePath, '-C', installDir]
    : ['-xzf', archivePath, '-C', installDir];
  await run('tar', extractArgs);

  const executable = await findBinary(installDir);
  if (!executable) {
    throw new Error(`Obscura binary was not found under ${installDir}`);
  }

  if (process.platform !== 'win32') {
    await fs.chmod(executable, 0o755);
  }
  if (process.platform === 'darwin') {
    await run('xattr', ['-d', 'com.apple.quarantine', executable]).catch(() => undefined);
  }
  return executable;
}

/**
 * Arguments after the first `--` are the test command. npm appends extra args to that command.
 * @param {string[]} argv
 * @returns {string[] | null}
 */
function testCommand(argv) {
  const separator = argv.indexOf('--');
  if (separator === -1) {
    return null;
  }
  const command = argv.slice(separator + 1);
  return command.length > 0 ? command : null;
}

/**
 * @param {string} port
 * @returns {Promise<boolean>}
 */
function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: Number(port), host: '127.0.0.1' });
    const finish = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * @param {string} executable
 * @param {string} port
 * @returns {{ child: import('node:child_process').ChildProcess, logs: () => string }}
 */
function startServer(executable, port) {
  const child = spawn(executable, ['serve', '--port', port], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  let output = '';
  const append = (chunk) => {
    output = `${output}${chunk.toString()}`.slice(-4000);
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);
  return { child, logs: () => output };
}

/**
 * @param {string} port
 * @param {{ child: import('node:child_process').ChildProcess, logs: () => string }} server
 * @returns {Promise<void>}
 */
async function waitForPort(port, server) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`Obscura exited before listening on port ${port}.\n${server.logs()}`);
    }
    if (await canConnect(port)) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Obscura did not listen on port ${port} within 30s.\n${server.logs()}`);
}

/**
 * @param {import('node:child_process').ChildProcess} child
 */
function stopServer(child) {
  if (!child.pid || child.exitCode !== null) {
    return;
  }
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    return;
  }
  child.kill('SIGTERM');
}

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<number>}
 */
function runCommand(command, args) {
  const executable = command === 'node' ? process.execPath : command;
  return new Promise((resolve) => {
    const child = spawn(executable, args, { stdio: 'inherit', cwd: rootDir, env: process.env });
    child.on('error', (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

/**
 * Starts Obscura when the CDP port is closed, runs the test command, then stops a server this process started.
 * @returns {Promise<number>}
 */
async function main() {
  const asset = assets[`${process.platform}:${process.arch}`];
  if (!asset) {
    throw new Error(
      `No Obscura build for ${process.platform} ${process.arch}. ` +
        'Supported: Windows x64, macOS Apple Silicon, macOS Intel, Linux x64, and Linux ARM64.'
    );
  }

  const port = resolvePort();
  const command = testCommand(process.argv);
  if (!command) {
    throw new Error(
      'Pass the test command after --. Example: node scripts/start-obscura.mjs -- node scripts/run-with-report.mjs --project=obscura'
    );
  }

  /** @type {{ child: import('node:child_process').ChildProcess, logs: () => string } | null} */
  let started = null;
  try {
    if (await canConnect(port)) {
      console.log(`Obscura is already listening on port ${port}.`);
    } else {
      const installDir = path.join(os.homedir(), '.obscura');
      await fs.mkdir(installDir, { recursive: true });
      const existing = await findBinary(installDir);
      const executable = existing ?? (await installObscura(installDir, asset));
      if (existing) {
        console.log(`Using ${existing}`);
      }
      console.log(`Starting Obscura on port ${port}...`);
      started = startServer(executable, port);
      await waitForPort(port, started);
    }

    const [bin, ...args] = command;
    return await runCommand(bin, args);
  } finally {
    if (started) {
      stopServer(started.child);
    }
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
