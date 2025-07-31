const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'API Gateway', dir: 'services/api-gateway', port: 3000 },
  { name: 'Auth Service', dir: 'services/auth-service', port: 3001 },
  { name: 'Services Service', dir: 'services/services-service', port: 3002 },
  { name: 'Booking Service', dir: 'services/booking-service', port: 3003 },
  { name: 'Review Service', dir: 'services/review-service', port: 3004 },
  { name: 'Notification Service', dir: 'services/notification-service', port: 3005 }
];

function startService(service) {
  const servicePath = path.join(__dirname, '..', service.dir);
  
  console.log(`🚀 Starting ${service.name} on port ${service.port}...`);
  
  const child = spawn('npm', ['start'], {
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

function startAllServices() {
  console.log('🌟 Starting LocalConnect Microservices...\n');
  
  const processes = [];
  
  services.forEach((service, index) => {
    setTimeout(() => {
      const process = startService(service);
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
  startAllServices();
}

module.exports = { startAllServices, services };
