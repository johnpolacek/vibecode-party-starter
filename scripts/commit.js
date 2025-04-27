#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function getLatestCommitMessage() {
  try {
    // Create a temporary directory
    const tempDir = join(rootDir, 'temp-starter');
    execSync(`rm -rf ${tempDir}`, { stdio: 'ignore' });
    execSync(`mkdir -p ${tempDir}`, { stdio: 'ignore' });
    
    // Clone the repository
    execSync(`git clone --depth 1 https://github.com/johnpolacek/vibecode.party.starter.git ${tempDir}`, { stdio: 'ignore' });
    
    // Get the latest commit message
    const commitMessage = execSync('git log -1 --pretty=%B', { 
      cwd: tempDir,
      encoding: 'utf8'
    }).trim();
    
    // Clean up
    execSync(`rm -rf ${tempDir}`, { stdio: 'ignore' });
    
    return commitMessage;
  } catch (err) {
    console.error('Error fetching commit message:', err.message);
    process.exit(1);
  }
}

async function main() {
  try {
    // Get the commit message from the starter repo
    const commitMessage = await getLatestCommitMessage();
    
    // Stage all changes
    execSync('git add .', { stdio: 'inherit' });
    
    // Commit with the fetched message
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    console.log('Changes committed successfully with message:', commitMessage);
  } catch (err) {
    console.error('Error committing changes:', err.message);
    process.exit(1);
  }
}

main(); 