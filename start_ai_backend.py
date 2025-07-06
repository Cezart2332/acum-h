#!/usr/bin/env python3
"""
Startup script for the Backend-Based AI Recommender System
This script starts the AI system that connects to the C# backend instead of MySQL
"""

import os
import sys
import time
import signal
import logging
import subprocess
from pathlib import Path
from config_backend import BackendConfig
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are available"""
    try:
        import flask
        import redis
        import requests
        import openai
        import numpy
        import sklearn
        import sentence_transformers
        logger.info("All dependencies available")
        return True
    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        logger.error("Please install requirements: pip install -r requirements_backend.txt")
        return False

def check_backend_connection():
    """Check if C# backend is accessible"""
    try:
        response = requests.get(f"{BackendConfig.BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            logger.info("C# backend is accessible")
            return True
        else:
            logger.warning(f"C# backend responded with status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        logger.error(f"Cannot connect to C# backend at {BackendConfig.BACKEND_URL}: {e}")
        return False

def check_redis_connection():
    """Check if Redis is accessible (optional)"""
    try:
        import redis
        r = redis.Redis(**BackendConfig.REDIS_CONFIG)
        r.ping()
        logger.info("Redis is accessible")
        return True
    except Exception as e:
        logger.warning(f"Redis not accessible: {e}")
        logger.warning("AI system will run without caching")
        return False

def start_backend_if_needed():
    """Check if we need to start the C# backend"""
    if not check_backend_connection():
        logger.info("C# backend is not running. Checking if we can start it...")
        
        # Look for the C# backend executable
        backend_path = Path("backend/WebApplication1/WebApplication1/bin/Debug/net8.0/WebApplication1.exe")
        if backend_path.exists():
            logger.info(f"Found C# backend at {backend_path}")
            try:
                subprocess.Popen([str(backend_path)], cwd=backend_path.parent)
                logger.info("Started C# backend. Waiting for it to be ready...")
                time.sleep(5)  # Give it time to start
                
                # Check again
                if check_backend_connection():
                    logger.info("C# backend is now running")
                    return True
                else:
                    logger.error("C# backend failed to start properly")
                    return False
            except Exception as e:
                logger.error(f"Failed to start C# backend: {e}")
                return False
        else:
            logger.error("C# backend executable not found. Please build and run the C# backend manually.")
            return False
    else:
        return True

def create_env_file():
    """Create .env file with default configuration"""
    env_file = Path(".env")
    if not env_file.exists():
        logger.info("Creating .env file with default configuration")
        with open(env_file, 'w') as f:
            f.write(BackendConfig.ENV_TEMPLATE)
        logger.info("Created .env file. Please edit it with your configuration.")

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info("Received shutdown signal. Cleaning up...")
    sys.exit(0)

def main():
    """Main startup function"""
    print("=== Backend-Based AI Recommender System ===")
    print("Starting AI system with C# backend integration...")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Print and validate configuration
    BackendConfig.print_config()
    if not BackendConfig.validate_config():
        logger.error("Configuration validation failed")
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        logger.error("Dependency check failed")
        sys.exit(1)
    
    # Create .env file if needed
    create_env_file()
    
    # Check/start C# backend
    if not start_backend_if_needed():
        logger.error("C# backend is not available")
        logger.error("Please start the C# backend manually:")
        logger.error("1. cd backend/WebApplication1/WebApplication1")
        logger.error("2. dotnet run")
        sys.exit(1)
    
    # Check Redis (optional)
    check_redis_connection()
    
    # Start the AI API
    logger.info("Starting AI API server...")
    try:
        from ai_chat_api_backend import app, initialize_ai_recommender
        
        # Initialize the AI recommender
        initialize_ai_recommender()
        
        # Start the Flask app
        app.run(
            host=BackendConfig.API_HOST,
            port=BackendConfig.API_PORT,
            debug=BackendConfig.API_DEBUG
        )
        
    except Exception as e:
        logger.error(f"Failed to start AI API: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()