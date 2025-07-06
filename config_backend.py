"""
Configuration file for the backend-based AI Recommender System
This replaces the MySQL direct connection with C# backend API calls
"""

import os
from typing import Dict, Any, Optional

class BackendConfig:
    """Configuration for the backend-based AI system"""
    
    # C# Backend Configuration
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5298')
    BACKEND_TIMEOUT = int(os.getenv('BACKEND_TIMEOUT', '30'))
    
    # Redis Configuration (optional, for caching)
    REDIS_CONFIG = {
        'host': os.getenv('REDIS_HOST', 'localhost'),
        'port': int(os.getenv('REDIS_PORT', 6379)),
        'db': int(os.getenv('REDIS_DB', 0)),
        'password': os.getenv('REDIS_PASSWORD', None)
    }
    
    # AI Model Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', None)
    EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
    
    # Cache Configuration
    CACHE_TTL = int(os.getenv('CACHE_TTL', 3600))  # 1 hour
    DATA_REFRESH_INTERVAL = int(os.getenv('DATA_REFRESH_INTERVAL', 300))  # 5 minutes
    
    # API Configuration
    API_PORT = int(os.getenv('API_PORT', 5001))
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_DEBUG = os.getenv('API_DEBUG', 'False').lower() == 'true'
    
    # Security Configuration
    ADMIN_TOKEN = os.getenv('ADMIN_TOKEN', 'admin123')
    
    # Search Configuration
    MAX_RESULTS = int(os.getenv('MAX_RESULTS', 10))
    SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', 0.3))
    
    @classmethod
    def get_ai_config(cls) -> Dict[str, Any]:
        """Get configuration for AI recommender initialization"""
        return {
            'backend_url': cls.BACKEND_URL,
            'redis_config': cls.REDIS_CONFIG if cls.REDIS_CONFIG['host'] else None,
            'openai_api_key': cls.OPENAI_API_KEY,
            'embedding_model': cls.EMBEDDING_MODEL,
            'cache_ttl': cls.CACHE_TTL,
            'max_results': cls.MAX_RESULTS,
            'request_timeout': cls.BACKEND_TIMEOUT
        }
    
    @classmethod
    def validate_config(cls) -> bool:
        """Validate configuration settings"""
        if not cls.BACKEND_URL:
            print("ERROR: BACKEND_URL is required")
            return False
        
        if cls.BACKEND_URL.startswith('http://localhost') or cls.BACKEND_URL.startswith('http://127.0.0.1'):
            print("WARNING: Using localhost backend URL. Make sure C# backend is running.")
        
        if not cls.OPENAI_API_KEY:
            print("WARNING: OPENAI_API_KEY not set. Will use rule-based responses only.")
        
        if cls.CACHE_TTL < 60:
            print("WARNING: CACHE_TTL is very low. Consider increasing for better performance.")
        
        return True
    
    @classmethod
    def print_config(cls):
        """Print current configuration"""
        print("=== Backend-Based AI Configuration ===")
        print(f"Backend URL: {cls.BACKEND_URL}")
        print(f"Backend Timeout: {cls.BACKEND_TIMEOUT}s")
        print(f"Redis Host: {cls.REDIS_CONFIG['host']}")
        print(f"OpenAI Enabled: {'Yes' if cls.OPENAI_API_KEY else 'No'}")
        print(f"Embedding Model: {cls.EMBEDDING_MODEL}")
        print(f"Cache TTL: {cls.CACHE_TTL}s")
        print(f"API Port: {cls.API_PORT}")
        print(f"Max Results: {cls.MAX_RESULTS}")
        print("=====================================")

# Environment variable examples for .env file
ENV_TEMPLATE = """
# C# Backend Configuration
BACKEND_URL=http://localhost:5298
BACKEND_TIMEOUT=30

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Cache Configuration
CACHE_TTL=3600
DATA_REFRESH_INTERVAL=300

# API Configuration
API_PORT=5001
API_HOST=0.0.0.0
API_DEBUG=false

# Security
ADMIN_TOKEN=your_admin_token_here

# Search Configuration
MAX_RESULTS=10
SIMILARITY_THRESHOLD=0.3
"""

if __name__ == '__main__':
    BackendConfig.print_config()
    BackendConfig.validate_config()