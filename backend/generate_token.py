import secrets
import hashlib
from datetime import datetime

def generate_admin_token():
    """Generate a secure admin token"""
    # Generate random token
    token = secrets.token_urlsafe(32)
    
    # Add timestamp for uniqueness
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # Create final token
    secure_token = f"pycab-admin-{timestamp}-{token[:20]}"
    
    print("="*50)
    print("GENERATE SECURE ADMIN TOKEN")
    print("="*50)
    print(f"Token: {secure_token}")
    print(f"Length: {len(secure_token)} characters")
    print("\nINSTRUCTIONS:")
    print("1. Copy this token to your backend .env file:")
    print(f'   ADMIN_TOKEN="{secure_token}"')
    print("\n2. Update frontend AdminLogin.jsx with the same token")
    print("\n3. Store this token securely!")
    print("="*50)
    
    return secure_token

if __name__ == "__main__":
    generate_admin_token()