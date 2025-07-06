# Backend-Based AI Recommender System

This is a rewritten version of the AI recommender system that connects to a C# backend instead of directly querying a MySQL database. The AI system now gathers data through HTTP API calls to the C# backend, providing better separation of concerns and improved architecture.

## 🔄 Migration from MySQL to C# Backend

### What Changed
- **Data Source**: Changed from direct MySQL queries to C# backend API calls
- **Data Models**: Updated to match C# backend response structure
- **Caching**: Maintained Redis caching for performance
- **API Endpoints**: Updated to work with backend data structure
- **Menu Handling**: Now fetches PDF menus through backend API

### Key Benefits
- **Better Architecture**: Separation of data access and AI logic
- **Scalability**: Can easily switch backend implementations
- **Consistency**: Uses the same data source as the main application
- **Maintainability**: Centralized data access through C# backend

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.8+
- C# backend running (WebApplication1)
- Redis (optional, for caching)
- OpenAI API key (optional, for GPT responses)

### 2. Installation

```bash
# Install Python dependencies
pip install -r requirements_backend.txt

# Create configuration file
cp .env.example .env
# Edit .env with your configuration
```

### 3. Configuration

Edit the `.env` file with your settings:

```env
# C# Backend Configuration
BACKEND_URL=http://localhost:5298
BACKEND_TIMEOUT=30

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here
EMBEDDING_MODEL=all-MiniLM-L6-v2

# API Configuration
API_PORT=5001
API_HOST=0.0.0.0
```

### 4. Running the System

#### Option 1: Using the startup script (recommended)
```bash
python start_ai_backend.py
```

#### Option 2: Manual startup
```bash
# Start C# backend first
cd backend/WebApplication1/WebApplication1
dotnet run

# Start AI API (in another terminal)
python ai_chat_api_backend.py
```

## 📊 Architecture Overview

```
┌─────────────────┐    HTTP API    ┌─────────────────┐    Entity Framework    ┌─────────────────┐
│   AI Frontend   │ ────────────→  │  AI Recommender │  ────────────────────→  │   C# Backend    │
│   (React/etc)   │                │    (Python)     │                        │  (ASP.NET Core) │
└─────────────────┘                └─────────────────┘                        └─────────────────┘
                                           │                                           │
                                           ▼                                           ▼
                                   ┌─────────────────┐                        ┌─────────────────┐
                                   │  Redis Cache    │                        │  MySQL Database │
                                   │   (Optional)    │                        │                 │
                                   └─────────────────┘                        └─────────────────┘
```

## 🔧 API Endpoints

### Core Chat API
- `POST /chat` - Main chat endpoint
- `GET /chat/suggestions` - Get chat suggestions
- `GET /chat/history` - Get chat history
- `POST /chat/feedback` - Submit feedback

### Data Endpoints
- `GET /companies/details/{id}` - Get company details
- `GET /companies/{id}/menu` - Get company menu PDF
- `GET /events/details/{id}` - Get event details
- `POST /search` - Direct search endpoint

### Admin Endpoints
- `GET /health` - Health check
- `POST /admin/refresh` - Refresh data from backend
- `GET /admin/status` - Get system status

## 🎯 Features

### AI Capabilities
- **Intent Classification**: Understands user queries in Romanian
- **Semantic Search**: Uses embeddings for intelligent matching
- **Keyword Search**: Fallback for exact matches
- **Natural Language Responses**: GPT-powered or rule-based responses

### Data Sources
- **Companies**: Restaurant/business data from C# backend
- **Events**: Event information from C# backend
- **Menus**: PDF menus served through backend API

### Performance Features
- **Redis Caching**: Optional caching for improved response times
- **Embedding Cache**: Cached sentence embeddings for fast semantic search
- **Data Refresh**: Automatic data refresh from backend
- **Error Handling**: Robust error handling with fallbacks

## 📋 Data Models

### Restaurant/Company
```python
@dataclass
class Restaurant:
    id: int
    name: str
    category: str
    address: str
    description: str
    rating: float
    contact: str
    image: str
    tags: List[str]
    latitude: float
    longitude: float
    cui: int
```

### Event
```python
@dataclass
class Event:
    id: int
    title: str
    description: str
    photo: str
    tags: List[str]
    likes: int
    company: str
    company_id: int
```

## 🔍 Search Capabilities

### Semantic Search
- Uses sentence transformers for understanding context
- Matches similar concepts even with different words
- Configurable similarity threshold

### Keyword Search
- Exact text matching
- Romanian diacritics normalization
- Fallback when semantic search fails

### Combined Search
- Merges semantic and keyword results
- Deduplicates results
- Relevance scoring

## 🛠️ Configuration Options

### Backend Configuration
- `BACKEND_URL`: C# backend URL
- `BACKEND_TIMEOUT`: Request timeout in seconds

### AI Configuration
- `OPENAI_API_KEY`: OpenAI API key (optional)
- `EMBEDDING_MODEL`: Sentence transformer model

### Cache Configuration
- `REDIS_HOST`: Redis server host
- `CACHE_TTL`: Cache time-to-live in seconds

### Search Configuration
- `MAX_RESULTS`: Maximum search results
- `SIMILARITY_THRESHOLD`: Minimum similarity for semantic search

## 🔐 Security

### Authentication
- Admin endpoints require bearer token
- Configurable admin token
- Request validation

### Data Protection
- No sensitive data in logs
- Secure error handling
- Input validation

## 📊 Monitoring

### Health Checks
- Backend connectivity
- Redis connectivity
- Data freshness
- Model availability

### Logging
- Structured logging
- Performance metrics
- Error tracking

## 🚨 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   ```bash
   # Check if C# backend is running
   curl http://localhost:5298/health
   
   # Start backend manually
   cd backend/WebApplication1/WebApplication1
   dotnet run
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis status
   redis-cli ping
   
   # Start Redis
   redis-server
   ```

3. **Dependencies Missing**
   ```bash
   # Install all dependencies
   pip install -r requirements_backend.txt
   ```

4. **Embedding Model Download**
   ```bash
   # First run will download the model
   # Ensure internet connection and sufficient disk space
   ```

### Debug Mode
```bash
# Enable debug mode
export API_DEBUG=true
python ai_chat_api_backend.py
```

## 📈 Performance Tuning

### Caching Strategy
- Enable Redis for production
- Adjust cache TTL based on data update frequency
- Monitor cache hit rates

### Model Selection
- `all-MiniLM-L6-v2`: Fast, good for most use cases
- `all-mpnet-base-v2`: More accurate but slower
- `distiluse-base-multilingual-cased`: Better for Romanian

### Search Optimization
- Adjust similarity threshold
- Limit result count
- Use keyword search for exact matches

## 🔄 Migration Guide

### From MySQL Version
1. **Stop the old system**
   ```bash
   # Stop ai_chat_api.py
   pkill -f ai_chat_api.py
   ```

2. **Update configuration**
   ```bash
   # Copy configuration
   cp .env .env.mysql.backup
   # Update with backend URL
   ```

3. **Start new system**
   ```bash
   python start_ai_backend.py
   ```

4. **Verify functionality**
   ```bash
   # Test health endpoint
   curl http://localhost:5001/health
   
   # Test chat endpoint
   curl -X POST http://localhost:5001/chat \
     -H "Content-Type: application/json" \
     -d '{"query": "Salut!"}'
   ```

## 🤝 Contributing

### Development Setup
```bash
# Install development dependencies
pip install -r requirements_backend.txt

# Run tests
pytest tests/

# Code formatting
black *.py
flake8 *.py
```

### Code Structure
- `ai_recommender_backend.py`: Main AI logic
- `ai_chat_api_backend.py`: Flask API
- `config_backend.py`: Configuration management
- `start_ai_backend.py`: Startup script

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Ensure C# backend is running
4. Verify configuration settings

## 🔮 Future Enhancements

- Multi-language support
- Advanced caching strategies
- Real-time data updates
- Machine learning model improvements
- Performance analytics dashboard