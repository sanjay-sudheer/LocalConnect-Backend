const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'API Gateway', dir: 'services/api-gateway', port: 8000 },
  { name: 'Auth Service', dir: 'services/auth-service', port: 3001 },
  { name: 'Services Service', dir: 'services/services-service', port: 3002 },
  { name: 'Booking Service', dir: 'services/booking-service', port: 3003 },
  { name: 'Review Service', dir: 'services/review-service', port: 3004 },
  { name: 'Notification Service', dir: 'services/notification-service', port: 3005 }
];

function startServiceDev(service) {
  const servicePath = path.join(__dirname, '..', service.dir);
  
  console.log(`🔧 Starting ${service.name} in development mode on port ${service.port}...`);
  
  const child = spawn('npm', ['run', 'dev'], {
    cwd: servicePath,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (error) => {
    console.error(`❌ Error starting ${service.name}:`, error);
  });

  child.on('exit', (code) => {
    console.log(`⚠️  ${service.name} exited with code ${code}`);
  });

  return child;
}

function startAllServicesDev() {
  console.log('🌟 Starting LocalConnect Microservices in Development Mode...\n');
  
  const processes = [];
  
  services.forEach((service, index) => {
    setTimeout(() => {
      const process = startServiceDev(service);
      processes.push(process);
    }, index * 2000); // Stagger startup by 2 seconds
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all services...');
    processes.forEach(proc => {
      proc.kill('SIGINT');
    });
    process.exit(0);
  });
}

if (require.main === module) {
  startAllServicesDev();
}

module.exports = { startAllServicesDev };
