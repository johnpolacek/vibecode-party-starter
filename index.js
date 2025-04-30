#!/usr/bin/env node

import fs from 'fs-extra';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import open from 'open';
import inquirer from 'inquirer';
import { dirname, join } from 'path';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the project root directory (where the script is located)
const projectRoot = join(__dirname);

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

// Function to check if server is ready
async function isServerReady(port) {
  try {
    const response = await fetch(`http://localhost:${port}/get-started`);
    return response.ok;
  } catch (err) {
    return false;
  }
}

// Function to wait for server to be ready
async function waitForServer(port, maxAttempts = 30) {
  console.log('\nWaiting for server to start...');
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerReady(port)) {
      console.log('Server is ready!');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Server failed to start within the timeout period');
}

// Function to convert slug to title case
const slugToTitle = (slug) => {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Function to slugify a string
const slugify = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

async function customizePackageJson(defaultName = 'temp-vibecode-app') {
  // Get project name first
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What is your project directory name?',
      default: defaultName
    }
  ]);

  // Get description and author
  const { description, author, license } = await inquirer.prompt([
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
      default: 'None'
    }
  ]);

  // Get site configuration with defaults from project description
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'siteTitle',
      message: 'What is your site title?',
      default: slugToTitle(name)
    },
    {
      type: 'input',
      name: 'siteDescription',
      message: 'What is your site description?',
      default: description
    },
    {
      type: 'input',
      name: 'siteShortDescription',
      message: 'What is your site short description?',
      default: description
    },
    {
      type: 'input',
      name: 'siteUrl',
      message: 'What is your site URL?',
      default: `${slugify(name)}.vercel.app`
    },
    {
      type: 'input',
      name: 'siteX',
      message: 'What is your X (Twitter) profile URL? (press enter to skip)',
      default: ''
    }
  ]);

  // Combine the answers
  const finalAnswers = {
    name,
    description,
    author,
    license,
    ...answers
  };

  return finalAnswers;
}

// Function to generate README content
function generateReadmeContent(projectName, description) {
  return `# ${projectName}

${description}

---

This project was generated with [Vibecode Party Starter](https://starter.vibecode.party), a modern Next.js starter with authentication, database, storage, AI, and more.
`;
}

async function createProject(projectName, customValues) {
  try {
    // Create project directory in the current working directory (parent)
    fs.mkdirSync(projectName);
    process.chdir(projectName);

    // Copy starter files from the project root
    console.log('Copying starter files...');
    fs.copySync(join(projectRoot, 'starter'), '.', { 
      overwrite: true,
      filter: (src) => {
        // Exclude .git directory
        return !src.includes('.git');
      }
    });

    // Generate and write README.md
    const readmeContent = generateReadmeContent(customValues.name, customValues.description);
    fs.writeFileSync('README.md', readmeContent);

    // Copy configuration files from project root
    console.log('Copying configuration files...');
    const configFiles = [
      '.gitignore',
      '.cursor',
      '.prettierignore',
      '.prettierrc',
      '.vscode'
    ];

    for (const file of configFiles) {
      const sourcePath = join(projectRoot, file);
      if (fs.existsSync(sourcePath)) {
        if (fs.lstatSync(sourcePath).isDirectory()) {
          fs.copySync(sourcePath, join(process.cwd(), file), { overwrite: true });
        } else {
          fs.copyFileSync(sourcePath, join(process.cwd(), file));
        }
      }
    }

    // Read the starter package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    // Update with custom values
    const updatedPackageJson = {
      ...packageJson,
      name: customValues.name,
      version: '0.1.0',
      description: customValues.description || packageJson.description,
      author: customValues.author || packageJson.author,
      license: customValues.license
    };

    // Write the updated package.json
    fs.writeFileSync('package.json', JSON.stringify(updatedPackageJson, null, 2));

    // Update LICENSE file based on user input
    if (customValues.license === 'MIT') {
      const currentYear = new Date().getFullYear();
      const licenseContent = `MIT License

Copyright (c) ${currentYear} ${customValues.author || customValues.name}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
      fs.writeFileSync('LICENSE', licenseContent);
    } else if (customValues.license !== 'None') {
      console.log(`\nNote: You selected the "${customValues.license}" license.`);
      console.log('Please add your own LICENSE file with the appropriate license text.');
      console.log('You can find standard license texts at: https://choosealicense.com/licenses/');
    }

    // Create default config object
    const defaultConfig = {
      title: "Vibecode Party Starter",
      description: "A modern Next.js starter with authentication, database, storage, AI, and more.",
      shortDescription: "Next.js Starter with Clerk, Supabase, AWS, AI, and more",
      url: "",
      shareImage: "",
      x: "",
    };

    // Update config with custom values
    const configContent = `export const siteConfig = {
  title: "${customValues.siteTitle || defaultConfig.title}",
  description: "${customValues.siteDescription || defaultConfig.description}",
  shortDescription: "${customValues.siteShortDescription || defaultConfig.shortDescription}",
  url: "${customValues.siteUrl || defaultConfig.url}",
  shareImage: "${customValues.siteShareImage || defaultConfig.shareImage}",
  x: "${customValues.siteX || defaultConfig.x}",
  github: "",
  logo: ""
} as const

export type SiteConfig = {
    title: string
    description: string
    shortDescription: string
    url: string
    shareImage: string
    x: string
    github: string
    logo: string
}`;
    fs.writeFileSync('lib/config.ts', configContent);

    // Install dependencies
    console.log('Installing dependencies...');
    execSync('pnpm install', { stdio: 'inherit' });

    // Initialize Convex
    console.log('\nInitializing Convex...');
    try {
      // Create a new Convex project using the new recommended command
      execSync('npx convex dev --once --configure=new', { 
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' }
      });
      
      // Generate Convex types
      console.log('\nGenerating Convex types...');
      execSync('npx convex codegen', {
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' }
      });
    } catch (err) {
      console.log('\nNote: Convex initialization requires interactive input.');
      console.log('Please run the following commands manually after the project is created:');
      console.log('1. npx convex dev --once --configure=new');
      console.log('2. npx convex codegen');
      console.log('\nAfter initialization is complete, you can start the development server with:');
      console.log('pnpm dev');
    }

    // Find an available port
    const port = findAvailablePort();
    console.log(`\nStarting the development server on port ${port}...`);
    
    // Start the dev server
    const devServer = spawn('pnpm', ['dev', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true
    });
    
    // Wait for server to be ready
    await waitForServer(port);
    
    // Open browser
    console.log('\nOpening browser...');
    await open(`http://localhost:${port}/get-started`);
    
    // Open new terminal in project directory
    openNewTerminal(projectName);
    
    // Open project in Cursor
    openInCursor(projectName);
    
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

// Function to open new terminal in project directory
function openNewTerminal(projectDir) {
  console.log(`Attempting to open new terminal in: ${projectDir}`);
  
  // Get the absolute path to the project directory
  // We need to go up one level from the current directory since we're already in the project directory
  const absolutePath = join(process.cwd());
  console.log(`Absolute path: ${absolutePath}`);
  
  const command = process.platform === 'win32' 
    ? `start cmd /k "cd ${absolutePath}"`
    : `osascript -e 'tell app "Terminal" to do script "cd ${absolutePath}"'`;
  
  console.log(`Running command: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('\nOpened new terminal window in project directory');
  } catch (err) {
    console.error('\nError opening new terminal:', err);
    console.log('\nCould not open new terminal window automatically');
    console.log('Please cd into the project directory manually:');
    console.log(`  cd ${absolutePath}`);
  }
}

// Function to open project in Cursor
function openInCursor(projectDir) {
  console.log(`Attempting to open project in Cursor: ${projectDir}`);
  
  // Get the absolute path to the project directory
  // We need to use the current directory since we're already in the project directory
  const absolutePath = join(process.cwd());
  console.log(`Absolute path: ${absolutePath}`);
  
  try {
    if (process.platform === 'darwin') {
      // macOS
      console.log('Using macOS command to open Cursor');
      execSync(`open -a Cursor "${absolutePath}"`, { stdio: 'inherit' });
      console.log('Project opened in Cursor.');
    } else {
      // Linux/Windows
      console.log('Using Linux/Windows command to open Cursor');
      execSync(`cursor "${absolutePath}"`, { stdio: 'inherit' });
      console.log('Project opened in Cursor.');
    }
  } catch (err) {
    console.error('\nError opening Cursor:', err);
    if (process.platform === 'darwin') {
      console.log('⚠️ Could not open Cursor. Please ensure Cursor is installed in your Applications folder.');
    } else {
      console.log('⚠️ Cursor command not found. Please install Cursor or open the project manually.');
    }
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

    // Get the target directory from command line arguments or use a temporary name
    const defaultDir = process.argv[2] || 'my-vibecode-app';

    // Get custom package.json values first
    const customValues = await customizePackageJson(defaultDir);

    // Use the user's chosen name for the directory
    const targetDir = customValues.name;

    // Ensure the target directory doesn't already exist
    if (fs.existsSync(targetDir)) {
      console.error(`Error: Directory ${targetDir} already exists.`);
      process.exit(1);
    }

    // Create the project with customization
    await createProject(targetDir, customValues);
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();