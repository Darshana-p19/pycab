# run_tests.py
#!/usr/bin/env python3
"""
Comprehensive test runner for PyCab
Run: python run_tests.py
"""

import subprocess
import sys
import os
from datetime import datetime

def run_command(command, description):
    print(f"\n{'='*60}")
    print(f"📋 {description}")
    print(f"{'='*60}")
    
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    
    if result.stderr:
        print(f"STDERR: {result.stderr}")
    
    return result.returncode == 0

def main():
    print("🚀 PyCab - Complete Test Suite")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Set environment for testing
    os.environ["ENVIRONMENT"] = "testing"
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
    
    tests_passed = 0
    tests_failed = 0
    
    # 1. Syntax and import checks
    print("\n🔍 Phase 1: Syntax & Imports")
    print("-" * 40)
    
    # Check main imports
    try:
        import main
        print("✅ Main imports successful")
        tests_passed += 1
    except Exception as e:
        print(f"❌ Main imports failed: {e}")
        tests_failed += 1
    
    # Check database models
    try:
        from models.ride import Ride
        from models.user import User
        from models.booking import Booking
        print("✅ Model imports successful")
        tests_passed += 1
    except Exception as e:
        print(f"❌ Model imports failed: {e}")
        tests_failed += 1
    
    # 2. Run unit tests
    print("\n🔍 Phase 2: Unit Tests")
    print("-" * 40)
    
    unit_success = run_command(
        "python -m pytest tests/test_*.py -v --tb=short -x",
        "Running unit tests"
    )
    
    if unit_success:
        print("✅ Unit tests passed")
        tests_passed += 1
    else:
        print("❌ Unit tests failed")
        tests_failed += 1
    
    # 3. Run integration tests
    print("\n🔍 Phase 3: Integration Tests")
    print("-" * 40)
    
    integration_success = run_command(
        "python -m pytest tests/test_e2e.py -v --tb=short",
        "Running integration tests"
    )
    
    if integration_success:
        print("✅ Integration tests passed")
        tests_passed += 1
    else:
        print("❌ Integration tests failed")
        tests_failed += 1
    
    # 4. API Contract tests
    print("\n🔍 Phase 4: API Contract Tests")
    print("-" * 40)
    
    # Start server in background for API tests
    import subprocess
    import time
    import requests
    
    # Try to connect to running server
    try:
        response = requests.get("http://localhost:8000/", timeout=2)
        if response.status_code == 200:
            print("✅ API server is running")
            tests_passed += 1
        else:
            print("❌ API server responded with non-200")
            tests_failed += 1
    except:
        print("⚠️  API server not running (start with: uvicorn main:app --reload)")
    
    # 5. Security checks
    print("\n🔍 Phase 5: Security Checks")
    print("-" * 40)
    
    # Check for common security issues
    security_checks = [
        ("Checking for hardcoded secrets...", 
         'grep -r "password\|secret\|key" --include="*.py" . | grep -v "__pycache__" | grep -v "test_" | head -10'),
        ("Checking dependency vulnerabilities...",
         "pip list --outdated"),
    ]
    
    for check_name, command in security_checks:
        print(f"\n{check_name}")
        run_command(command, "")
    
    # 6. Performance check
    print("\n🔍 Phase 6: Performance Check")
    print("-" * 40)
    
    # Simple load test simulation
    import time
    start_time = time.time()
    
    # Simulate some database operations
    try:
        from sqlmodel import create_engine
        engine = create_engine("sqlite:///:memory:")
        from models.ride import Ride as BaseRide
        BaseRide.metadata.create_all(engine)
        
        perf_time = time.time() - start_time
        print(f"✅ Database operations: {perf_time:.2f} seconds")
        if perf_time < 5:
            tests_passed += 1
        else:
            print("⚠️  Performance warning: Database operations slow")
            tests_failed += 1
    except Exception as e:
        print(f"❌ Performance check failed: {e}")
        tests_failed += 1
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total Checks: {tests_passed + tests_failed}")
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    
    if tests_failed == 0:
        print("\n🎉 All tests passed! Ready for deployment.")
        return 0
    else:
        print(f"\n⚠️  {tests_failed} test(s) failed. Please fix before deployment.")
        return 1

if __name__ == "__main__":
    sys.exit(main())