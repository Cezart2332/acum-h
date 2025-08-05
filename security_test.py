#!/usr/bin/env python3
"""
AcoomH Security Verification Script
Automated security testing for production deployment
"""

import requests
import json
import sys
import time
import ssl
import socket
from urllib.parse import urlparse
import subprocess

class SecurityTester:
    def __init__(self, base_url="https://api.acoomh.ro"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.test_results = []
        
    def log_result(self, test_name, status, details=""):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.test_results.append(result)
        status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_symbol} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
    
    def test_ssl_configuration(self):
        """Test SSL/TLS configuration"""
        try:
            parsed_url = urlparse(self.base_url)
            hostname = parsed_url.hostname
            port = parsed_url.port or 443
            
            # Create SSL context
            context = ssl.create_default_context()
            
            # Test SSL connection
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    protocol = ssock.version()
                    
                    if protocol in ["TLSv1.2", "TLSv1.3"]:
                        self.log_result("SSL/TLS Protocol", "PASS", f"Using {protocol}")
                    else:
                        self.log_result("SSL/TLS Protocol", "FAIL", f"Insecure protocol: {protocol}")
                        
        except Exception as e:
            self.log_result("SSL/TLS Configuration", "FAIL", str(e))
    
    def test_security_headers(self):
        """Test security headers"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            headers = response.headers
            
            # Check HSTS
            if 'Strict-Transport-Security' in headers:
                hsts = headers['Strict-Transport-Security']
                if 'max-age=' in hsts and int(hsts.split('max-age=')[1].split(';')[0]) >= 31536000:
                    self.log_result("HSTS Header", "PASS", f"Max-age: {hsts}")
                else:
                    self.log_result("HSTS Header", "WARN", "HSTS max-age too short")
            else:
                self.log_result("HSTS Header", "FAIL", "Missing HSTS header")
            
            # Check other security headers
            security_headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
                'X-XSS-Protection': '1; mode=block'
            }
            
            for header, expected in security_headers.items():
                if header in headers:
                    value = headers[header]
                    if isinstance(expected, list):
                        if value in expected:
                            self.log_result(f"{header} Header", "PASS", value)
                        else:
                            self.log_result(f"{header} Header", "WARN", f"Unexpected value: {value}")
                    else:
                        if value == expected:
                            self.log_result(f"{header} Header", "PASS", value)
                        else:
                            self.log_result(f"{header} Header", "WARN", f"Expected: {expected}, Got: {value}")
                else:
                    self.log_result(f"{header} Header", "FAIL", "Missing header")
                    
        except Exception as e:
            self.log_result("Security Headers", "FAIL", str(e))
    
    def test_authentication(self):
        """Test authentication security"""
        try:
            # Test invalid credentials
            response = self.session.post(f"{self.base_url}/api/auth/login", 
                                       json={"email": "invalid@test.com", "password": "wrongpassword"},
                                       timeout=10)
            
            if response.status_code == 401:
                self.log_result("Authentication Rejection", "PASS", "Invalid credentials rejected")
            else:
                self.log_result("Authentication Rejection", "FAIL", f"Unexpected status: {response.status_code}")
            
            # Test protected endpoint without token
            response = self.session.get(f"{self.base_url}/api/users/profile", timeout=10)
            
            if response.status_code == 401:
                self.log_result("Protected Endpoint", "PASS", "Unauthorized access rejected")
            else:
                self.log_result("Protected Endpoint", "FAIL", f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Authentication Tests", "FAIL", str(e))
    
    def test_rate_limiting(self):
        """Test rate limiting"""
        try:
            # Make multiple rapid requests
            responses = []
            for i in range(10):
                response = self.session.get(f"{self.base_url}/health", timeout=5)
                responses.append(response.status_code)
                time.sleep(0.1)  # Small delay between requests
            
            # Check if any requests were rate limited
            rate_limited = any(status == 429 for status in responses)
            
            if rate_limited:
                self.log_result("Rate Limiting", "PASS", "Rate limiting is active")
            else:
                self.log_result("Rate Limiting", "WARN", "No rate limiting detected")
                
        except Exception as e:
            self.log_result("Rate Limiting", "FAIL", str(e))
    
    def test_http_methods(self):
        """Test HTTP method security"""
        try:
            # Test unsupported methods
            unsupported_methods = ['TRACE', 'OPTIONS', 'PUT', 'DELETE']
            
            for method in unsupported_methods:
                response = self.session.request(method, f"{self.base_url}/health", timeout=10)
                
                if response.status_code in [405, 501]:
                    self.log_result(f"HTTP {method} Method", "PASS", f"Method rejected: {response.status_code}")
                else:
                    self.log_result(f"HTTP {method} Method", "WARN", f"Method allowed: {response.status_code}")
                    
        except Exception as e:
            self.log_result("HTTP Methods", "FAIL", str(e))
    
    def test_error_handling(self):
        """Test error handling and information disclosure"""
        try:
            # Test 404 error
            response = self.session.get(f"{self.base_url}/nonexistent", timeout=10)
            
            if response.status_code == 404:
                # Check for information disclosure in error response
                response_text = response.text.lower()
                sensitive_keywords = ['stack trace', 'exception', 'server error', 'internal', 'debug']
                
                disclosure_found = any(keyword in response_text for keyword in sensitive_keywords)
                
                if not disclosure_found:
                    self.log_result("Error Information Disclosure", "PASS", "No sensitive info in 404 response")
                else:
                    self.log_result("Error Information Disclosure", "FAIL", "Potential information disclosure")
            else:
                self.log_result("404 Error Handling", "WARN", f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Error Handling", "FAIL", str(e))
    
    def test_cors_configuration(self):
        """Test CORS configuration"""
        try:
            # Test CORS preflight
            headers = {
                'Origin': 'https://malicious-site.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            response = self.session.options(f"{self.base_url}/api/auth/login", headers=headers, timeout=10)
            
            cors_headers = response.headers.get('Access-Control-Allow-Origin', '')
            
            if cors_headers == '*':
                self.log_result("CORS Configuration", "FAIL", "Wildcard CORS allows all origins")
            elif 'acoomh.ro' in cors_headers or not cors_headers:
                self.log_result("CORS Configuration", "PASS", f"CORS properly restricted: {cors_headers}")
            else:
                self.log_result("CORS Configuration", "WARN", f"CORS headers: {cors_headers}")
                
        except Exception as e:
            self.log_result("CORS Configuration", "FAIL", str(e))
    
    def generate_report(self):
        """Generate security test report"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['status'] == 'PASS'])
        failed_tests = len([r for r in self.test_results if r['status'] == 'FAIL'])
        warning_tests = len([r for r in self.test_results if r['status'] == 'WARN'])
        
        print("\n" + "="*60)
        print("🔒 SECURITY TESTING REPORT")
        print("="*60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warning_tests}")
        print(f"Security Score: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for result in self.test_results:
                if result['status'] == 'FAIL':
                    print(f"  - {result['test']}: {result['details']}")
        
        if warning_tests > 0:
            print("\n⚠️  WARNINGS:")
            for result in self.test_results:
                if result['status'] == 'WARN':
                    print(f"  - {result['test']}: {result['details']}")
        
        # Save detailed report
        with open('security_test_report.json', 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"\n📊 Detailed report saved to: security_test_report.json")
        
        return failed_tests == 0
    
    def run_all_tests(self):
        """Run all security tests"""
        print("🔒 Starting AcoomH Security Verification")
        print(f"🎯 Target: {self.base_url}")
        print("-" * 60)
        
        self.test_ssl_configuration()
        self.test_security_headers()
        self.test_authentication()
        self.test_rate_limiting()
        self.test_http_methods()
        self.test_error_handling()
        self.test_cors_configuration()
        
        return self.generate_report()

def main():
    """Main function"""
    # Allow custom URL via command line
    base_url = sys.argv[1] if len(sys.argv) > 1 else "https://api.acoomh.ro"
    
    # For local testing, use localhost
    if base_url == "local":
        base_url = "https://localhost:5001"
    
    tester = SecurityTester(base_url)
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n❌ Security testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Security testing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
