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
