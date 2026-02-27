# debug_receipts.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import os

app = FastAPI()

@app.get("/test-receipts/{ride_id}/download")
async def test_download(ride_id: int):
    """Test endpoint to see if receipts work"""
    print(f"📄 Test request for receipt {ride_id}")
    
    # Create test PDF
    from reportlab.pdfgen import canvas
    from datetime import datetime
    
    os.makedirs("receipts", exist_ok=True)
    pdf_path = f"receipts/test_{ride_id}.pdf"
    
    c = canvas.Canvas(pdf_path, pagesize=(400, 600))
    c.setFont("Helvetica-Bold", 20)
    c.drawString(100, 550, "TEST RECEIPT")
    c.setFont("Helvetica", 12)
    c.drawString(100, 500, f"Ride ID: {ride_id}")
    c.drawString(100, 480, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
    c.drawString(100, 460, "This is a test receipt")
    c.drawString(100, 440, "Amount: ₹250.00")
    c.drawString(100, 420, "Status: PAID")
    c.save()
    
    if os.path.exists(pdf_path):
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"test_receipt_{ride_id}.pdf"
        )
    else:
        return JSONResponse(
            status_code=200,
            content={"message": f"Test receipt created for ride {ride_id}", "path": pdf_path}
        )

@app.get("/receipts/{ride_id}/download")
async def download_receipt(ride_id: int):
    """Simple receipt download endpoint"""
    print(f"📄 Download request for ride: {ride_id}")
    
    # Create receipts directory if it doesn't exist
    os.makedirs("receipts", exist_ok=True)
    
    # Create a simple PDF
    from reportlab.pdfgen import canvas
    from datetime import datetime
    
    pdf_path = f"receipts/receipt_{ride_id}.pdf"
    
    c = canvas.Canvas(pdf_path, pagesize=(400, 600))
    
    # Title
    c.setFont("Helvetica-Bold", 20)
    c.drawString(100, 550, "PYCAB RIDE RECEIPT")
    
    # Details
    c.setFont("Helvetica", 12)
    y_position = 500
    
    details = [
        f"Receipt #: PYCAB-{ride_id:06d}",
        f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"Ride ID: {ride_id}",
        f"Amount: ₹{ride_id * 50}.00",
        "Payment Status: PAID ✅",
        "",
        "Thank you for riding with PyCab!",
        "This is a computer-generated receipt.",
        "support@pycab.com"
    ]
    
    for line in details:
        c.drawString(100, y_position, line)
        y_position -= 20
    
    c.save()
    
    print(f"✅ PDF created: {pdf_path}")
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"pycab_receipt_{ride_id}.pdf"
    )