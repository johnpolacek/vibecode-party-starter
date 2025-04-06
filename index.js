#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import open from 'open';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to check if pnpm is installed
function checkPnpm() {
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return true;
  } catch (err) {
    return false;
  }
}

// Function to find an available port
function findAvailablePort(startPort = 3000) {
  try {
    execSync(`lsof -i :${startPort}`, { stdio: 'ignore' });
    return findAvailablePort(startPort + 1);
  } catch (err) {
    return startPort;
  }
}

async function run() {
  try {
    // Check if pnpm is installed
    if (!checkPnpm()) {
      console.error('\nError: pnpm is not installed. Please install it first:');
      console.error('  npm install -g pnpm\n');
      process.exit(1);
    }

    // Get the target directory from command line arguments
    const targetDir = process.argv[2] || 'my-vibecode-app';

    // Path to your template folder
    const templateDir = path.join(__dirname, 'starter');

    // Ensure the target directory doesn't already exist
    if (fs.existsSync(targetDir)) {
      console.error(`Error: Directory ${targetDir} already exists.`);
      process.exit(1);
    }

    // Copy the template to the target directory
    fs.copySync(templateDir, targetDir);
    
    console.log(`\nSuccess! Created ${targetDir} with your Next.js vibecode party starter template.`);
    console.log('\nInstalling packages with pnpm...');
    
    // Change to the target directory and install dependencies
    process.chdir(targetDir);
    execSync('pnpm install', { stdio: 'inherit' });
    console.log('\nPackages installed successfully! 🎉');
    
    // Find an available port
    const port = findAvailablePort();
    console.log(`\nStarting the development server on port ${port}...`);
    
    // Start the dev server
    const devServer = spawn('pnpm', ['dev', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true
    });
    
    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Open the browser
    console.log('\nOpening browser...');
    await open(`http://localhost:${port}`);
    
    // Handle process termination
    process.on('SIGINT', () => {
      devServer.kill();
      process.exit(0);
    });
    
    // Keep the script running
    await new Promise(() => {});
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();