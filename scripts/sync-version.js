#!/usr/bin/env node

import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

try {
  // Read both package.json files
  const starterPkg = JSON.parse(fs.readFileSync(join(rootDir, 'starter/package.json'), 'utf8'));
  const rootPkg = JSON.parse(fs.readFileSync(join(rootDir, 'package.json'), 'utf8'));

  // Check if versions are different
  if (starterPkg.version !== rootPkg.version) {
    // Update root package.json version
    const originalVersion = rootPkg.version;
    rootPkg.version = starterPkg.version;
    fs.writeFileSync(join(rootDir, 'package.json'), JSON.stringify(rootPkg, null, 2) + '\n');
    console.log(`Version synced from ${originalVersion} to ${starterPkg.version}`);
  } else {
    console.log(`Versions are already in sync at ${rootPkg.version}`);
  }
} catch (err) {
  console.error('Error syncing versions:', err.message);
  process.exit(1);
} 