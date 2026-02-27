from celery_app import celery
from pdf.receipt import generate_pdf
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
import asyncio
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_FROM_NAME="PyCab Ride Service",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

@celery.task
def send_receipt_email(email: str, ride: dict):
    """Send receipt email with PDF attachment"""
    try:
        print(f"📧 Starting receipt email for ride {ride.get('id')} to {email}")
        
        # Generate PDF receipt
        pdf_path = generate_pdf(ride)
        
        # Read PDF content
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Create HTML email body
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; }}
                .footer {{ background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
                .ride-details {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Your PyCab Ride Receipt</h1>
                    <p>Ride #{ride.get('id')} | {datetime.now().strftime('%B %d, %Y')}</p>
                </div>
                
                <div class="content">
                    <h2>Thank you for riding with PyCab!</h2>
                    <p>Your ride receipt is attached to this email. You can also download it from your ride history.</p>
                    
                    <div class="ride-details">
                        <div class="detail-row">
                            <span><strong>Pickup:</strong></span>
                            <span>{ride.get('pickup', 'N/A')}</span>
                        </div>
                        <div class="detail-row">
                            <span><strong>Drop:</strong></span>
                            <span>{ride.get('drop', 'N/A')}</span>
                        </div>
                        <div class="detail-row">
                            <span><strong>Distance:</strong></span>
                            <span>{ride.get('distance', 0):.2f} km</span>
                        </div>
                        <div class="detail-row">
                            <span><strong>Amount Paid:</strong></span>
                            <span style="color: #4CAF50; font-weight: bold;">₹{ride.get('amount', 0):.2f}</span>
                        </div>
                        <div class="detail-row">
                            <span><strong>Payment Status:</strong></span>
                            <span style="color: #4CAF50;">✅ Paid</span>
                        </div>
                    </div>
                    
                    <p>If you have any questions about your ride, please contact our support team at support@pycab.com</p>
                    
                    <a href="http://localhost:5173/rides" class="button">View Ride History</a>
                </div>
                
                <div class="footer">
                    <p>© {datetime.now().year} PyCab. All rights reserved.</p>
                    <p>Fast, Safe, Reliable Rides</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create message
        message = MessageSchema(
            subject=f"Your PyCab Ride Receipt #{ride.get('id')}",
            recipients=[email],
            body=html_content,
            subtype="html",
            attachments=[{
                "file": pdf_content,
                "filename": f"pycab_receipt_{ride.get('id')}.pdf",
                "subtype": "pdf",
                "headers": {
                    "Content-ID": f"<receipt_{ride.get('id')}>"
                }
            }]
        )

        # Send email
        fm = FastMail(conf)
        asyncio.run(fm.send_message(message))
        
        print(f"✅ Email sent successfully to {email}")
        
        # Cleanup PDF file
        try:
            os.remove(pdf_path)
        except:
            pass
            
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        raise e