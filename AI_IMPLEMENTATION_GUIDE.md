# Enhanced AI Recommender System - Implementation Guide

## 🎯 Overview

This enhanced AI system provides intelligent restaurant and event recommendations using MySQL data, semantic search, and natural language processing. It features a beautiful React Native chat interface integrated with your existing app.

## 🚀 Features

### Backend AI System
- **MySQL Integration**: Direct database connectivity with real-time data
- **Semantic Search**: Using sentence transformers for intelligent matching
- **Natural Language Processing**: Intent classification and entity extraction
- **Caching**: Redis-based caching for optimal performance
- **OpenAI Integration**: Optional GPT-powered responses
- **Real-time Updates**: Automatic data synchronization

### React Native Chat Interface
- **Beautiful UI**: Modern dark/light theme with violet accents
- **Real-time Chat**: Instant responses with typing indicators
- **Smart Suggestions**: Context-aware quick responses
- **Search Integration**: Navigate to restaurants/events from chat
- **Haptic Feedback**: Enhanced user experience
- **Theme Integration**: Seamless integration with existing theme system

## 📋 Prerequisites

### System Requirements
- Python 3.9+
- MySQL 8.0+
- Redis 6.0+ (optional but recommended)
- Node.js 16+ (for React Native)
- Expo CLI

### Python Dependencies
```bash
pip install -r requirements_ai.txt
```

### MySQL Setup
1. Install MySQL 8.0+
2. Create database using provided schema:
```bash
mysql -u root -p < database_schema.sql
```

### Redis Setup (Optional)
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS with Homebrew
brew install redis

# Start Redis
redis-server
```

## 🛠️ Installation & Setup

### 1. Database Setup

```bash
# Connect to MySQL
mysql -u root -p

# Run the database schema
source database_schema.sql

# Verify tables were created
SHOW TABLES FROM restaurant_db;
```

### 2. Python Environment Setup

```bash
# Create virtual environment
python -m venv ai_env
source ai_env/bin/activate  # Linux/macOS
# ai_env\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements_ai.txt
```

### 3. Environment Configuration

Create `.env` file in your project root:

```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=restaurant_db

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# OpenAI Configuration (optional)
OPENAI_API_KEY=your_openai_api_key

# API Configuration
FLASK_DEBUG=false
PORT=5000
ADMIN_TOKEN=your_admin_token

# React Native Configuration
REACT_APP_AI_URL=http://localhost:5000
```

### 4. Start the AI API Server

```bash
# Development
python ai_chat_api.py

# Production with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 ai_chat_api:app
```

### 5. React Native Integration

The AI chat is already integrated into your tab navigation. Update your `config.ts`:

```typescript
const BASE_URL: string = 
  process.env.REACT_APP_BASE_URL || "http://192.168.178.167:5298";

const AI_BASE_URL: string = 
  process.env.REACT_APP_AI_URL || "http://192.168.178.167:5000";

export { AI_BASE_URL };
export default BASE_URL;
```

## 🔧 API Documentation

### Chat Endpoints

#### POST `/chat`
Send message to AI and get response.

**Request:**
```json
{
  "query": "Vreau să mănânc pizza",
  "user_id": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Am găsit aceste preparate delicioase pentru tine: 🍕\n\n🔥 **Pizza Margherita**\n🏪 La Trattoria Il Calcio\n💰 22.00 RON\n📝 Pizza clasică cu roșii, mozzarella și busuioc",
  "intent": "food_search",
  "search_results": {
    "restaurants": [],
    "menu_items": [
      {
        "id": 5,
        "name": "Pizza Margherita",
        "description": "Pizza clasică cu roșii, mozzarella și busuioc",
        "price": 22.0,
        "restaurant_id": 4,
        "similarity": 0.85
      }
    ],
    "events": []
  },
  "processing_time": 0.234,
  "timestamp": "2024-01-15T10:30:00"
}
```

#### GET `/chat/suggestions`
Get chat suggestions for users.

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "id": 1,
      "text": "Salut! Cum te cheamă?",
      "category": "greeting",
      "icon": "👋"
    }
  ]
}
```

#### GET `/health`
Check system health status.

**Response:**
```json
{
  "status": "healthy",
  "ai_system": {
    "mysql_connected": true,
    "redis_connected": true,
    "embedding_model_loaded": true,
    "openai_enabled": false,
    "restaurants_count": 5,
    "menu_items_count": 6,
    "events_count": 4
  }
}
```

### Data Endpoints

#### GET `/restaurants/details/{id}`
Get detailed restaurant information.

#### GET `/events/details/{id}`
Get detailed event information.

#### POST `/admin/refresh`
Refresh AI data cache (requires admin token).

## 💡 Usage Examples

### Intent Classification
The AI automatically classifies user intents:

- **greeting**: "Salut!", "Bună ziua!"
- **restaurant_search**: "Unde pot mânca?", "Recomanzi un restaurant"
- **food_search**: "Vreau pizza", "Ce fel de mâncare"
- **event_search**: "Ce evenimente sunt?", "Concert"
- **recommendation**: "Ce îmi recomanzi?", "Ce e bun?"

### Search Capabilities

**Semantic Search:**
- "mâncare italiană" → finds Italian restaurants and pasta dishes
- "loc romantic" → finds restaurants with romantic atmosphere
- "eveniment muzică" → finds concerts and music events

**Keyword Search:**
- Exact matches on names, descriptions, ingredients
- Romanian diacritics handling (ă, â, î, ș, ț)
- Flexible word matching

### Natural Language Responses

The AI generates contextual responses:

```
User: "Vreau să mănânc ceva romantic pentru doi"
AI: "Iată câteva restaurante perfecte pentru o seară romantică: 🍽️

⭐ **Kane Restaurant**
📍 Strada Arthur Verona 16, București
🏪 Mediterranean
⭐ Rating: 4.6
📝 Restaurant modern cu bucătărie mediteraneană și atmosphere relaxată..."
```

## 🎨 React Native Features

### Chat Interface
- **Modern Design**: Dark/light theme with violet accents
- **Animations**: Smooth entrance, typing indicators, message animations
- **Smart Input**: Auto-resize, character limit, loading states
- **Suggestions**: Horizontal scrollable quick responses

### Theme Integration
The chat seamlessly integrates with your existing theme system:

```typescript
// Automatic theme detection
const { theme } = useTheme();

// Uses theme colors
backgroundColor: theme.colors.primary
color: theme.colors.text
```

### Navigation Integration
Messages can navigate to other screens:

```typescript
// Restaurant recommendations → Info screen
navigation.navigate("Info", { company: restaurant });

// Event recommendations → EventScreen
navigation.navigate("EventScreen", { event: event });
```

## 🔧 Performance Optimization

### Caching Strategy
1. **Redis Cache**: Response caching (30 min TTL)
2. **Embeddings Cache**: Pre-computed vectors for semantic search
3. **Data Cache**: In-memory restaurant/event data
4. **Request Deduplication**: Prevents duplicate API calls

### Database Optimization
- **Indexes**: Full-text search indexes on all searchable fields
- **Views**: Pre-joined data for common queries
- **Connection Pooling**: Efficient database connections

### Expected Performance
- **Response Time**: 100-500ms (vs 500-2000ms before)
- **Memory Usage**: 100-130MB (vs 150-200MB before)
- **Cache Hit Rate**: 70-80% for common queries

## 📊 Monitoring & Analytics

### Chat Analytics
The system tracks:
- User queries and intents
- Response times
- Search results quality
- User feedback and ratings

### Health Monitoring
```bash
# Check system health
curl http://localhost:5000/health

# Monitor logs
tail -f ai_chat.log
```

## 🚨 Troubleshooting

### Common Issues

**1. MySQL Connection Failed**
```bash
# Check MySQL status
sudo systemctl status mysql

# Verify credentials
mysql -u root -p -e "SELECT 1"
```

**2. Redis Connection Failed**
```bash
# Check Redis status
redis-cli ping

# Should return "PONG"
```

**3. Embedding Model Load Failed**
```bash
# Check Python dependencies
pip install sentence-transformers

# Verify model download
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

**4. React Native Chat Not Loading**
```bash
# Check API connectivity
curl http://localhost:5000/health

# Verify BASE_URL in config.ts
```

### Debug Mode
Enable debug logging in `.env`:
```env
FLASK_DEBUG=true
```

## 🔐 Security Considerations

### Production Deployment
1. **Database Security**: Use dedicated user with minimal privileges
2. **API Authentication**: Implement JWT tokens for production
3. **Rate Limiting**: Add request rate limiting
4. **HTTPS**: Use SSL certificates for production
5. **Environment Variables**: Never commit sensitive data

### Example Production Setup
```python
# Add to ai_chat_api.py for production
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
```

## 🔄 Data Management

### Adding New Data
```sql
-- Add new restaurant
INSERT INTO restaurants (name, category, address, description, rating) 
VALUES ('New Restaurant', 'Italian', 'Address', 'Description', 4.5);

-- Add menu items
INSERT INTO menu_items (restaurant_id, name, description, price, category) 
VALUES (LAST_INSERT_ID(), 'New Dish', 'Description', 25.00, 'Main Course');

-- Refresh AI cache
curl -X POST http://localhost:5000/admin/refresh \
  -H "Authorization: Bearer your_admin_token"
```

### Data Sync
The system automatically refreshes data every hour, or you can trigger manual refresh via the admin endpoint.

## 📈 Future Enhancements

### Planned Features
1. **Multi-language Support**: English, French translations
2. **Voice Input**: Speech-to-text integration
3. **Image Recognition**: Food photo analysis
4. **Personalization**: User preference learning
5. **Recommendation Engine**: Collaborative filtering
6. **Social Features**: Reviews and ratings
7. **Location-based**: GPS integration for nearby recommendations

### Extension Points
The system is designed for easy extension:

```python
# Add new intent type
def classify_intent(self, query: str) -> str:
    # Add your custom intent patterns
    custom_patterns = {
        'delivery': ['delivery', 'order online', 'takeout']
    }
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

### Testing
```bash
# Run tests
pytest tests/

# Test API endpoints
python -m pytest tests/test_api.py
```

## 📚 Resources

- [Sentence Transformers Documentation](https://www.sbert.net/)
- [Flask API Documentation](https://flask.palletsprojects.com/)
- [MySQL 8.0 Reference](https://dev.mysql.com/doc/refman/8.0/en/)
- [Redis Documentation](https://redis.io/documentation)
- [React Navigation](https://reactnavigation.org/)

## 📄 License

This enhanced AI system is part of your restaurant discovery application. Please ensure compliance with all dependencies' licenses.

---

**Need Help?** Check the troubleshooting section or create an issue in your repository for support.