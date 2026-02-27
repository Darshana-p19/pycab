# test_receipt.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pdf.receipt import generate_simple_pdf

# Test receipt generation
test_ride = {
    "id": 25,
    "user_id": "test_user_123",
    "pickup": "Mumbai Airport",
    "drop": "Andheri West",
    "distance": 22.5,
    "amount": 275.50,
    "created_at": "2024-01-27T15:14:50"
}

pdf_path = generate_simple_pdf(test_ride)
print(f"✅ Test receipt generated at: {pdf_path}")
print(f"📄 Open file: {os.path.abspath(pdf_path)}")