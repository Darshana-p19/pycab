# test_admin.py
import requests

# Test admin endpoint
url = "http://localhost:8000/admin/rides"
headers = {
    "X-Admin-Token": "admin-secret-token",
    "Content-Type": "application/json"
}

try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nNumber of rides: {len(data)}")
        if data:
            print("\nFirst ride:")
            print(data[0])
except Exception as e:
    print(f"Error: {e}")