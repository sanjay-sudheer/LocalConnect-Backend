const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const services = [
  'api-gateway',
  'auth-service',
  'services-service',
  'booking-service',
  'review-service',
  'notification-service'
];

async function installDependencies(serviceDir) {
  return new Promise((resolve, reject) => {
    const servicePath = path.join(__dirname, '..', 'services', serviceDir);
    
    console.log(`📦 Installing dependencies for ${serviceDir}...`);
    
    const child = spawn('npm', ['install'], {
      cwd: servicePath,
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (error) => {
      console.error(`❌ Error installing dependencies for ${serviceDir}:`, error);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ Dependencies installed for ${serviceDir}`);
        resolve();
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
}

async function installAll() {
  console.log('🌟 Installing dependencies for all LocalConnect services...\n');
  
  // Install root dependencies first
  console.log('📦 Installing root dependencies...');
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Root dependencies installed\n');
        resolve();
      } else {
        reject(new Error(`Root installation failed with code ${code}`));
      }
    });
  });

  // Install service dependencies
  for (const service of services) {
    try {
      await installDependencies(service);
    } catch (error) {
      console.error(`Failed to install dependencies for ${service}:`, error);
      process.exit(1);
    }
  }

  console.log('\n🎉 All dependencies installed successfully!');
  console.log('\nNext steps:');
  console.log('1. Set up your environment variables (.env files)');
  console.log('2. Start MongoDB on your system');
  console.log('3. Run "npm run dev" to start all services in development mode');
}

if (require.main === module) {
  installAll().catch(error => {
    console.error('Installation failed:', error);
    process.exit(1);
  });
}

module.exports = { installAll };
