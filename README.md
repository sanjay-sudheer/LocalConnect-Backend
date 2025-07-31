# LocalConnect Microservices Backend

A comprehensive microservices backend architecture for LocalConnect - a platform that connects users with local service providers like electricians, plumbers, tutors, and more.

## 🏗️ Architecture Overview

The backend is built using a microservices architecture with the following services:

- **API Gateway** (Port 3000) - Central entry point and request routing
- **Auth Service** (Port 3001) - User authentication and authorization
- **Services Service** (Port 3002) - Service provider listings and categories
- **Booking Service** (Port 3003) - Booking management and scheduling
- **Review Service** (Port 3004) - Reviews and ratings system
- **Notification Service** (Port 3005) - Email, SMS, and real-time notifications

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 5.0+
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/localconnect-backend.git
   cd localconnect-backend
   ```

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables:**
   Copy the `.env.example` files in each service directory and configure them:
   ```bash
   # Copy environment files
   cp services/api-gateway/.env.example services/api-gateway/.env
   cp services/auth-service/.env.example services/auth-service/.env
   cp services/services-service/.env.example services/services-service/.env
   cp services/booking-service/.env.example services/booking-service/.env
   cp services/review-service/.env.example services/review-service/.env
   cp services/notification-service/.env.example services/notification-service/.env
   ```

4. **Start MongoDB:**
   ```bash
   # Using MongoDB Community Edition
   mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start all services:**
   ```bash
   # Development mode (with hot reload)
   npm run dev
   
   # Production mode
   npm start
   ```

## 📋 Available Scripts

- `npm run install-all` - Install dependencies for all services
- `npm run dev` - Start all services in development mode
- `npm start` - Start all services in production mode
- `npm run gateway` - Start only the API Gateway
- `npm run auth` - Start only the Auth Service
- `npm run services` - Start only the Services Service
- `npm run booking` - Start only the Booking Service
- `npm run review` - Start only the Review Service
- `npm run notification` - Start only the Notification Service

## 🔧 Service Details

### API Gateway (Port 3000)
- **Purpose**: Central entry point for all client requests
- **Features**: Request routing, load balancing, CORS handling
- **Endpoints**: Routes requests to appropriate microservices
- **Health Check**: `GET /health`

### Auth Service (Port 3001)
- **Purpose**: User authentication and authorization
- **Features**: JWT tokens, password hashing, role-based access
- **Key Endpoints**:
  - `POST /api/register` - User registration
  - `POST /api/login` - User login
  - `GET /api/profile` - Get user profile
  - `POST /api/verify-token` - Token verification (internal)

### Services Service (Port 3002)
- **Purpose**: Manage service listings and categories
- **Features**: Service CRUD, categories, search, filtering
- **Key Endpoints**:
  - `GET /api/services` - List services with filters
  - `POST /api/services` - Create service (providers only)
  - `GET /api/categories` - List service categories
  - `GET /api/services/search/location` - Location-based search

### Booking Service (Port 3003)
- **Purpose**: Handle booking management and scheduling
- **Features**: Booking CRUD, calendar integration, status tracking
- **Key Endpoints**:
  - `POST /api/bookings` - Create booking
  - `GET /api/bookings` - List bookings
  - `PATCH /api/bookings/:id/status` - Update booking status
  - `GET /api/bookings/provider/:id/schedule` - Provider schedule

### Review Service (Port 3004)
- **Purpose**: Manage reviews and ratings
- **Features**: Review CRUD, rating calculations, provider responses
- **Key Endpoints**:
  - `POST /api/reviews` - Create review
  - `GET /api/reviews` - List reviews
  - `POST /api/reviews/:id/response` - Add provider response
  - `GET /api/reviews/provider/:id/rating` - Provider rating summary

### Notification Service (Port 3005)
- **Purpose**: Handle all types of notifications
- **Features**: Email, SMS, push notifications, real-time updates
- **Key Endpoints**:
  - `GET /api/notifications` - User notifications
  - `POST /api/notifications` - Create notification (internal)
  - `PATCH /api/notifications/:id/read` - Mark as read
  - **WebSocket**: Real-time notification delivery

## 🗄️ Database Schema

Each service has its own MongoDB database:

- `localconnect_auth` - User accounts, profiles, authentication
- `localconnect_services` - Service listings, categories
- `localconnect_bookings` - Booking records, schedules
- `localconnect_reviews` - Reviews, ratings, responses
- `localconnect_notifications` - Notification history, preferences

## 🔐 Authentication & Authorization

The system uses JWT-based authentication with role-based access control:

- **Roles**: `customer`, `provider`, `admin`
- **Token Flow**: Auth service issues JWTs, other services verify via Auth service
- **Protection**: Routes are protected based on user roles and ownership

## 🌐 API Documentation

### Authentication Header
All protected endpoints require the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Response Format
All APIs return responses in this format:
```json
{
  "success": true|false,
  "message": "Description",
  "data": { ... },
  "pagination": { ... } // for paginated responses
}
```

### Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ] // validation errors if applicable
}
```

## 🔧 Configuration

### Environment Variables

Each service requires specific environment variables. Key ones include:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (Auth Service)
- Service URLs for inter-service communication

### MongoDB Setup

The system expects MongoDB to be running on the default port (27017). You can configure custom connection strings in each service's `.env` file.

## 📊 Monitoring & Health Checks

Each service provides a health check endpoint:
- `GET /:port/health` - Returns service status and metadata

## 🚀 Deployment

### Docker Support (Coming Soon)
Docker configurations will be provided for easy containerized deployment.

### Production Considerations

1. **Database**: Use MongoDB replica sets for high availability
2. **Security**: Use strong JWT secrets and implement rate limiting
3. **Monitoring**: Add application monitoring (e.g., New Relic, DataDog)
4. **Logging**: Implement centralized logging (e.g., ELK stack)
5. **Load Balancing**: Use nginx or AWS ALB for load balancing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in each service directory

## 🎯 Roadmap

- [ ] Docker containerization
- [ ] Kubernetes deployment configs
- [ ] API rate limiting enhancements
- [ ] Advanced search capabilities
- [ ] Payment integration
- [ ] Mobile push notifications
- [ ] Advanced analytics and reporting
