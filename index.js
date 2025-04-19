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

async function customizePackageJson(defaultName = 'temp-vibecode-app') {
  // Function to convert slug to title case
  const slugToTitle = (slug) => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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
      message: 'What is your site title? (press enter to skip)',
      default: slugToTitle(name)
    },
    {
      type: 'input',
      name: 'siteDescription',
      message: 'What is your site description? (press enter to skip)',
      default: description
    },
    {
      type: 'input',
      name: 'siteShortDescription',
      message: 'What is your site short description? (press enter to skip)',
      default: description
    },
    {
      type: 'input',
      name: 'siteUrl',
      message: 'What is your site URL? (press enter to skip)',
      default: ''
    },
    {
      type: 'input',
      name: 'siteShareImage',
      message: 'What is your site share image (OG image) URL? (press enter to skip)',
      default: ''
    },
    {
      type: 'input',
      name: 'siteX',
      message: 'What is your X (Twitter) profile URL? (press enter to skip)',
      default: ''
    },
    {
      type: 'input',
      name: 'siteGithub',
      message: 'What is your GitHub repository URL? (press enter to skip)',
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

async function createProject(projectName, customValues) {
  try {
    // Create project directory
    fs.mkdirSync(projectName);
    process.chdir(projectName);

    // Copy starter files
    console.log('Copying starter files...');
    fs.copySync(join(__dirname, 'starter'), '.', { overwrite: true });

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
      url: "https://starter.vibecode.party",
      shareImage: "https://starter.vibecode.party/screenshot.png",
      x: "",
      github: ""
    };

    // Update config with custom values
    const configContent = `export const siteConfig = {
  title: "${customValues.siteTitle || defaultConfig.title}",
  description: "${customValues.siteDescription || defaultConfig.description}",
  shortDescription: "${customValues.siteShortDescription || defaultConfig.shortDescription}",
  url: "${customValues.siteUrl || defaultConfig.url}",
  shareImage: "${customValues.siteShareImage || defaultConfig.shareImage}",
  x: "${customValues.siteX || defaultConfig.x}",
  github: "${customValues.siteGithub || defaultConfig.github}"
} as const

export type SiteConfig = {
    title: string
    description: string
    shortDescription: string
    url: string
    shareImage: string
    x: string
    github: string
}`;
    fs.writeFileSync('lib/config.ts', configContent);

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
    
    // Wait for server to be ready
    await waitForServer(port);
    
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