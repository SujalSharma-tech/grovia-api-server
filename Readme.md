# Xeno CRM Platform - Comprehensive Documentation


Live Preview: https://grovia.sujal.codes
## Overview

Xeno (Grovia CRM) is a customer relationship management platform designed to help businesses manage customer data, segment their audience, execute targeted campaigns, and gain valuable insights through AI-powered analytics. The platform provides a robust foundation for marketing automation and customer engagement.

## System Architecture

Xeno is built using a modern, microservices-oriented architecture with event-driven components for scalability and resilience:

### Core Architectural Components

1. **Frontend Layer**
   - React-based SPA with component-driven UI
   - Zustand for state management (lightweight alternative to Redux)
   - Routing with React Router
   - UI components using a custom design system

2. **API Layer**
   - Express.js REST API backend
   - JWT-based authentication
   - Role-based access control (RBAC)

3. **Processing Layer**
   - Kafka message broker for asynchronous processing
   - Multiple consumer services for dedicated workloads
   - Event-driven architecture for reliability

4. **Data Layer**
   - MongoDB for primary data storage
   - Mongoose ODM for data modeling
   - Indexing strategies for performance optimization

5. **Integration Layer**
   - Google AI (Gemini) for insights and recommendations
   - Google OAuth for social authentication

### Message Flow Architecture

The platform uses Kafka to handle asynchronous processing for intensive operations:

- **Producer Services**: Generate events for various operations
- **Consumer Services**: Process events in parallel without blocking API responses
- **Topics**: Segregated by domain (campaigns, segments, activities, insights)

## Data Models & Relationships

1. **Users & Organizations**
   - Multi-tenant architecture with organization isolation
   - Hierarchical user relationships within organizations
   - Role-based permissions (admin, editor, viewer)

2. **Customer Data Model**
   - Core entity with flexible attribute storage
   - Behavioral and transactional metrics
   - Relationship mapping to organizations

3. **Segmentation Model**
   - Rule-based segmentation engine
   - Compound conditional logic
   - Real-time preview capabilities

4. **Campaign Model**
   - Content and delivery configuration
   - Targeting parameters
   - Performance metrics and analytics

5. **Activity Tracking**
   - Comprehensive audit logs
   - User activity attribution
   - System-wide event recording

## Core Functionality

### Authentication & Authorization

- JWT-based authentication with refresh token mechanism
- Google OAuth integration for social login
- Role-based access control with granular permissions
- Organization context switching

### Organization Management

- Multi-organization support for agencies or multiple businesses
- Team member invitation system
- Role assignment and permission management
- Organization-level metrics and insights

### Customer Management

- Individual customer profile creation
- Bulk import via CSV
- Customer attribute tracking and analysis
- Historical data management

### Segmentation Engine

- Rule-based customer segmentation
- Complex condition builder with AND/OR logic
- Real-time audience size estimation
- AI-assisted rule generation

### Campaign Management

- Campaign creation and scheduling
- Audience targeting via segments
- Message customization and templates
- Delivery tracking and analytics
- AI-assisted message creation

### Analytics & Insights

- Organization-level performance dashboards
- Campaign-specific analytics
- AI-generated business insights
- Customer behavior analysis
- Trend identification and recommendations

### Activity Tracking

- Comprehensive logging of user actions
- System event recording

## Processing Workflows

### Campaign Processing

1. Campaign creation through UI
2. Publishing to Kafka topic
3. Batch processing by consumer services
4. Status updates via polling
5. Analytics aggregation and reporting

### Customer Import Pipeline

1. CSV file upload
2. Header mapping
3. Batch processing for database insertion
4. Activity logging and notification
5. Segment recalculation if needed

### Insights Generation

1. Data collection from multiple sources
2. AI prompt engineering with contextual data
3. Processing via Gemini API
4. Storage and presentation of insights
5. Recurring generation for trend analysis

## Technology Stack

### Frontend Technologies

- **React**: Component-based UI library
- **Zustand**: State management solution
- **TailwindCSS**: Utility-first CSS framework
- **Lucide Icons**:  icon library
- **React Router**: Client-side routing
- **Sonner**: Toast notification system

### Backend Technologies

- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **JSONWebToken**: Authentication mechanism
- **Kafka.js**: Kafka client for Node.js
- **Google Generative AI**: AI integration

### Infrastructure

- **Kafka**: Event streaming platform
- **MongoDB Atlas**: Cloud database service
- **Aiven**: Managed Kafka service
- **Express Middleware**: Request processing pipeline
- **Heroku Platform**: Backend hosting and kafka consumers

## Security Considerations

- JWT-based authentication with proper expiry
- CORS configuration with specific origin restrictions
- Role-based access control for all operations
- Data isolation between organizations
- Input validation and sanitization
- Environment-specific configuration
- Secure credential management

## Deployment Architecture

The application is structured for deployment as:

- Frontend SPA deployed Vercel with custom domain
- Backend API in containerized environment
- Kafka and MongoDB as managed services
- Multiple consumer instances for scalability
- Environment-specific configuration via .env files

## Development Patterns

### State Management

Client-side state is managed using Zustand with:
- Authentication store
- Organization store
- Campaign store
- Segment store
- Customer store
- Activity store
- Dashboard store

### API Communication

- RESTful endpoints with consistent response format
- Token-based authentication headers
- Error handling and status code standardization
- Entity-specific route grouping

### Event-Driven Processing

- Kafka topics for domain separation
- Consumer groups for parallel processing

## Future Enhancements

1. **Advanced Analytics**
   - Deeper customer insights
   - Predictive behavior modeling
   - Advanced segmentation algorithms

2. **Expanded Campaign Capabilities**
   - Multi-channel campaign orchestration
   - A/B testing framework
   - Advanced personalization

3. **Integration Ecosystem**
   - Third-party service connectors
   - Webhooks for custom integrations
   - API expansion for external consumption

4. **Enhanced AI Capabilities**
   - More advanced insights generation
   - Conversational query interface
   - Automated optimization recommendations

5. **Performance Optimizations**
   - Caching layer implementation
   - Query optimization for large datasets
   - Batch processing improvements

## Conclusion

Xeno (Grovia CRM) provides a robust, scalable platform for customer relationship management with particular strengths in segmentation, campaign management, and AI-powered insights. The architecture balances responsiveness with background processing for computationally intensive tasks, making it suitable for businesses with growing customer bases and complex marketing needs.
