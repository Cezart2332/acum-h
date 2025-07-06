#!/usr/bin/env python3
"""
Test script for the Backend-Based AI Recommender System
This script tests the AI system to ensure it works with the C# backend
"""

import os
import sys
import json
import time
import requests
from typing import Dict, Any
from config_backend import BackendConfig

# Test configuration
TEST_CONFIG = {
    'ai_api_url': f'http://localhost:{BackendConfig.API_PORT}',
    'backend_url': BackendConfig.BACKEND_URL,
    'timeout': 30
}

class AIBackendTester:
    def __init__(self):
        self.ai_url = TEST_CONFIG['ai_api_url']
        self.backend_url = TEST_CONFIG['backend_url']
        self.timeout = TEST_CONFIG['timeout']
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'data': data,
            'timestamp': time.time()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"    {message}")
        if not success and data:
            print(f"    Data: {json.dumps(data, indent=2)}")
    
    def test_backend_connection(self):
        """Test C# backend connection"""
        try:
            response = requests.get(f"{self.backend_url}/companies", timeout=5)
            if response.status_code == 200:
                companies = response.json()
                self.log_test(
                    "Backend Connection", 
                    True, 
                    f"Connected successfully, found {len(companies)} companies"
                )
                return True
            else:
                self.log_test(
                    "Backend Connection", 
                    False, 
                    f"Backend responded with status {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_test(
                "Backend Connection", 
                False, 
                f"Cannot connect to backend: {str(e)}"
            )
            return False
    
    def test_ai_health(self):
        """Test AI system health"""
        try:
            response = requests.get(f"{self.ai_url}/health", timeout=self.timeout)
            if response.status_code == 200:
                health_data = response.json()
                self.log_test(
                    "AI Health Check", 
                    True, 
                    f"AI system is healthy, status: {health_data.get('status', 'unknown')}"
                )
                return True
            else:
                self.log_test(
                    "AI Health Check", 
                    False, 
                    f"Health check failed with status {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_test(
                "AI Health Check", 
                False, 
                f"Cannot connect to AI system: {str(e)}"
            )
            return False
    
    def test_chat_endpoint(self):
        """Test chat endpoint with various queries"""
        test_queries = [
            {
                'query': 'Salut!',
                'expected_intent': 'greeting',
                'description': 'Greeting test'
            },
            {
                'query': 'Recomanzi-mi un restaurant',
                'expected_intent': 'restaurant_search',
                'description': 'Restaurant search test'
            },
            {
                'query': 'Ce evenimente sunt disponibile?',
                'expected_intent': 'event_search',
                'description': 'Event search test'
            },
            {
                'query': 'Vreau pizza',
                'expected_intent': 'food_search',
                'description': 'Food search test'
            }
        ]
        
        for test_query in test_queries:
            try:
                response = requests.post(
                    f"{self.ai_url}/chat",
                    json={'query': test_query['query']},
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        intent = data.get('intent', '')
                        response_text = data.get('response', '')
                        
                        self.log_test(
                            f"Chat Test: {test_query['description']}", 
                            True, 
                            f"Intent: {intent}, Response length: {len(response_text)} chars"
                        )
                    else:
                        self.log_test(
                            f"Chat Test: {test_query['description']}", 
                            False, 
                            f"Response marked as unsuccessful",
                            data
                        )
                else:
                    self.log_test(
                        f"Chat Test: {test_query['description']}", 
                        False, 
                        f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Chat Test: {test_query['description']}", 
                    False, 
                    f"Request failed: {str(e)}"
                )
    
    def test_search_endpoint(self):
        """Test search endpoint"""
        test_searches = [
            {
                'query': 'restaurant',
                'type': 'restaurants',
                'description': 'Restaurant search'
            },
            {
                'query': 'eveniment',
                'type': 'events',
                'description': 'Event search'
            },
            {
                'query': 'pizza',
                'type': 'all',
                'description': 'General search'
            }
        ]
        
        for search_test in test_searches:
            try:
                response = requests.post(
                    f"{self.ai_url}/search",
                    json={
                        'query': search_test['query'],
                        'type': search_test['type'],
                        'limit': 5
                    },
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        results = data.get('results', {})
                        total = data.get('total_results', 0)
                        
                        self.log_test(
                            f"Search Test: {search_test['description']}", 
                            True, 
                            f"Found {total} total results"
                        )
                    else:
                        self.log_test(
                            f"Search Test: {search_test['description']}", 
                            False, 
                            "Search marked as unsuccessful",
                            data
                        )
                else:
                    self.log_test(
                        f"Search Test: {search_test['description']}", 
                        False, 
                        f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Search Test: {search_test['description']}", 
                    False, 
                    f"Request failed: {str(e)}"
                )
    
    def test_suggestions_endpoint(self):
        """Test suggestions endpoint"""
        try:
            response = requests.get(f"{self.ai_url}/chat/suggestions", timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    suggestions = data.get('suggestions', [])
                    self.log_test(
                        "Suggestions Test", 
                        True, 
                        f"Retrieved {len(suggestions)} suggestions"
                    )
                else:
                    self.log_test(
                        "Suggestions Test", 
                        False, 
                        "Suggestions marked as unsuccessful",
                        data
                    )
            else:
                self.log_test(
                    "Suggestions Test", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test(
                "Suggestions Test", 
                False, 
                f"Request failed: {str(e)}"
            )
    
    def test_admin_endpoints(self):
        """Test admin endpoints"""
        admin_token = os.getenv('ADMIN_TOKEN', 'admin123')
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # Test admin status
        try:
            response = requests.get(
                f"{self.ai_url}/admin/status", 
                headers=headers, 
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Admin Status Test", 
                    True, 
                    "Admin status endpoint accessible"
                )
            else:
                self.log_test(
                    "Admin Status Test", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test(
                "Admin Status Test", 
                False, 
                f"Request failed: {str(e)}"
            )
    
    def run_all_tests(self):
        """Run all tests"""
        print("=== Backend-Based AI System Test Suite ===\n")
        
        # Test order is important - basic connectivity first
        print("1. Testing Backend Connection...")
        backend_ok = self.test_backend_connection()
        
        print("\n2. Testing AI Health...")
        ai_ok = self.test_ai_health()
        
        if not backend_ok or not ai_ok:
            print("\n❌ Core systems not available. Skipping other tests.")
            self.print_summary()
            return False
        
        print("\n3. Testing Chat Functionality...")
        self.test_chat_endpoint()
        
        print("\n4. Testing Search Functionality...")
        self.test_search_endpoint()
        
        print("\n5. Testing Suggestions...")
        self.test_suggestions_endpoint()
        
        print("\n6. Testing Admin Endpoints...")
        self.test_admin_endpoints()
        
        print("\n" + "="*50)
        self.print_summary()
        
        return self.get_overall_success()
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"\n=== Test Summary ===")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print(f"\n{'✅ All tests passed!' if failed_tests == 0 else '❌ Some tests failed!'}")
    
    def get_overall_success(self):
        """Get overall test success"""
        return all(r['success'] for r in self.test_results)
    
    def save_results(self, filename: str = "test_results.json"):
        """Save test results to file"""
        with open(filename, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        print(f"Test results saved to {filename}")

def main():
    """Main test function"""
    print("Backend-Based AI System Test Suite")
    print("=" * 50)
    
    # Check configuration
    print("Configuration:")
    print(f"  AI API URL: {TEST_CONFIG['ai_api_url']}")
    print(f"  Backend URL: {TEST_CONFIG['backend_url']}")
    print(f"  Timeout: {TEST_CONFIG['timeout']}s")
    print()
    
    # Run tests
    tester = AIBackendTester()
    success = tester.run_all_tests()
    
    # Save results
    tester.save_results()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()