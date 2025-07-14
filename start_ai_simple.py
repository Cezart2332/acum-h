#!/usr/bin/env python3
"""
Simple AI Server Starter - Quick launch for development
"""
import os
import sys

print("🚀 Starting AI Server...")
print("🌐 Server will be available at: http://localhost:5001")
print("🔗 Backend URL: http://localhost:5298")
print("📖 Test endpoints:")
print("   GET  /health - Health check")
print("   GET  /test - Simple test")
print("   POST /api/chat - Main chat interface")
print("\n🔥 Starting server...\n")

# Set environment variables
os.environ['BACKEND_URL'] = 'http://localhost:5298'
os.environ['AI_PORT'] = '5001'
os.environ['AI_HOST'] = '0.0.0.0'

try:
    # Import and run the server
    from ai_chat_api_advanced import app, initialize_ai_engine
    
    # Initialize AI engine
    print("🧠 Initializing AI engine...")
    ai_initialized = initialize_ai_engine()
    
    if ai_initialized:
        print("✅ Advanced AI engine initialized")
    else:
        print("⚠️  Using fallback AI engine (backend not available)")
    
    print(f"\n🎯 Server starting on http://0.0.0.0:5001")
    print("💡 Use Ctrl+C to stop\n")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=False,
        threaded=True
    )
    
except KeyboardInterrupt:
    print("\n👋 Server stopped by user")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you have installed the required dependencies:")
    print("pip install flask flask-cors requests")
except Exception as e:
    print(f"❌ Error starting server: {e}")
    import traceback
    traceback.print_exc()
    missing = []
    
    for module in required_modules:
        try:
            __import__(module)
        except ImportError:
            missing.append(module)
    
    if missing:
        print(f"❌ Missing required dependencies: {', '.join(missing)}")
        print("Please install with: pip install flask flask-cors requests")
        return False
    
    print("✅ Basic dependencies available")
    return True

def check_optional_dependencies():
    """Check optional ML dependencies"""
    optional_modules = {
        'numpy': 'Scientific computing',
        'sklearn': 'Machine learning',
        'sentence_transformers': 'Text embeddings',
        'redis': 'Caching'
    }
    
    available = []
    missing = []
    
    for module, description in optional_modules.items():
        try:
            __import__(module)
            available.append(f"{module} ({description})")
        except ImportError:
            missing.append(f"{module} ({description})")
    
    if available:
        print(f"✅ Optional features available: {', '.join(available)}")
    
    if missing:
        print(f"ℹ️ Optional features disabled: {', '.join(missing)}")
        print("   System will work with basic keyword search only")
    
    return True

def check_backend_connection():
    """Check if C# backend is accessible"""
    try:
        response = requests.get(f"{BACKEND_URL}/companies", timeout=5)
        if response.status_code == 200:
            companies = response.json()
            print(f"✅ C# backend accessible - found {len(companies)} companies")
            return True
        else:
            print(f"⚠️ C# backend responded with status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to C# backend at {BACKEND_URL}")
        print(f"   Error: {e}")
        return False

def start_backend_if_needed():
    """Try to start C# backend if it's not running"""
    if not check_backend_connection():
        print("Attempting to start C# backend...")
        
        # Look for the C# backend executable or project file
        backend_paths = [
            "backend/WebApplication1/WebApplication1/bin/Debug/net8.0/WebApplication1.exe",
            "backend/WebApplication1/WebApplication1/WebApplication1.csproj"
        ]
        
        for path in backend_paths:
            if Path(path).exists():
                try:
                    if path.endswith('.exe'):
                        subprocess.Popen([str(Path(path))], cwd=Path(path).parent)
                        print(f"Started C# backend from: {path}")
                    elif path.endswith('.csproj'):
                        subprocess.Popen(['dotnet', 'run'], cwd=Path(path).parent)
                        print(f"Started C# backend with dotnet run from: {Path(path).parent}")
                    
                    # Wait for it to start
                    print("Waiting for backend to start...")
                    for i in range(10):
                        time.sleep(1)
                        if check_backend_connection():
                            print("✅ C# backend is now running")
                            return True
                        print(f"   Checking... ({i+1}/10)")
                    
                    print("❌ C# backend failed to start properly")
                    return False
                    
                except Exception as e:
                    print(f"❌ Failed to start C# backend: {e}")
                    continue
        
        print("❌ C# backend executable/project not found")
        print("Please start the C# backend manually:")
        print("1. cd backend/WebApplication1/WebApplication1")
        print("2. dotnet run")
        return False
    else:
        return True

def create_minimal_requirements():
    """Create minimal requirements file if it doesn't exist"""
    minimal_req = """# Minimal requirements for AI system without ML
flask>=2.0.0
flask-cors>=3.0.0
requests>=2.25.0
python-dotenv>=0.19.0
"""
    
    req_file = Path("requirements_minimal.txt")
    if not req_file.exists():
        with open(req_file, 'w') as f:
            f.write(minimal_req)
        print(f"Created {req_file} with minimal requirements")

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print("\nReceived shutdown signal. Cleaning up...")
    sys.exit(0)

def main():
    """Main startup function"""
    print("=== Simplified Backend-Based AI System ===")
    print("Starting AI system with C# backend integration (no OpenAI required)")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Port: {API_PORT}")
    print()
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check dependencies
    if not check_basic_dependencies():
        create_minimal_requirements()
        print("\nTo install minimal requirements:")
        print("pip install -r requirements_minimal.txt")
        print("\nOr install manually:")
        print("pip install flask flask-cors requests python-dotenv")
        sys.exit(1)
    
    # Check optional dependencies
    check_optional_dependencies()
    
    # Check/start C# backend
    if not start_backend_if_needed():
        print("\n⚠️ Continuing without C# backend (limited functionality)")
        print("AI will work but with limited data")
    
    # Start the AI API
    print(f"\nStarting simplified AI API server on {API_HOST}:{API_PORT}...")
    try:
        # Import and start the simplified API
        from ai_chat_api_simple import app, initialize_ai_recommender
        
        # Initialize the AI recommender
        print("Initializing AI recommender...")
        initialize_ai_recommender()
        
        print("✅ AI system initialized successfully!")
        print(f"🚀 Server running at http://{API_HOST}:{API_PORT}")
        print("\nEndpoints available:")
        print(f"  • Health check: http://{API_HOST}:{API_PORT}/health")
        print(f"  • Chat: POST http://{API_HOST}:{API_PORT}/chat")
        print(f"  • Suggestions: http://{API_HOST}:{API_PORT}/chat/suggestions")
        print("\nPress Ctrl+C to stop")
        
        # Start the Flask app
        app.run(
            host=API_HOST,
            port=API_PORT,
            debug=False  # Disable debug mode for production
        )
        
    except ImportError as e:
        print(f"❌ Failed to import AI modules: {e}")
        print("Make sure all files are in the correct location:")
        print("  • ai_chat_api_simple.py")
        print("  • ai_recommender_backend_simple.py")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Failed to start AI API: {e}")
        sys.exit(1)

def test_system():
    """Test the system with a simple request"""
    try:
        print("\nTesting system...")
        response = requests.get(f"http://localhost:{API_PORT}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ System test successful!")
            print(f"   Status: {data.get('status', 'unknown')}")
            return True
        else:
            print(f"❌ System test failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ System test failed: {e}")
        return False

if __name__ == '__main__':
    # Check if we want to run tests
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        test_system()
    else:
        main()