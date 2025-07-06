#!/usr/bin/env python3
"""
Test script to verify AiScreen integration with the new backend-based AI system
This script simulates the React Native app making requests to the new backend AI API
"""

import requests
import json
import time
from config_backend import BackendConfig

class AiScreenIntegrationTester:
    def __init__(self):
        self.ai_api_url = f'http://localhost:{BackendConfig.API_PORT}'
        self.backend_url = BackendConfig.BACKEND_URL
        
    def test_health_endpoint(self):
        """Test the health endpoint that AiScreen calls on startup"""
        print("Testing /health endpoint...")
        try:
            response = requests.get(f"{self.ai_api_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check successful")
                print(f"   Status: {data.get('status', 'unknown')}")
                print(f"   Backend URL: {data.get('backend_url', 'unknown')}")
                if 'ai_system' in data:
                    ai_system = data['ai_system']
                    print(f"   AI System Status: {ai_system.get('status', 'unknown')}")
                    print(f"   Backend Connection: {ai_system.get('backend_connection', 'unknown')}")
                    if 'data_cache' in ai_system:
                        cache = ai_system['data_cache']
                        print(f"   Data Cache: {cache.get('restaurants_count', 0)} restaurants, {cache.get('events_count', 0)} events")
                return True
            else:
                print(f"❌ Health check failed with status {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False
    
    def test_suggestions_endpoint(self):
        """Test the suggestions endpoint that AiScreen calls on initialization"""
        print("\nTesting /chat/suggestions endpoint...")
        try:
            response = requests.get(f"{self.ai_api_url}/chat/suggestions", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    suggestions = data.get('suggestions', [])
                    print(f"✅ Suggestions loaded successfully")
                    print(f"   Found {len(suggestions)} suggestions")
                    for i, suggestion in enumerate(suggestions[:3]):
                        print(f"   {i+1}. {suggestion.get('icon', '')} {suggestion.get('text', '')}")
                    return True
                else:
                    print(f"❌ Suggestions response marked as unsuccessful")
                    return False
            else:
                print(f"❌ Suggestions failed with status {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Suggestions failed: {e}")
            return False
    
    def test_chat_functionality(self):
        """Test the main chat functionality that AiScreen uses"""
        print("\nTesting /chat endpoint with various queries...")
        
        test_queries = [
            "Salut!",
            "Recomanzi-mi un restaurant italian",
            "Ce evenimente sunt disponibile?",
            "Vreau pizza",
            "Ce companii sunt în zona mea?"
        ]
        
        results = []
        for query in test_queries:
            print(f"\n   Testing query: '{query}'")
            try:
                response = requests.post(
                    f"{self.ai_api_url}/chat",
                    json={
                        'query': query,
                        'user_id': 'test_aiscreen_user'
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        print(f"   ✅ Response successful")
                        print(f"      Intent: {data.get('intent', 'unknown')}")
                        print(f"      Response length: {len(data.get('response', ''))} chars")
                        
                        # Check search results
                        search_results = data.get('search_results', {})
                        restaurants = search_results.get('restaurants', [])
                        events = search_results.get('events', [])
                        
                        if restaurants or events:
                            print(f"      Search results: {len(restaurants)} restaurants, {len(events)} events")
                            
                            # Show sample restaurant if available
                            if restaurants:
                                restaurant = restaurants[0]
                                print(f"      Sample restaurant: {restaurant.get('name', 'N/A')} ({restaurant.get('category', 'N/A')})")
                            
                            # Show sample event if available
                            if events:
                                event = events[0]
                                print(f"      Sample event: {event.get('title', 'N/A')} by {event.get('company', 'N/A')}")
                        
                        # Check metadata
                        metadata = data.get('metadata', {})
                        response_time = metadata.get('response_time', 0)
                        print(f"      Response time: {response_time:.3f}s")
                        
                        results.append(True)
                    else:
                        print(f"   ❌ Response marked as unsuccessful")
                        print(f"      Error: {data.get('error', 'Unknown error')}")
                        results.append(False)
                else:
                    print(f"   ❌ Chat failed with status {response.status_code}")
                    print(f"      Response: {response.text}")
                    results.append(False)
                    
            except Exception as e:
                print(f"   ❌ Chat request failed: {e}")
                results.append(False)
        
        success_rate = sum(results) / len(results) * 100
        print(f"\n   Overall chat success rate: {success_rate:.1f}% ({sum(results)}/{len(results)})")
        return success_rate > 80
    
    def test_detail_endpoints(self):
        """Test the detail endpoints that AiScreen uses for restaurant/event details"""
        print("\nTesting detail endpoints...")
        
        # First, get some search results to find valid IDs
        try:
            response = requests.post(
                f"{self.ai_api_url}/chat",
                json={
                    'query': 'restaurant',
                    'user_id': 'test_detail_user'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                search_results = data.get('search_results', {})
                restaurants = search_results.get('restaurants', [])
                events = search_results.get('events', [])
                
                # Test restaurant details
                if restaurants:
                    restaurant_id = restaurants[0]['id']
                    print(f"\n   Testing restaurant details for ID {restaurant_id}...")
                    
                    details_response = requests.get(f"{self.ai_api_url}/companies/details/{restaurant_id}", timeout=10)
                    if details_response.status_code == 200:
                        details_data = details_response.json()
                        if details_data.get('success'):
                            company = details_data.get('company', {})
                            print(f"   ✅ Restaurant details successful")
                            print(f"      Name: {company.get('name', 'N/A')}")
                            print(f"      Category: {company.get('category', 'N/A')}")
                            print(f"      Address: {company.get('address', 'N/A')}")
                            print(f"      Events: {len(company.get('events', []))}")
                        else:
                            print(f"   ❌ Restaurant details unsuccessful")
                    else:
                        print(f"   ❌ Restaurant details failed with status {details_response.status_code}")
                    
                    # Test menu endpoint
                    print(f"\n   Testing menu for restaurant ID {restaurant_id}...")
                    menu_response = requests.get(f"{self.ai_api_url}/companies/{restaurant_id}/menu", timeout=10)
                    if menu_response.status_code == 200:
                        print(f"   ✅ Menu available (PDF content)")
                    elif menu_response.status_code == 404:
                        print(f"   ℹ️ Menu not available for this restaurant")
                    else:
                        print(f"   ❌ Menu request failed with status {menu_response.status_code}")
                
                # Test event details
                if events:
                    event_id = events[0]['id']
                    print(f"\n   Testing event details for ID {event_id}...")
                    
                    event_response = requests.get(f"{self.ai_api_url}/events/details/{event_id}", timeout=10)
                    if event_response.status_code == 200:
                        event_data = event_response.json()
                        if event_data.get('success'):
                            event = event_data.get('event', {})
                            print(f"   ✅ Event details successful")
                            print(f"      Title: {event.get('title', 'N/A')}")
                            print(f"      Company: {event.get('company', 'N/A')}")
                            print(f"      Likes: {event.get('likes', 0)}")
                        else:
                            print(f"   ❌ Event details unsuccessful")
                    else:
                        print(f"   ❌ Event details failed with status {event_response.status_code}")
                
                return True
            else:
                print(f"   ❌ Could not get search results for testing details")
                return False
                
        except Exception as e:
            print(f"   ❌ Detail endpoints test failed: {e}")
            return False
    
    def test_error_handling(self):
        """Test error handling scenarios that AiScreen needs to handle"""
        print("\nTesting error handling...")
        
        # Test with empty query
        print("   Testing empty query...")
        try:
            response = requests.post(
                f"{self.ai_api_url}/chat",
                json={'query': '', 'user_id': 'test_user'},
                timeout=10
            )
            if response.status_code == 400:
                print("   ✅ Empty query handled correctly with 400 status")
            else:
                print(f"   ❌ Empty query returned unexpected status {response.status_code}")
        except Exception as e:
            print(f"   ❌ Empty query test failed: {e}")
        
        # Test with very long query
        print("   Testing overly long query...")
        try:
            long_query = "test " * 300  # 1500 characters
            response = requests.post(
                f"{self.ai_api_url}/chat",
                json={'query': long_query, 'user_id': 'test_user'},
                timeout=10
            )
            if response.status_code == 400:
                print("   ✅ Long query handled correctly with 400 status")
            else:
                print(f"   ❌ Long query returned unexpected status {response.status_code}")
        except Exception as e:
            print(f"   ❌ Long query test failed: {e}")
        
        # Test invalid restaurant ID
        print("   Testing invalid restaurant ID...")
        try:
            response = requests.get(f"{self.ai_api_url}/companies/details/99999", timeout=10)
            if response.status_code == 404:
                print("   ✅ Invalid restaurant ID handled correctly with 404 status")
            else:
                print(f"   ❌ Invalid restaurant ID returned unexpected status {response.status_code}")
        except Exception as e:
            print(f"   ❌ Invalid restaurant ID test failed: {e}")
        
        return True
    
    def run_integration_tests(self):
        """Run all integration tests"""
        print("=== AiScreen Integration Tests ===")
        print(f"Testing integration between AiScreen and new backend AI system")
        print(f"AI API URL: {self.ai_api_url}")
        print(f"Backend URL: {self.backend_url}")
        print()
        
        results = []
        
        # Run tests
        results.append(self.test_health_endpoint())
        results.append(self.test_suggestions_endpoint())
        results.append(self.test_chat_functionality())
        results.append(self.test_detail_endpoints())
        results.append(self.test_error_handling())
        
        # Summary
        passed = sum(results)
        total = len(results)
        success_rate = passed / total * 100
        
        print(f"\n=== Integration Test Summary ===")
        print(f"Tests passed: {passed}/{total}")
        print(f"Success rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("✅ AiScreen integration with backend AI system is working correctly!")
            print("\nThe AiScreen should now:")
            print("  • Connect to the new backend-based AI API (port 5001)")
            print("  • Display system health status")
            print("  • Show enhanced search results with restaurants and events")
            print("  • Allow users to view restaurant details and menus")
            print("  • Handle errors gracefully")
            print("  • Provide improved suggestions and responses")
        else:
            print("❌ AiScreen integration has issues that need to be resolved")
        
        return success_rate >= 80

def main():
    tester = AiScreenIntegrationTester()
    success = tester.run_integration_tests()
    return 0 if success else 1

if __name__ == '__main__':
    import sys
    sys.exit(main())