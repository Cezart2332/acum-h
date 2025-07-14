#!/usr/bin/env python3
"""
AI System Diagnostic Tool
Tests all endpoints and provides troubleshooting information
"""
import requests
import json
import time

def test_endpoint(url, method='GET', data=None):
    """Test an endpoint and return status"""
    try:
        if method == 'GET':
            response = requests.get(url, timeout=5)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=5)
        
        return {
            'status': 'SUCCESS',
            'status_code': response.status_code,
            'response': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
    except requests.exceptions.ConnectionError:
        return {'status': 'CONNECTION_ERROR', 'error': 'Cannot connect to server'}
    except requests.exceptions.Timeout:
        return {'status': 'TIMEOUT', 'error': 'Request timed out'}
    except Exception as e:
        return {'status': 'ERROR', 'error': str(e)}

def main():
    print("🔍 AI SYSTEM DIAGNOSTICS")
    print("=" * 50)
    
    # Test AI server
    print("\n1. Testing AI Server...")
    ai_base_url = "http://localhost:5001"
    
    # Test health endpoint
    print("   Testing health endpoint...")
    health_result = test_endpoint(f"{ai_base_url}/health")
    if health_result['status'] == 'SUCCESS':
        print("   ✅ Health endpoint working")
        print(f"   Response: {health_result['response']}")
    else:
        print(f"   ❌ Health endpoint failed: {health_result['error']}")
    
    # Test chat endpoint
    print("\n   Testing chat endpoint...")
    chat_data = {
        "message": "Hello, can you recommend a restaurant?",
        "user_id": "test_user",
        "session_id": "test_session"
    }
    chat_result = test_endpoint(f"{ai_base_url}/api/chat", method='POST', data=chat_data)
    if chat_result['status'] == 'SUCCESS':
        print("   ✅ Chat endpoint working")
        print(f"   Response: {chat_result['response'].get('response', 'No response text')}")
    else:
        print(f"   ❌ Chat endpoint failed: {chat_result['error']}")
    
    # Test backend connectivity
    print("\n2. Testing C# Backend...")
    backend_url = "http://localhost:5298"
    
    print("   Testing companies endpoint...")
    companies_result = test_endpoint(f"{backend_url}/companies")
    if companies_result['status'] == 'SUCCESS':
        print("   ✅ Backend companies endpoint working")
        companies = companies_result['response']
        print(f"   Found {len(companies) if isinstance(companies, list) else 'unknown'} companies")
    else:
        print(f"   ❌ Backend companies endpoint failed: {companies_result['error']}")
    
    print("   Testing events endpoint...")
    events_result = test_endpoint(f"{backend_url}/events")
    if events_result['status'] == 'SUCCESS':
        print("   ✅ Backend events endpoint working")
        events = events_result['response']
        print(f"   Found {len(events) if isinstance(events, list) else 'unknown'} events")
    else:
        print(f"   ❌ Backend events endpoint failed: {events_result['error']}")
    
    # Network information
    print("\n3. Network Information...")
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"   Computer name: {hostname}")
    print(f"   Local IP: {local_ip}")
    print(f"   AI Server should be accessible at: http://{local_ip}:5001")
    
    # Recommendations
    print("\n4. Troubleshooting Recommendations...")
    
    if health_result['status'] != 'SUCCESS':
        print("   ❌ AI Server not responding:")
        print("      - Make sure you ran: python quick_start_ai.py")
        print("      - Check if port 5001 is available")
        print("      - Try restarting the AI server")
    
    if companies_result['status'] != 'SUCCESS' or events_result['status'] != 'SUCCESS':
        print("   ❌ C# Backend not responding:")
        print("      - Make sure your C# backend is running on port 5298")
        print("      - Check Visual Studio or your backend server")
        print("      - The AI will use fallback mode without backend")
    
    if health_result['status'] == 'SUCCESS' and chat_result['status'] == 'SUCCESS':
        print("   ✅ Everything looks good!")
        print("   🎯 Your AI system is ready to use!")
        print(f"   📱 Update your React Native app to use: http://{local_ip}:5001")

if __name__ == "__main__":
    main()
