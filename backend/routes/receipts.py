from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
import os
import json
from datetime import datetime
from pathlib import Path
import traceback
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

router = APIRouter(tags=["receipts"])

# Email configuration - Use your actual Gmail credentials
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = "your_gmail@gmail.com"  
EMAIL_PASSWORD = "your_password"  

# Create receipts directory
RECEIPTS_DIR = Path("receipts")
RECEIPTS_DIR.mkdir(exist_ok=True)

# Mock ride data for testing when Supabase fails
MOCK_RIDE_DATA = {
    "1": {
        "id": "1",
        "user_id": "test_user_123",
        "user_email": "darshanaparmar1316@gmail.com",
        "user_name": "Darshana Parmar",
        "user_phone": "+91 1234567890",
        "pickup_address": "Mumbai Airport",
        "drop_address": "Andheri West, Mumbai",
        "estimated_price": 287.13,
        "status": "completed",
        "payment_status": "paid",
        "payment_method": "card",
        "distance": 22.5,
        "created_at": "2024-01-27T15:14:50"
    }
}

def send_email_with_receipt(to_email: str, ride_id: str, pdf_path: str) -> bool:
    """Send receipt via email"""
    try:
        print(f"📧 Attempting to send email to: {to_email}")
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        msg['Subject'] = f"PyCab Ride Receipt #{ride_id}"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">🚕 PyCab</h1>
                    <p style="margin: 10px 0 0;">Your Ride Receipt</p>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px;">
                    <h2>Thank you for riding with PyCab!</h2>
                    <p>Your ride receipt is attached to this email.</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e0e0e0;">
                        <h3 style="margin-top: 0;">Ride Details</h3>
                        <p><strong>Ride ID:</strong> #{ride_id}</p>
                        <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    </div>
                    
                    <p>If you have any questions about your ride, please contact our support team at support@pycab.com</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:5173/rides" style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            View Ride History
                        </a>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
                    <p>© {datetime.now().year} PyCab. All rights reserved.</p>
                    <p>Fast, Safe, Reliable Rides</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Attach PDF
        with open(pdf_path, 'rb') as f:
            pdf_attachment = MIMEApplication(f.read(), _subtype="pdf")
            pdf_attachment.add_header('content-disposition', 'attachment', 
                                    filename=f"pycab_receipt_{ride_id}.pdf")
            msg.attach(pdf_attachment)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email sending error: {str(e)}")
        traceback.print_exc()
        return False

def generate_formatted_pdf(ride_data: dict) -> str:
    """Generate properly formatted PDF receipt"""
    try:
        ride_id = ride_data.get("id", "unknown")
        pdf_path = RECEIPTS_DIR / f"receipt_{ride_id}.pdf"
        
        # Create a canvas with proper layout
        c = canvas.Canvas(str(pdf_path), pagesize=letter)
        width, height = letter
        
        # Set colors
        header_color = (0.2, 0.4, 0.6)  # Blue
        accent_color = (0.8, 0.1, 0.1)  # Red
        text_color = (0.2, 0.2, 0.2)   # Dark gray
        
        # Header section
        c.setFillColorRGB(*header_color)
        c.rect(0, height - 100, width, 100, fill=True, stroke=False)
        
        c.setFillColorRGB(1, 1, 1)  # White text
        c.setFont("Helvetica-Bold", 28)
        c.drawCentredString(width/2, height - 50, "🚕 PyCab")
        
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width/2, height - 80, "RIDE RECEIPT")
        
        # Receipt info
        c.setFillColorRGB(*text_color)
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 120, f"Receipt No: #{ride_id}")
        c.drawString(50, height - 140, f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Line separator
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.line(50, height - 160, width - 50, height - 160)
        
        # Customer info
        c.setFillColorRGB(*header_color)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 190, "CUSTOMER INFORMATION")
        
        c.setFillColorRGB(*text_color)
        c.setFont("Helvetica", 11)
        c.drawString(50, height - 220, f"Name: {ride_data.get('user_name', 'N/A')}")
        c.drawString(50, height - 240, f"Email: {ride_data.get('user_email', 'N/A')}")
        
        # Ride details section
        c.setFillColorRGB(*header_color)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 280, "RIDE DETAILS")
        
        y_position = height - 310
        
        details = [
            ("Pickup:", ride_data.get("pickup_address", "N/A")),
            ("Drop:", ride_data.get("drop_address", "N/A")),
            ("Distance:", f"{ride_data.get('distance', 0):.2f} km"),
            ("Status:", ride_data.get("status", "N/A")),
            ("Payment Status:", ride_data.get("payment_status", "N/A")),
            ("Payment Method:", ride_data.get("payment_method", "Cash").upper()),
        ]
        
        c.setFillColorRGB(*text_color)
        for label, value in details:
            c.setFont("Helvetica-Bold", 11)
            c.drawString(50, y_position, label)
            c.setFont("Helvetica", 11)
            
            # Handle long text by wrapping
            if len(value) > 50:
                value_lines = []
                while len(value) > 50:
                    value_lines.append(value[:50])
                    value = value[50:]
                if value:
                    value_lines.append(value)
                
                for i, line in enumerate(value_lines):
                    c.drawString(150, y_position - (i * 15), line)
                y_position -= (len(value_lines) * 15)
            else:
                c.drawString(150, y_position, value)
                y_position -= 25
        
        # Amount section
        c.setFillColorRGB(*accent_color)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y_position - 30, "TOTAL AMOUNT:")
        
        c.setFillColorRGB(*accent_color)
        c.setFont("Helvetica-Bold", 28)
        total = ride_data.get("estimated_price", 0)
        c.drawRightString(width - 50, y_position - 30, f"₹{total:.2f}")
        
        # Fare breakdown
        c.setFillColorRGB(*text_color)
        c.setFont("Helvetica", 10)
        
        base_fare = total / 1.18  # Assuming 18% GST
        gst = total - base_fare
        
        breakdown_y = y_position - 80
        
        c.drawString(50, breakdown_y, f"Base Fare: ₹{base_fare:.2f}")
        c.drawString(50, breakdown_y - 20, f"GST (18%): ₹{gst:.2f}")
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, breakdown_y - 40, f"Total: ₹{total:.2f}")
        
        # Footer
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.setFont("Helvetica", 9)
        
        footer_lines = [
            "Thank you for choosing PyCab!",
            "This is a computer-generated receipt. No signature required.",
            "For any queries, contact: support@pycab.com"
        ]
        
        footer_y = 80
        for line in footer_lines:
            c.drawCentredString(width/2, footer_y, line)
            footer_y -= 15
        
        # Save PDF
        c.save()
        print(f"✅ Formatted PDF generated at: {pdf_path}")
        return str(pdf_path)
        
    except Exception as e:
        print(f"❌ Formatted PDF generation error: {str(e)}")
        traceback.print_exc()
        # Fallback to simple PDF
        return generate_simple_pdf(ride_data)

def generate_simple_pdf(ride_data: dict) -> str:
    """Generate simple PDF as fallback"""
    ride_id = ride_data.get("id", "unknown")
    pdf_path = RECEIPTS_DIR / f"receipt_{ride_id}.pdf"
    
    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 100, "PyCab Ride Receipt")
    
    # Details
    c.setFont("Helvetica", 12)
    y = height - 150
    line_height = 25
    
    details = [
        f"Receipt No: #{ride_id}",
        f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"Customer: {ride_data.get('user_name', 'N/A')}",
        f"Email: {ride_data.get('user_email', 'N/A')}",
        f"Pickup: {ride_data.get('pickup_address', 'N/A')}",
        f"Drop: {ride_data.get('drop_address', 'N/A')}",
        f"Distance: {ride_data.get('distance', 0):.2f} km",
        f"Status: {ride_data.get('status', 'N/A')}",
        f"Payment: {ride_data.get('payment_status', 'N/A')}",
        f"Payment Method: {ride_data.get('payment_method', 'Card')}",
    ]
    
    for detail in details:
        c.drawString(100, y, detail)
        y -= line_height
    
    # Total
    c.setFont("Helvetica-Bold", 18)
    c.drawString(100, y - 20, f"Total Amount: ₹{ride_data.get('estimated_price', 0):.2f}")
    
    # Footer
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, 100, "Thank you for choosing PyCab!")
    c.drawCentredString(width/2, 80, "For support: support@pycab.com")
    
    c.save()
    print(f"✅ Simple PDF generated at: {pdf_path}")
    return str(pdf_path)

async def get_ride_data(ride_id: str) -> dict:
    """Fetch real ride data with user details (fallback to placeholder for user info only)."""
    try:
        print(f"📋 Fetching ride data for ID: {ride_id}")
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlmodel import select
        from db import get_session
        from models.ride import Ride
        from models.user import User

        async for session in get_session():
            # Fetch ride from local DB
            result = await session.execute(select(Ride).where(Ride.id == int(ride_id)))
            ride = result.scalar_one_or_none()
            if not ride:
                # Ride not found – use mock data (fallback)
                print(f"⚠️ Ride {ride_id} not found, using mock")
                return get_mock_ride_data(ride_id)

            # --- Real ride data ---
            ride_data = {
                "id": ride.id,
                "user_id": ride.user_id,
                "pickup_address": ride.pickup_address or "Not specified",
                "drop_address": ride.drop_address or "Not specified",
                "estimated_price": ride.estimated_price or 0,
                "actual_price": ride.final_price or ride.estimated_price or 0,
                "status": ride.status,
                "payment_status": ride.payment_status,
                "payment_method": "Stripe" if ride.payment_intent_id else "Cash",
                "distance": ride.estimated_distance_km or 0,
                "actual_distance_km": ride.actual_distance_km or ride.estimated_distance_km or 0,
                "created_at": ride.created_at.isoformat() if ride.created_at else None,
                "driver_id": ride.driver_id,
                "payment_intent_id": ride.payment_intent_id,
                "pickup_lat": ride.pickup_lat,
                "pickup_lng": ride.pickup_lng,
                "drop_lat": ride.drop_lat,
                "drop_lng": ride.drop_lng,
                # Placeholders for user info (will be overwritten if found)
                "user_email": None,
                "user_name": None,
            }

            # --- Try to get user details ---
            # 1. Local User table
            try:
                user_result = await session.execute(
                    select(User).where(User.id == ride.user_id)
                )
                user = user_result.scalar_one_or_none()
                if user:
                    ride_data["user_email"] = user.email
                    ride_data["user_name"] = f"{user.first_name} {user.last_name}"
                    print(f"✅ User found in local DB: {user.email}")
            except Exception as e:
                print(f"⚠️ Local user fetch error: {e}")

            # 2. Supabase profiles (if local not found)
            if not ride_data["user_email"]:
                try:
                    from supabase_client import supabase
                    # Adjust table name to your actual profiles table (e.g., "profiles")
                    response = supabase.table("profiles").select("email, first_name, last_name").eq("id", ride.user_id).execute()
                    if response.data:
                        user_data = response.data[0]
                        ride_data["user_email"] = user_data.get("email")
                        first = user_data.get("first_name", "")
                        last = user_data.get("last_name", "")
                        ride_data["user_name"] = f"{first} {last}".strip() or "User"
                        print(f"✅ User found in Supabase: {ride_data['user_email']}")
                except Exception as e:
                    print(f"⚠️ Supabase user fetch error: {e}")

            # 3. Final fallback – use user_id
            if not ride_data["user_email"]:
                ride_data["user_email"] = f"user_{ride.user_id[:8]}@example.com"
                ride_data["user_name"] = f"User {ride.user_id[:8]}"
                print(f"⚠️ Using placeholder for user {ride.user_id}")

            return ride_data

    except Exception as e:
        print(f"❌ Error in get_ride_data: {e}")
        import traceback
        traceback.print_exc()
        return get_mock_ride_data(ride_id)

def generate_formatted_pdf(ride_data: dict) -> str:
    """Generate properly formatted PDF receipt with all details"""
    try:
        ride_id = ride_data.get("id", "unknown")
        pdf_path = RECEIPTS_DIR / f"receipt_{ride_id}.pdf"
        
        # Create PDF document
        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#2E86AB')
        )
        elements.append(Paragraph("PYCAB RIDE RECEIPT", title_style))
        
        # Company info
        company_style = ParagraphStyle(
            'CompanyInfo',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray
        )
        elements.append(Paragraph("PyCab - Ride Sharing Service", company_style))
        elements.append(Paragraph("support@pycab.com | www.pycab.com", company_style))
        elements.append(Spacer(1, 20))
        
        # Receipt details
        receipt_data = [
            ["Receipt Number:", f"PYCAB-{ride_id:06d}"],
            ["Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
            ["Ride ID:", str(ride_id)],
            ["Payment Status:", ride_data.get('payment_status', 'PAID').upper() + " ✅"],
            ["Payment Method:", ride_data.get('payment_method', 'Online Payment')],
        ]
        
        if ride_data.get('payment_intent_id'):
            receipt_data.append(["Transaction ID:", ride_data['payment_intent_id']])
        
        receipt_table = Table(receipt_data, colWidths=[2*inch, 3*inch])
        receipt_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8F9FA')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(receipt_table)
        elements.append(Spacer(1, 30))
        
        # Customer info
        elements.append(Paragraph("CUSTOMER INFORMATION", styles['Heading2']))
        customer_data = [
            ["Customer ID:", ride_data.get('user_id', 'N/A')],
            ["Customer Name:", ride_data.get('user_name', 'N/A')],
            ["Email:", ride_data.get('user_email', 'N/A')],
        ]
        
        customer_table = Table(customer_data, colWidths=[2*inch, 3*inch])
        customer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8F9FA')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(customer_table)
        elements.append(Spacer(1, 30))
        
        # Ride details section
        elements.append(Paragraph("RIDE DETAILS", styles['Heading2']))
        
        # Get distance (prefer actual, fallback to estimated)
        distance = ride_data.get('actual_distance_km') or ride_data.get('distance') or 0
        
        ride_details = [
            ["Pickup Location:", ride_data.get('pickup_address', 'Not specified')],
            ["Destination:", ride_data.get('drop_address', 'Not specified')],
            ["Distance:", f"{distance:.2f} km"],
            ["Ride Date:", ride_data.get('created_at', 'N/A')],
            ["Ride Status:", ride_data.get('status', 'N/A').upper()],
        ]
        
        # Add driver info if available
        if ride_data.get('driver_id'):
            ride_details.append(["Driver ID:", str(ride_data.get('driver_id', 'N/A'))])
        
        ride_table = Table(ride_details, colWidths=[2*inch, 3*inch])
        ride_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8F9FA')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        elements.append(ride_table)
        elements.append(Spacer(1, 30))
        
        # Payment summary
        elements.append(Paragraph("PAYMENT SUMMARY", styles['Heading2']))
        
        # Get amount (prefer actual, fallback to estimated)
        amount = ride_data.get('actual_price') or ride_data.get('estimated_price') or 0
        gst = amount * 0.18  # 18% GST
        total = amount + gst
        
        payment_data = [
            ["Description", "Amount (₹)"],
            ["Base Fare", f"₹{amount - gst:.2f}"],
            ["GST (18%)", f"₹{gst:.2f}"],
            ["", ""],
            ["TOTAL", f"₹{total:.2f}"]
        ]
        
        payment_table = Table(payment_data, colWidths=[3.5*inch, 1.5*inch])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -2), 1, colors.gray),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.black),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
        ]))
        elements.append(payment_table)
        elements.append(Spacer(1, 40))
        
        # Footer
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.gray,
            alignment=1  # Center aligned
        )
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Thank you for choosing PyCab!", footer_style))
        elements.append(Paragraph("This is a computer-generated receipt.", footer_style))
        elements.append(Paragraph("For any queries, contact: support@pycab.com", footer_style))
        
        # Build PDF
        doc.build(elements)
        
        print(f"✅ Formatted PDF generated with complete ride details: {pdf_path}")
        return str(pdf_path)
        
    except Exception as e:
        print(f"❌ Formatted PDF generation error: {str(e)}")
        traceback.print_exc()
        # Fallback to simple PDF
        return generate_simple_pdf(ride_data)

async def get_fallback_ride_data(ride_id: str) -> dict:
    """Try Supabase or return mock data"""
    try:
        from supabase_client import supabase
        if supabase:
            ride_response = supabase.table("rides").select("*").eq("id", ride_id).execute()
            
            if ride_response.data:
                ride = ride_response.data[0]
                
                # Fetch user details
                user_info = {}
                if ride.get("user_id"):
                    try:
                        user_response = supabase.table("users").select(
                            "email", "name"
                        ).eq("id", ride["user_id"]).execute()
                        
                        if user_response.data:
                            user_data = user_response.data[0]
                            user_info = {
                                "email": user_data.get("email", ""),
                                "name": user_data.get("name", "")
                            }
                    except Exception:
                        user_info = {}
                
                formatted_ride = {
                    "id": ride.get("id", ""),
                    "user_id": ride.get("user_id", ""),
                    "user_email": user_info.get("email", ""),
                    "user_name": user_info.get("name", ""),
                    "pickup_address": ride.get("pickup_address", "Not specified"),
                    "drop_address": ride.get("drop_address", "Not specified"),
                    "estimated_price": float(ride.get("estimated_price", 0)),
                    "actual_price": float(ride.get("actual_price", 0)) or float(ride.get("estimated_price", 0)),
                    "status": ride.get("status", "requested"),
                    "payment_status": ride.get("payment_status", "pending"),
                    "payment_method": ride.get("payment_method", "cash"),
                    "distance": float(ride.get("distance", 0)) or float(ride.get("estimated_distance_km", 0)),
                    "created_at": ride.get("created_at"),
                    "updated_at": ride.get("updated_at"),
                    "driver_id": ride.get("driver_id")
                }
                return formatted_ride
    except Exception:
        pass
    
    return get_mock_ride_data(ride_id)

def get_mock_ride_data(ride_id: str) -> dict:
    """Generate mock ride data for testing"""
    import random
    return {
        "id": ride_id,
        "user_id": f"user_{ride_id}",
        "user_email": "user@example.com",
        "user_name": "Test User",
        "pickup_address": f"Location {ride_id} Street, City",
        "drop_address": f"Destination {ride_id} Avenue, City",
        "estimated_price": random.randint(150, 500),
        "actual_price": random.randint(150, 500),
        "status": "completed",
        "payment_status": "paid",
        "payment_method": "card",
        "distance": round(random.uniform(5.0, 25.0), 2),
        "actual_distance_km": round(random.uniform(5.0, 25.0), 2),
        "created_at": datetime.now().isoformat(),
        "driver_id": f"driver_{random.randint(1, 100)}"
    }

@router.post("/{ride_id}/generate")
async def generate_receipt(ride_id: str):
    """Generate receipt for a ride"""
    try:
        print(f"🔄 Generating receipt for ride {ride_id}")
        
        # Get ride data
        ride_data = await get_ride_data(ride_id)
        
        if not ride_data:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        # Check if payment is completed
        if ride_data.get("payment_status") != "paid":
            raise HTTPException(status_code=400, detail="Receipt can only be generated for paid rides")
        
        # Generate PDF using formatted PDF function
        pdf_path = generate_formatted_pdf(ride_data)
        
        if not Path(pdf_path).exists():
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        return JSONResponse({
            "success": True,
            "message": "Receipt generated successfully",
            "receipt_path": pdf_path,
            "download_url": f"/receipts/{ride_id}/download"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating receipt: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{ride_id}/download")
async def download_receipt(ride_id: str):
    """Download receipt PDF"""
    try:
        print(f"📥 Downloading receipt for ride {ride_id}")
        
        # Check if receipt exists
        pdf_path = RECEIPTS_DIR / f"receipt_{ride_id}.pdf"
        
        if not pdf_path.exists():
            # Generate receipt if doesn't exist
            ride_data = await get_ride_data(ride_id)
            if not ride_data:
                raise HTTPException(status_code=404, detail="Ride not found")
            
            if ride_data.get("payment_status") != "paid":
                raise HTTPException(status_code=400, detail="Receipt can only be downloaded for paid rides")
            
            pdf_path = Path(generate_formatted_pdf(ride_data))
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename=f"pycab_receipt_{ride_id}.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error downloading receipt: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{ride_id}/send-email")
async def send_receipt_email_endpoint(ride_id: str, email: str = None):
    """Send receipt via email - FIXED VERSION with proper user email"""
    try:
        print(f"📧 Sending receipt email for ride {ride_id}")
        
        # Get ride data
        ride_data = await get_ride_data(ride_id)
        
        if not ride_data:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        # Always use the user's email from ride data
        # If you want to override, pass email parameter
        recipient_email = email or ride_data.get("user_email")
        
        if not recipient_email:
            # Fallback to a test email
            recipient_email = "darshanaparmar1316@gmail.com"
            print(f"⚠️ No user email found, using default: {recipient_email}")
        
        print(f"📧 Email will be sent to: {recipient_email}")
        
        # Generate or get PDF
        pdf_path = RECEIPTS_DIR / f"receipt_{ride_id}.pdf"
        
        if not pdf_path.exists():
            pdf_path = Path(generate_formatted_pdf(ride_data))
        
        # Send email
        success = send_email_with_receipt(recipient_email, ride_id, str(pdf_path))
        
        if success:
            return JSONResponse({
                "success": True,
                "message": f"Receipt sent to {recipient_email}",
                "email": recipient_email,
                "email_sent": True,
                "download_url": f"/receipts/{ride_id}/download"
            })
        else:
            # Email failed but PDF is available for download
            return JSONResponse({
                "success": True,
                "message": "Receipt generated but email failed. You can download it.",
                "download_url": f"/receipts/{ride_id}/download",
                "email_sent": False
            })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in send email: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse({
            "success": False,
            "message": f"Failed to send email: {str(e)}",
            "email_sent": False
        })

def send_email_with_receipt(to_email: str, ride_id: str, pdf_path: str, ride_data: dict = None) -> bool:
    """Send receipt via email with personalized content"""
    try:
        print(f"📧 Preparing email to: {to_email}")
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        msg['Subject'] = f"PyCab Ride Receipt #{ride_id}"
        
        # Personalize email body with user data
        user_name = ride_data.get('user_name', 'Customer') if ride_data else 'Customer'
        amount = ride_data.get('estimated_price', 0) if ride_data else 0
        pickup = ride_data.get('pickup_address', 'Your pickup location') if ride_data else 'Your pickup location'
        drop = ride_data.get('drop_address', 'Your destination') if ride_data else 'Your destination'
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">🚕 PyCab</h1>
                    <p style="margin: 10px 0 0;">Your Ride Receipt</p>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px;">
                    <h2>Hello {user_name},</h2>
                    <p>Thank you for riding with PyCab! Your ride receipt is attached to this email.</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e0e0e0;">
                        <h3 style="margin-top: 0;">Ride Details</h3>
                        <p><strong>Ride ID:</strong> #{ride_id}</p>
                        <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                        <p><strong>From:</strong> {pickup}</p>
                        <p><strong>To:</strong> {drop}</p>
                        <p><strong>Amount:</strong> ₹{amount:.2f}</p>
                    </div>
                    
                    <p>If you have any questions about your ride, please contact our support team at support@pycab.com</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:5173/rides" style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            View Ride History
                        </a>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
                    <p>© {datetime.now().year} PyCab. All rights reserved.</p>
                    <p>Fast, Safe, Reliable Rides</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Attach PDF
        with open(pdf_path, 'rb') as f:
            pdf_attachment = MIMEApplication(f.read(), _subtype="pdf")
            pdf_attachment.add_header('content-disposition', 'attachment', 
                                    filename=f"pycab_receipt_{ride_id}.pdf")
            msg.attach(pdf_attachment)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email sending error: {str(e)}")
        traceback.print_exc()
        return False

@router.get("/{ride_id}/status")
async def get_receipt_status(ride_id: str):
    """Check receipt status for a ride"""
    try:
        ride_data = await get_ride_data(ride_id)
        
        if not ride_data:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        pdf_path = RECEIPTS_DIR / f"receipt_{ride_id}.pdf"
        receipt_exists = pdf_path.exists()
        
        return {
            "ride_id": ride_id,
            "payment_status": ride_data.get("payment_status"),
            "receipt_available": receipt_exists,
            "receipt_url": f"/receipts/{ride_id}/download" if receipt_exists else None,
            "amount": ride_data.get("estimated_price"),
            "status": ride_data.get("status")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))