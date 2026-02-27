from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime
import os

def generate_pdf(ride_data):
    """Generate professional PDF receipt"""
    # Ensure all required fields are present
    if 'pickup' not in ride_data and 'pickup_address' in ride_data:
        ride_data['pickup'] = ride_data['pickup_address']
    if 'drop' not in ride_data and 'drop_address' in ride_data:
        ride_data['drop'] = ride_data['drop_address']
    if 'amount' not in ride_data and 'estimated_price' in ride_data:
        ride_data['amount'] = ride_data['estimated_price']
    
    file_path = f"receipts/receipt_{ride_data['id']}.pdf"
    
def generate_simple_pdf(ride_data):
    """Simple PDF generation for quick testing"""
    # Ensure all required fields are present
    if 'pickup' not in ride_data and 'pickup_address' in ride_data:
        ride_data['pickup'] = ride_data['pickup_address']
    if 'drop' not in ride_data and 'drop_address' in ride_data:
        ride_data['drop'] = ride_data['drop_address']
    if 'amount' not in ride_data and 'estimated_price' in ride_data:
        ride_data['amount'] = ride_data['estimated_price']
    
    os.makedirs("receipts", exist_ok=True)
    file_path = f"receipts/receipt_{ride_data.get('id', 0)}.pdf"

def generate_simple_pdf(ride_data):
    """Simple PDF generation for quick testing"""
    os.makedirs("receipts", exist_ok=True)
    file_path = f"receipts/receipt_{ride_data.get('id', 0)}.pdf"
    
    c = canvas.Canvas(file_path, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.setFillColorRGB(0.2, 0.4, 0.6)  # Blue color
    c.drawString(100, 750, "PYCAB RIDE RECEIPT")
    
    # Receipt Details
    c.setFont("Helvetica", 12)
    c.setFillColorRGB(0, 0, 0)  # Black color
    c.drawString(100, 720, f"Receipt #: PYC-{ride_data.get('id', 0):06d}")
    c.drawString(100, 700, f"Date: {datetime.now().strftime('%d/%m/%Y %I:%M %p')}")
    c.drawString(100, 680, f"Customer ID: {ride_data.get('user_id', 'N/A')}")
    
    # Ride Details
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 650, "Ride Details:")
    
    c.setFont("Helvetica", 12)
    c.drawString(120, 630, f"From: {ride_data.get('pickup', 'N/A')}")
    c.drawString(120, 610, f"To: {ride_data.get('drop', 'N/A')}")
    c.drawString(120, 590, f"Distance: {ride_data.get('distance', 0):.2f} km")
    
    # Payment Details
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 550, "Payment Summary:")
    
    c.setFont("Helvetica", 12)
    y_position = 530
    base_fare = 50
    amount = float(ride_data.get('amount', 0))
    distance_charges = amount - base_fare
    tax = amount * 0.18
    
    c.drawString(120, y_position, f"Base Fare: ₹{base_fare:.2f}")
    y_position -= 20
    c.drawString(120, y_position, f"Distance Charges: ₹{distance_charges:.2f}")
    y_position -= 20
    c.drawString(120, y_position, f"Tax (18% GST): ₹{tax:.2f}")
    y_position -= 30
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(120, y_position, f"Total: ₹{amount:.2f}")
    y_position -= 40
    
    # Payment Status
    c.setFont("Helvetica", 12)
    c.drawString(100, y_position, f"Payment Status: ✅ PAID")
    y_position -= 20
    c.drawString(100, y_position, f"Transaction ID: TXN-{ride_data.get('id', 0):06d}")
    
    # Footer
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawString(100, 100, "Thank you for choosing PyCab!")
    c.drawString(100, 85, "This is a computer-generated receipt.")
    c.drawString(100, 70, "For support: support@pycab.com")
    
    c.save()
    
    print(f"✅ Simple receipt generated: {file_path}")
    return file_path