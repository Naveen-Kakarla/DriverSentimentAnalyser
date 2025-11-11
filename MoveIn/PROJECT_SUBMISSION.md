# Driver Sentiment Engine - Project Submission

**Project Name**: Driver Sentiment Engine  
**Submitted By**: Naveen Kakarla

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Main Features](#3-main-features)
4. [Technologies Used](#4-technologies-used)
5. [Implementation Highlights](#5-implementation-highlights)
6. [Setup & Installation](#6-setup--installation)
7. [System Demonstration](#7-system-demonstration)


---

## 1. Project Overview

### The System

The Driver Sentiment Engine is a real-time system that helps transportation companies monitor driver performance through automated feedback analysis. When riders provide feedback about their trip, the system automatically determines sentiment (positive or negative), updates driver scores, and alerts managers when performance drops.

**[SCREENSHOT: Dashboard showing driver scores with alert indicators]**

### Problem Statement

Transportation companies face several challenges:

- **Delayed Processing**: Manual feedback review takes days or weeks
- **Reactive Management**: Issues discovered only after customer complaints escalate
- **Limited Visibility**: No real-time view of driver performance
- **Scalability Issues**: Manual processes don't scale with growth

### Solution Approach

The system provides:

- Automated sentiment analysis using keyword matching
- Real-time score updates using Exponential Moving Average (EMA)
- Automatic alerts when driver scores drop below threshold
- Comprehensive dashboard with charts and historical data

---

## 2. System Architecture

### Architecture Overview

```
Employee UI → API Gateway → RabbitMQ → Sentiment Processor
                  ↓              ↓              ↓
            Admin Dashboard   Redis Cache   PostgreSQL
```

**[SCREENSHOT: Complete architecture diagram with all components]**

### Design Patterns

| Pattern           | Purpose                   | Benefit                      |
| ----------------- | ------------------------- | ---------------------------- |
| **Microservices** | Independent services      | Scalability, fault isolation |
| **Event-Driven**  | Async message processing  | Non-blocking      |
| **CQRS**          | Separate read/write paths | Optimized performance        |

### Data Flow

**Write Path** (Feedback Submission):

```
User → API Gateway → RabbitMQ → Processor → Redis + PostgreSQL
```

**Read Path** (Dashboard Query):

```
Admin → API Gateway → Redis → Response
```

**Design Rationale:**

- **Fast Response**: Users don't wait for processing 
- **Reliability**: Message queue prevents data loss during failures
- **Scalability**: Multiple workers can process messages in parallel

**[SCREENSHOT: Sequence diagram showing data flow]**

---

## 3. Main Features

### Employee Feedback Submission

**Capabilities:**

- Simple interface for feedback submission
- Driver selection via dropdown
- Text input with validation
- JWT-based authentication
- Instant confirmation

**[SCREENSHOT: Employee UI feedback form]**

### Admin Dashboard

**Capabilities:**

- Real-time driver score monitoring
- Search and sort functionality
- Visual alert indicators for low scores
- Auto-refresh every 30 seconds
- Responsive design

**[SCREENSHOT: Admin dashboard with driver list]**

### Driver Analytics

**Capabilities:**

- Score timeline visualization
- Complete feedback history
- Trend analysis
- Performance metrics
- Interactive charts

**[SCREENSHOT: Driver detail page with chart]**

### Alert System

**Capabilities:**

- Automatic alerts when score drops below threshold (default: 2.5)
- 24-hour cooldown period to prevent spam
- Configurable threshold via environment variables
- Structured logging for audit trail

**[SCREENSHOT: Alert notification in logs]**

---

## 4. Technologies Used

### Backend Stack

| Technology     | Purpose          | Selection Rationale                    |
| -------------- | ---------------- | -------------------------------------- |
| **FastAPI**    | API Gateway      | High performance, automatic validation |
| **RabbitMQ**   | Message Queue    | Reliable delivery, DLQ support         |
| **Redis**      | Cache Layer      | Sub-millisecond reads, TTL support     |
| **PostgreSQL** | Database         | ACID compliance, JSON support          |
| **Python**     | Backend Language |  Async support          |

### Frontend Stack

| Technology     | Purpose       | Selection Rationale               |
| -------------- | ------------- | --------------------------------- |
| **React 18**   | UI Framework  | Component-based, modern hooks API |
| **TypeScript** | Type Safety   | Compile-time error checking       |
| **Vite**       | Build Tool    | Fast dev server, HMR              |
| **Recharts**   | Visualization | React-native, responsive charts   |

### Infrastructure

- **Docker & Docker Compose**: Containerization and orchestration
- **JWT**: Stateless authentication

**[SCREENSHOT: Technology stack diagram]**

---

## 5. Implementation Highlights

### Sentiment Analysis Algorithm

**Approach**: Rule-based keyword matching with pattern recognition

**Keyword Dictionary:**

```python
keyword_scores = {
    "excellent": 3, "great": 2, "good": 1,
    "bad": -2, "terrible": -3, "awful": -3
}
```

**Advanced Features:**

- **Negation Handling**: "not good" → negative score
- **Intensity Modifiers**: "very good" → amplified score
- **Fuzzy Matching**: "excelent" (typo) → matches "excellent"

**Examples:**

```
"Excellent service!" → Score: 3.0
"Not good" → Score: -0.8
"Very professional driver" → Score: 3.0
```

**[SCREENSHOT: Code snippet of sentiment analyzer]**

### EMA (Exponential Moving Average)

**Formula**: `new_avg = (α × new_score) + ((1 - α) × old_avg)`

**Advantages:**

- O(1) time complexity (constant time)
- Recent feedback weighted higher
- Smooth score transitions
- Memory efficient (stores only current average)

**Comparison with Simple Average:**

- Simple Average: O(N) - must recalculate from all feedback
- EMA: O(1) - updates incrementally

**Example Calculation** (α = 0.1):

```
Initial: 3.0
After "Great!": 3.0 → 3.15
After "Excellent!": 3.15 → 3.335
After "Terrible!": 3.335 → 2.70
```

**[SCREENSHOT: Graph comparing EMA vs Simple Average]**

### Error Handling

**Dead-Letter Queue (DLQ):**

- Failed messages routed to separate queue
- Error metadata attached (type, message, timestamp)
- Prevents data loss
- Enables manual investigation and reprocessing



**[SCREENSHOT: RabbitMQ showing DLQ with messages]**

### Authentication & Authorization

**JWT (JSON Web Tokens):**

```json
{
  "sub": "admin",
  "user_id": 1,
  "role": "admin",
  "exp": 1699456789
}
```

**Role-Based Access Control:**

- **Employee Role**: Can submit feedback
- **Admin Role**: Can view dashboard and analytics
- Token expiration: 15 minutes (configurable)

**[SCREENSHOT: Postman showing JWT authentication]**

---

## 6. Setup & Installation


### Installation Steps



**Step 1: Configure Environment**

```bash
cp .env.example .env
# Edit .env with appropriate values
```

**Step 2: Start Services**

```bash
docker-compose up --build
```

Wait approximately 30-60 seconds for all services to initialize.

**[SCREENSHOT: Terminal showing docker-compose up]**

**[SCREENSHOT: All services running (docker ps)]**

### Access Points

| Service             | URL                        | Credentials        |
| ------------------- | -------------------------- | ------------------ |
| Employee UI         | http://localhost:3000      | employee / user123 |
| Admin Dashboard     | http://localhost:3001      | admin / admin123   |
| API Documentation   | http://localhost:8000/docs | -                  |
| RabbitMQ Management | http://localhost:15672     | guest / guest      |



---

## 7. System Demonstration

### Complete Workflow

**Step 1: Feedback Submission**

1. Navigate to http://localhost:3000
2. Login with credentials: employee / user123
3. Select driver ID
4. Enter feedback: "Excellent service! Very professional."
5. Click Submit
6. Observe success notification

**[SCREENSHOT: Feedback form with data]**
**[SCREENSHOT: Success notification]**

**Step 2: Background Processing**

Processing steps (visible in logs):

- Message appears in RabbitMQ queue
- Sentiment Processor consumes message
- Sentiment analysis: "Excellent" = 4.2 points
- EMA calculation: 3.0 → 3.12
- Redis cache updated
- PostgreSQL record inserted

**[SCREENSHOT: RabbitMQ showing message]**
**[SCREENSHOT: Processor logs]**

**Step 3: Dashboard View**

1. Navigate to http://localhost:3001
2. Login with credentials: admin / admin123
3. Locate John Smith in driver list
4. Observe updated score: 3.12
6. Review feedback history and score timeline

**[SCREENSHOT: Dashboard with updated score]**
**[SCREENSHOT: Driver detail with chart]**

### Alert Demonstration

**Triggering an Alert:**

1. Submit 5 negative feedbacks for same driver:

   - "Terrible service"
   - "Driver was rude"
   - "Awful experience"
   - "Poor driving"
   - "Bad attitude"

2. Score progression:
  Eg:-
   - 3.0 → 2.73 → 2.51 → 2.31 → 2.14

3. Alert triggered at 2.31 (below threshold of 2.5):
   - Alert logged to system
   - Red indicator displayed on dashboard
   - 24-hour cooldown activated

**[SCREENSHOT: Dashboard showing alert indicator]**
**[SCREENSHOT: Alert in logs]**

### API Testing

**Authentication:**

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Feedback Submission:**

```bash
curl -X POST http://localhost:8000/feedback \
  -H "Authorization: Bearer TOKEN" \
  -d '{"feedback_id": "...", "driver_id": 1, ...}'
```

**Dashboard Data:**

```bash
curl http://localhost:8000/admin/dashboard \
  -H "Authorization: Bearer TOKEN"
```

**[SCREENSHOT: Postman API tests]**

---


### Future Enhancements

**Potential Improvements:**

1. Machine Learning integration for advanced sentiment analysis
2. Email/SMS notification system for alerts
. Predictive analytics and forecasting

---

## Appendix

### Project Structure

```
driver-sentiment-engine/
├── api-gateway/          # FastAPI service
├── sentiment-processor/  # Worker service
├── employee-ui/          # React application
├── admin-dashboard/      # React application
├── shared/               # Shared utilities
└── docker-compose.yml    # Service orchestration
```

### Useful Commands

```bash
# Start system
docker-compose up --build

# View logs
docker-compose logs -f sentiment-processor

# Scale workers
docker-compose up --scale sentiment-processor=3

# Stop system
docker-compose down
```


---


