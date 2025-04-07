#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import open from 'open';
import inquirer from 'inquirer';
import { dirname, join } from 'path';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to check if pnpm is installed
function checkPnpm() {
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return true;
  } catch (err) {
    return false;
  }
}

// Function to install pnpm globally
async function installPnpm() {
  console.log('\npnpm is not installed. Installing pnpm globally...');
  try {
    execSync('npm install -g pnpm', { stdio: 'inherit' });
    console.log('\npnpm installed successfully! 🎉');
    return true;
  } catch (err) {
    console.error('\nError installing pnpm. Please try installing it manually:');
    console.error('  npm install -g pnpm\n');
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

async function customizePackageJson(defaultName = 'my-vibecode-app') {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What is your project name?',
      default: defaultName
    },
    {
      type: 'input',
      name: 'description',
      message: 'What is your project description?',
      default: ''
    },
    {
      type: 'input',
      name: 'author',
      message: 'What is the author name for this project?',
      default: ''
    },
    {
      type: 'input',
      name: 'license',
      message: 'What license would you like to use?',
      default: 'MIT'
    }
  ]);

  return answers;
}

async function createProject(projectName) {
  try {
    // Create project directory
    fs.mkdirSync(projectName);
    process.chdir(projectName);

    // Copy starter files
    console.log('Copying starter files...');
    fs.copySync(join(__dirname, 'starter'), '.', { overwrite: true });

    // Get custom package.json values
    const customValues = await customizePackageJson(projectName);

    // Read the starter package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    // Update with custom values
    const updatedPackageJson = {
      ...packageJson,
      name: customValues.name,
      version: '0.1.0',
      description: customValues.description,
      author: customValues.author,
      license: customValues.license
    };

    // Write the updated package.json
    fs.writeFileSync('package.json', JSON.stringify(updatedPackageJson, null, 2));

    // Install dependencies
    console.log('Installing dependencies...');
    execSync('pnpm install', { stdio: 'inherit' });

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
    
    // Open browser
    console.log('\nOpening browser...');
    await open(`http://localhost:${port}/get-started`);
    
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

async function run() {
  try {
    // Check if pnpm is installed
    if (!checkPnpm()) {
      const installed = await installPnpm();
      if (!installed) {
        process.exit(1);
      }
    }

    // Get the target directory from command line arguments
    const targetDir = process.argv[2] || 'my-vibecode-app';

    // Ensure the target directory doesn't already exist
    if (fs.existsSync(targetDir)) {
      console.error(`Error: Directory ${targetDir} already exists.`);
      process.exit(1);
    }

    // Create the project with customization
    await createProject(targetDir);
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();