#!/usr/bin/env python3
"""
Advanced AI System Startup Script
Launches the enhanced ChatGPT-like AI engine with all advanced features
"""

import os
import sys
import time
import signal
import logging
import subprocess
from pathlib import Path
import requests
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5298')  # Default to localhost
AI_PORT = int(os.getenv('AI_PORT', 5001))
AI_HOST = os.getenv('AI_HOST', '0.0.0.0')

def print_banner():
    """Print startup banner"""
    print("\n" + "="*80)
    print("🚀 ADVANCED AI RESTAURANT & EVENT RECOMMENDATION SYSTEM")
    print("="*80)
    print("🤖 ChatGPT-like conversational AI with:")
    print("   ✨ Context-aware conversations")
    print("   🧠 Semantic search & embeddings")
    print("   💬 Streaming responses")
    print("   📝 Conversation memory")
    print("   🎯 Intelligent recommendations")
    print("   📊 Performance analytics")
    print("="*80)

def check_dependencies():
    """Check and install dependencies"""
    print("\n🔍 Checking dependencies...")
    
    required_basic = ['flask', 'flask_cors', 'requests']
    optional_ml = ['sentence_transformers', 'numpy', 'scikit-learn']
    optional_cache = ['redis']
    
    missing_basic = []
    missing_ml = []
    missing_cache = []
    
    # Check basic dependencies
    for module in required_basic:
        try:
            __import__(module)
        except ImportError:
            missing_basic.append(module)
    
    # Check ML dependencies
    for module in optional_ml:
        try:
            __import__(module)
        except ImportError:
            missing_ml.append(module)
    
    # Check cache dependencies
    for module in optional_cache:
        try:
            __import__(module)
        except ImportError:
            missing_cache.append(module)
    
    # Report status
    if missing_basic:
        print(f"❌ Missing REQUIRED dependencies: {', '.join(missing_basic)}")
        print("Installing basic dependencies...")
        install_basic_deps()
    else:
        print("✅ Basic dependencies OK")
    
    if missing_ml:
        print(f"⚠️  Missing ML dependencies: {', '.join(missing_ml)}")
        print("   (Optional - AI will use keyword search without these)")
    else:
        print("✅ ML dependencies OK - Advanced semantic search enabled")
    
    if missing_cache:
        print(f"⚠️  Missing cache dependencies: {', '.join(missing_cache)}")
        print("   (Optional - AI will work without caching)")
    else:
        print("✅ Cache dependencies OK - Redis caching enabled")
    
    return len(missing_basic) == 0

def install_basic_deps():
    """Install basic dependencies"""
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 
                             'flask', 'flask-cors', 'requests', 'python-dotenv'])
        print("✅ Basic dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    return True

def install_ml_deps():
    """Install ML dependencies (optional)"""
    try:
        print("📦 Installing ML dependencies (this may take a while)...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 
                             'sentence-transformers', 'numpy', 'scikit-learn', 'torch'])
        print("✅ ML dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Failed to install ML dependencies: {e}")
        print("   AI will work with basic keyword search")
        return False

def check_backend_connectivity():
    """Check if C# backend is accessible"""
    print(f"\n🔗 Checking backend connectivity: {BACKEND_URL}")
    
    try:
        response = requests.get(f"{BACKEND_URL}/companies", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is accessible")
            return True
        else:
            print(f"⚠️  Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend")
        print("   Make sure your C# backend is running on port 5298")
        return False
    except Exception as e:
        print(f"❌ Backend check failed: {e}")
        return False

def start_ai_server():
    """Start the advanced AI server"""
    print(f"\n🚀 Starting Advanced AI Server...")
    print(f"   Host: {AI_HOST}")
    print(f"   Port: {AI_PORT}")
    print(f"   Backend: {BACKEND_URL}")
    
    try:
        # Import and run the AI server
        from ai_chat_api_advanced import run_ai_server
        run_ai_server()
    except ImportError as e:
        print(f"❌ Failed to import AI server: {e}")
        return False
    except Exception as e:
        print(f"❌ Failed to start AI server: {e}")
        return False

def setup_signal_handlers():
    """Setup graceful shutdown handlers"""
    def signal_handler(sig, frame):
        print("\n\n👋 Shutting down AI system...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

def show_usage_examples():
    """Show API usage examples"""
    print(f"\n📖 API Usage Examples:")
    print(f"   Chat endpoint: POST http://localhost:{AI_PORT}/api/chat")
    print(f"   Example request:")
    print(f"   {{")
    print(f"     \"message\": \"Find me a good Italian restaurant\",")
    print(f"     \"user_id\": \"user123\",")
    print(f"     \"session_id\": \"session456\",")
    print(f"     \"stream\": true")
    print(f"   }}")
    print(f"\n   Health check: GET http://localhost:{AI_PORT}/health")
    print(f"   Metrics: GET http://localhost:{AI_PORT}/api/metrics")

def main():
    """Main startup function"""
    print_banner()
    
    # Setup signal handlers
    setup_signal_handlers()
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Cannot start without basic dependencies")
        
        # Offer to install ML dependencies
        try:
            install_ml = input("\n🤔 Install optional ML dependencies for better AI? (y/N): ").lower().strip()
            if install_ml in ['y', 'yes']:
                install_ml_deps()
        except KeyboardInterrupt:
            print("\n👋 Startup cancelled by user")
            return
    
    # Check backend connectivity
    backend_ok = check_backend_connectivity()
    if not backend_ok:
        print("\n⚠️  Backend not accessible - AI will use mock data")
        try:
            continue_anyway = input("Continue anyway? (y/N): ").lower().strip()
            if continue_anyway not in ['y', 'yes']:
                print("👋 Startup cancelled")
                return
        except KeyboardInterrupt:
            print("\n👋 Startup cancelled by user")
            return
    
    # Show usage examples
    show_usage_examples()
    
    # Start AI server
    print(f"\n🎉 All systems ready! Starting AI engine...")
    time.sleep(1)
    
    try:
        start_ai_server()
    except KeyboardInterrupt:
        print("\n👋 AI system stopped by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
