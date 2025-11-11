# Driver Sentiment Engine

A real-time, event-driven system for analyzing rider feedback and monitoring driver sentiment scores. The system uses message queues for scalability, Redis for fast dashboard queries, and PostgreSQL for historical analytics.

## Architecture Overview

The Driver Sentiment Engine follows a microservices architecture with event-driven processing:

```
Employee UI → API Gateway → RabbitMQ → Sentiment Processor → Redis + PostgreSQL
                    ↑                                              ↓
Admin Dashboard ────┘                                              └─→ Alerting Service
```

### Data Flow

1. **Feedback Submission**: Riders submit feedback through the Employee UI, which sends requests to the API Gateway
2. **Message Publishing**: The API Gateway validates the request and publishes it to RabbitMQ's `feedback_queue`, returning 202 Accepted immediately
3. **Asynchronous Processing**: The Sentiment Processor consumes messages from the queue, performs sentiment analysis, and calculates updated scores
4. **Data Storage**: Scores are written to Redis (for real-time dashboard access) and PostgreSQL (for historical analysis)
5. **Alert Generation**: When scores drop below threshold, alerts are triggered with de-duplication logic
6. **Dashboard Queries**: Admins view real-time scores from Redis and historical trends from PostgreSQL

### Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        EU[Employee UI<br/>React + Vite]
        AD[Admin Dashboard<br/>React + Vite]
    end

    subgraph "API Layer"
        AG[API Gateway<br/>FastAPI + JWT]
    end

    subgraph "Message Layer"
        RMQ[RabbitMQ]
        FQ[feedback_queue]
        DLQ[feedback_dlq]
    end

    subgraph "Processing Layer"
        SP[Sentiment Processor<br/>Python Worker]
        AS[Alerting Service<br/>Stub]
    end

    subgraph "Data Layer"
        Redis[(Redis<br/>driver_scores hash<br/>alert locks)]
        PG[(PostgreSQL<br/>feedback_log)]
    end

    EU -->|POST /feedback| AG
    AD -->|GET /admin/dashboard| AG
    AD -->|GET /admin/driver/:id/history| AG

    AG -->|Publish| FQ
    AG -->|Read| Redis
    AG -->|Query| PG

    FQ --> SP
    SP -->|Failed Messages| DLQ
    SP -->|Update Score| Redis
    SP -->|Insert Record| PG
    SP -->|Trigger| AS

    RMQ -.contains.- FQ
    RMQ -.contains.- DLQ
```

## Services

### API Gateway (FastAPI)

**Responsibilities**:

- JWT-based authentication and authorization
- Request validation using Pydantic models
- Publishing feedback messages to RabbitMQ
- Serving dashboard data from Redis and PostgreSQL

**Technologies**:

- FastAPI (web framework)
- Pydantic (data validation)
- python-jose (JWT handling)
- aio-pika (async RabbitMQ client)
- redis (Redis client)
- asyncpg (async PostgreSQL client)

**Port**: 8000

### Sentiment Processor (Python Worker)

**Responsibilities**:

- Consuming messages from RabbitMQ feedback queue
- Idempotency checking to prevent duplicate processing
- Rule-based sentiment analysis using keyword matching
- Exponential Moving Average (EMA) score calculation
- Updating Redis with real-time scores
- Persisting feedback records to PostgreSQL
- Triggering alerts when scores drop below threshold

**Technologies**:

- pika (RabbitMQ client)
- redis (Redis client)
- psycopg2 (PostgreSQL client)
- Pydantic (data validation)

**Algorithm**: Uses Strategy Pattern with `ISentimentAnalyzer` interface for pluggable sentiment analysis implementations

### Employee UI (React)

**Responsibilities**:

- Dynamic feedback form rendering based on feature flags
- JWT authentication
- Feedback submission to API Gateway
- Configuration-driven UI (config.json)

**Technologies**:

- React 18
- Vite (build tool)
- TypeScript
- Axios (HTTP client)

**Port**: 3000

### Admin Dashboard (React)

**Responsibilities**:

- Real-time driver score monitoring
- Searchable and sortable data tables
- Historical trend visualization with charts
- Driver detail views with feedback history
- Admin authentication

**Technologies**:

- React 18
- React Router (routing)
- Recharts (data visualization)
- Vite (build tool)
- TypeScript

**Port**: 3001

### RabbitMQ

**Responsibilities**:

- Message queue for decoupling API from processing
- Dead-Letter Queue (DLQ) for failed messages
- Message persistence and delivery guarantees

**Queues**:

- `feedback_queue`: Main queue for feedback messages
- `feedback_dlq`: Dead-letter queue for failed processing

**Port**: 5672 (AMQP), 15672 (Management UI)

### Redis

**Responsibilities**:

- Real-time driver score storage (O(1) access)
- Alert de-duplication locks with TTL
- Materialized view for dashboard queries

**Data Structures**:

- `driver_scores` hash: Stores `{driver_id: {avg_score, last_updated}}`
- `driver_alert_sent:{driver_id}` keys: Alert locks with 24-hour TTL

**Port**: 6379

### PostgreSQL

**Responsibilities**:

- Historical feedback record storage
- User authentication data
- Driver reference data
- Analytics queries for trend analysis

**Tables**:

- `feedback_log`: Feedback records with sentiment scores
- `users`: Authentication credentials and roles
- `drivers`: Driver reference data

**Port**: 5432

## Design Trade-offs

### Rule-Based Sentiment vs Machine Learning

**Decision**: Rule-based keyword matching

**Rationale**:

- **Performance**: No model inference overhead, processes messages in milliseconds
- **Predictability**: Consistent, explainable results
- **Infrastructure**: No GPU or ML serving infrastructure required
- **Debugging**: Easy to tune and troubleshoot keyword dictionaries
- **Cost**: Lower operational costs for MVP

**Trade-off**: Less accurate than ML models for nuanced sentiment, but sufficient for initial deployment. The Strategy Pattern allows future ML integration without architectural changes.

### Exponential Moving Average vs Full Recalculation

**Decision**: Exponential Moving Average (EMA)

**Rationale**:

- **Time Complexity**: O(1) score updates vs O(N) for recalculation
- **Scalability**: Handles millions of feedback records without performance degradation
- **Recency Weighting**: Recent feedback naturally weighted higher (configurable α parameter)
- **Memory Efficiency**: Only stores current average, not all historical scores

**Trade-off**: Cannot retroactively adjust all scores if algorithm changes. Historical data remains in PostgreSQL for potential reprocessing if needed.

### Redis Caching Benefits

**Decision**: Redis materialized view for dashboard

**Rationale**:

- **Latency**: Sub-millisecond read access vs 10-100ms PostgreSQL queries
- **Load Reduction**: Offloads frequent dashboard queries from PostgreSQL
- **Scalability**: Supports high-frequency dashboard refreshes without database strain
- **Simplicity**: Simple key-value access pattern for score lookups

**Trade-off**: Adds infrastructure complexity and eventual consistency (scores update asynchronously). Acceptable for dashboard use case where real-time precision isn't critical.

### Message Queue Decoupling

**Decision**: RabbitMQ for async processing

**Rationale**:

- **Response Time**: API returns 202 Accepted in O(1) time, no blocking on processing
- **Fault Tolerance**: Messages persist if processor crashes, preventing data loss
- **Horizontal Scaling**: Multiple processor instances consume from same queue
- **Backpressure Handling**: Queue buffers messages during traffic spikes
- **Retry Logic**: Dead-Letter Queue for failed messages with manual review

**Trade-off**: Eventual consistency (feedback not immediately reflected in dashboard) and additional infrastructure component. Acceptable for non-critical feedback processing.

## Setup Instructions

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- Ports 3000, 3001, 5432, 5672, 6379, 8000, 15672 available

### Environment Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Configure environment variables in `.env`:

```env
# Database
POSTGRES_USER=sentiment_user
POSTGRES_PASSWORD=sentiment_pass
POSTGRES_DB=sentiment_db
DATABASE_URL=postgresql://sentiment_user:sentiment_pass@postgres:5432/sentiment_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=15

# Sentiment Engine Configuration
EMA_ALPHA=0.1
ALERT_THRESHOLD=2.5

# API Gateway
API_GATEWAY_PORT=8000

# Frontend Ports
EMPLOYEE_UI_PORT=3000
ADMIN_DASHBOARD_PORT=3001
```

**Important**: Change `JWT_SECRET` to a secure random string in production.

### Starting the System

1. Build and start all services:

```bash
docker-compose up --build
```

2. Wait for all services to be healthy (approximately 30-60 seconds)

3. Access the applications:
   - Employee UI: http://localhost:3000
   - Admin Dashboard: http://localhost:3001
   - API Gateway: http://localhost:8000
   - RabbitMQ Management: http://localhost:15672 (guest/guest)

### Stopping the System

```bash
docker-compose down
```

To remove volumes (deletes all data):

```bash
docker-compose down -v
```

### Development Mode

To run services individually for development:

```bash
# API Gateway
cd api-gateway
pip install -r requirements.txt
python main.py

# Sentiment Processor
cd sentiment-processor
pip install -r requirements.txt
python worker.py

# Employee UI
cd employee-ui
npm install
npm run dev

# Admin Dashboard
cd admin-dashboard
npm install
npm run dev
```

## API Endpoints

### Authentication

#### POST /auth/login

Authenticate user and receive JWT token.

**Request**:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response** (200 OK):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error** (401 Unauthorized):

```json
{
  "error": "Invalid credentials"
}
```

### Feedback Submission

#### POST /feedback

Submit rider feedback for processing.

**Headers**:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request**:

```json
{
  "feedback_id": "550e8400-e29b-41d4-a716-446655440000",
  "driver_id": 123,
  "entity_type": "driver",
  "text": "Great driver, very professional and friendly!",
  "timestamp": "2025-11-08T10:30:00Z"
}
```

**Response** (202 Accepted):

```json
{
  "message": "Feedback accepted for processing",
  "feedback_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error** (400 Bad Request):

```json
{
  "error": "Invalid request",
  "details": "entity_type must be one of: driver, trip, app, marshal"
}
```

**Error** (401 Unauthorized):

```json
{
  "error": "Invalid or expired token"
}
```

### Admin Dashboard

#### GET /admin/dashboard

Retrieve real-time scores for all drivers.

**Headers**:

```
Authorization: Bearer <admin_jwt_token>
```

**Response** (200 OK):

```json
[
  {
    "driver_id": 123,
    "driver_name": "John Doe",
    "avg_score": 3.8,
    "last_updated": "2025-11-08T10:30:00Z",
    "alert_status": false
  },
  {
    "driver_id": 456,
    "driver_name": "Jane Smith",
    "avg_score": 2.3,
    "last_updated": "2025-11-08T10:25:00Z",
    "alert_status": true
  }
]
```

**Error** (403 Forbidden):

```json
{
  "error": "Admin access required"
}
```

#### GET /admin/driver/{driver_id}/history

Retrieve historical feedback and score timeline for a specific driver.

**Headers**:

```
Authorization: Bearer <admin_jwt_token>
```

**Response** (200 OK):

```json
{
  "driver_id": 123,
  "feedback_records": [
    {
      "feedback_id": "550e8400-e29b-41d4-a716-446655440000",
      "feedback_text": "Great driver!",
      "sentiment_score": 2.5,
      "created_at": "2025-11-08T10:30:00Z"
    }
  ],
  "score_timeline": [
    {
      "timestamp": "2025-11-08T10:30:00Z",
      "avg_score": 3.8
    }
  ]
}
```

**Error** (404 Not Found):

```json
{
  "error": "Driver not found"
}
```

## Troubleshooting

### Services Not Starting

**Issue**: Docker containers fail to start or exit immediately

**Solutions**:

- Check if required ports are available: `netstat -an | findstr "3000 3001 5432 5672 6379 8000"`
- Verify Docker has sufficient resources (4GB RAM minimum)
- Check logs: `docker-compose logs <service_name>`
- Ensure `.env` file exists and is properly configured

### RabbitMQ Connection Errors

**Issue**: Sentiment Processor cannot connect to RabbitMQ

**Solutions**:

- Verify RabbitMQ is running: `docker-compose ps rabbitmq`
- Check RabbitMQ logs: `docker-compose logs rabbitmq`
- Wait 10-15 seconds after starting for RabbitMQ to fully initialize
- Verify credentials in `.env` match RabbitMQ configuration
- Access management UI at http://localhost:15672 to verify queue creation

### Database Connection Errors

**Issue**: API Gateway or Sentiment Processor cannot connect to PostgreSQL

**Solutions**:

- Verify PostgreSQL is running: `docker-compose ps postgres`
- Check database logs: `docker-compose logs postgres`
- Verify `DATABASE_URL` in `.env` is correct
- Ensure database initialization completed: `docker-compose logs postgres | findstr "database system is ready"`
- Try restarting services: `docker-compose restart api-gateway sentiment-processor`

### Redis Connection Errors

**Issue**: Services cannot connect to Redis

**Solutions**:

- Verify Redis is running: `docker-compose ps redis`
- Check Redis logs: `docker-compose logs redis`
- Verify `REDIS_HOST` and `REDIS_PORT` in `.env`
- Test Redis connection: `docker-compose exec redis redis-cli ping` (should return "PONG")

### JWT Authentication Failures

**Issue**: API returns 401 Unauthorized for valid credentials

**Solutions**:

- Verify `JWT_SECRET` is set in `.env`
- Check token expiration (default 15 minutes)
- Ensure `Authorization` header format: `Bearer <token>`
- Verify user exists in database: `docker-compose exec postgres psql -U sentiment_user -d sentiment_db -c "SELECT * FROM users;"`
- Check API Gateway logs: `docker-compose logs api-gateway`

### Messages Stuck in Queue

**Issue**: Feedback submitted but not processed

**Solutions**:

- Verify Sentiment Processor is running: `docker-compose ps sentiment-processor`
- Check processor logs: `docker-compose logs sentiment-processor`
- Access RabbitMQ management UI: http://localhost:15672
- Check `feedback_queue` message count and consumer count
- Verify no messages in `feedback_dlq` (indicates processing errors)
- Restart processor: `docker-compose restart sentiment-processor`

### Dashboard Not Loading Data

**Issue**: Admin Dashboard shows empty or stale data

**Solutions**:

- Verify Redis contains data: `docker-compose exec redis redis-cli HGETALL driver_scores`
- Check API Gateway logs for errors: `docker-compose logs api-gateway`
- Verify JWT token has admin role
- Submit test feedback to populate data
- Check browser console for JavaScript errors
- Verify API Gateway is accessible: `curl http://localhost:8000/admin/dashboard -H "Authorization: Bearer <token>"`

### Sentiment Scores Not Updating

**Issue**: Feedback processed but scores remain unchanged

**Solutions**:

- Check Sentiment Processor logs: `docker-compose logs sentiment-processor`
- Verify Redis updates: `docker-compose exec redis redis-cli HGETALL driver_scores`
- Check PostgreSQL for feedback records: `docker-compose exec postgres psql -U sentiment_user -d sentiment_db -c "SELECT * FROM feedback_log ORDER BY created_at DESC LIMIT 10;"`
- Verify `EMA_ALPHA` is set correctly in `.env` (default 0.1)
- Check for duplicate `feedback_id` (idempotency check may skip processing)

### Alerts Not Triggering

**Issue**: Low scores don't generate alerts

**Solutions**:

- Verify `ALERT_THRESHOLD` in `.env` (default 2.5)
- Check Sentiment Processor logs for alert messages
- Verify alert lock doesn't exist: `docker-compose exec redis redis-cli GET driver_alert_sent:<driver_id>`
- Alert locks expire after 24 hours (86400 seconds)
- Submit multiple negative feedback to drop score below threshold

### Frontend Build Errors

**Issue**: Employee UI or Admin Dashboard fail to build

**Solutions**:

- Check Node.js version (requires 16+)
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
- Check for TypeScript errors: `npm run type-check`
- Verify environment variables in `.env.example` files
- Check nginx configuration in Dockerfile

### Performance Issues

**Issue**: Slow response times or high latency

**Solutions**:

- Check Docker resource allocation (increase CPU/memory)
- Monitor queue depth: RabbitMQ management UI
- Check Redis memory usage: `docker-compose exec redis redis-cli INFO memory`
- Review PostgreSQL query performance: Enable slow query logging
- Scale Sentiment Processor: `docker-compose up --scale sentiment-processor=3`
- Add database indexes if missing (see `shared/init.sql`)

### Data Persistence Issues

**Issue**: Data lost after restart

**Solutions**:

- Verify Docker volumes are created: `docker volume ls`
- Check volume mounts in `docker-compose.yml`
- Don't use `docker-compose down -v` unless intentionally clearing data
- Backup PostgreSQL: `docker-compose exec postgres pg_dump -U sentiment_user sentiment_db > backup.sql`
- Backup Redis: `docker-compose exec redis redis-cli SAVE`

## Additional Resources

- **Design Document**: See `.kiro/specs/driver-sentiment-engine/design.md` for detailed architecture
- **Requirements**: See `.kiro/specs/driver-sentiment-engine/requirements.md` for complete requirements
- **Learning Guides**: See documentation files above for comprehensive learning materials

## License

Proprietary - Internal Use Only
