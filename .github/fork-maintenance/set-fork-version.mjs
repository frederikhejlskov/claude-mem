#!/usr/bin/env node

import fs from 'node:fs';

const args = process.argv.slice(2);
const verifyOnly = args[0] === '--verify';
const inputVersion = verifyOnly ? args[1] : args[0];

if (!inputVersion) {
  throw new Error('Usage: set-fork-version.mjs [--verify] <version>');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function deriveForkVersion(upstreamVersion) {
  if (upstreamVersion.includes('-fred.')) {
    throw new Error(`Refusing to derive a fork version from fork version ${upstreamVersion}`);
  }

  const match = upstreamVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/);
  if (!match) {
    throw new Error(`Unsupported upstream version: ${upstreamVersion}`);
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

const expectedVersion = verifyOnly ? inputVersion : deriveForkVersion(inputVersion);
const directVersionFiles = [
  'package.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  'plugin/package.json',
  'plugin/.claude-plugin/plugin.json',
  'plugin/.codex-plugin/plugin.json',
  'openclaw/openclaw.plugin.json',
];

function replaceVersionAfter(filePath, marker, expectedVersion) {
  const source = fs.readFileSync(filePath, 'utf8');
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`${filePath} is missing marker ${marker}`);
  }

  const tail = source.slice(markerIndex);
  const versionMatch = /"version"\s*:\s*"([^"]+)"/.exec(tail);
  if (!versionMatch || versionMatch.index === undefined) {
    throw new Error(`${filePath} has no version after marker ${marker}`);
  }

  if (verifyOnly) {
    if (versionMatch[1] !== expectedVersion) {
      throw new Error(`${filePath} has version ${versionMatch[1]}, expected ${expectedVersion}`);
    }
    return;
  }

  const valueStart = markerIndex + versionMatch.index + versionMatch[0].indexOf(versionMatch[1]);
  const updated = source.slice(0, valueStart) + expectedVersion + source.slice(valueStart + versionMatch[1].length);
  fs.writeFileSync(filePath, updated);
  readJson(filePath);
}

for (const filePath of directVersionFiles) {
  const document = readJson(filePath);
  if (typeof document.version !== 'string') {
    throw new Error(`${filePath} has no top-level version`);
  }
  replaceVersionAfter(filePath, '{', expectedVersion);
}

const marketplacePath = '.claude-plugin/marketplace.json';
const marketplace = readJson(marketplacePath);
const pluginEntry = marketplace.plugins?.find(plugin => plugin.name === 'claude-mem');
if (!pluginEntry) {
  throw new Error(`${marketplacePath} has no claude-mem entry`);
}

replaceVersionAfter(marketplacePath, '"name": "claude-mem"', expectedVersion);

process.stdout.write(`${expectedVersion}\n`);
