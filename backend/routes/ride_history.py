from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from config import supabase
from pdf.receipt import generate_pdf
from tasks.receipt_task import send_receipt_email

router = APIRouter(prefix="/rides", tags=["Rides"])


def get_user():
    return {"id": "dummy-user-id", "email": "test@gmail.com"}

@router.get("/history")
def get_history(user=Depends(get_user)):
    result = (
        supabase.table("rides")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"rides": result.data}


@router.get("/receipt/{ride_id}")
def get_receipt(ride_id: str, user=Depends(get_user)):
    ride = (
        supabase.table("rides")
        .select("*")
        .eq("id", ride_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    ).data

    pdf_file = generate_pdf(ride)
    return FileResponse(pdf_file, media_type="application/pdf", filename=pdf_file)


@router.post("/email-receipt/{ride_id}")
def email_receipt(ride_id: str, user=Depends(get_user)):
    ride = (
        supabase.table("rides")
        .select("*")
        .eq("id", ride_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    ).data

    # send email async
    send_receipt_email.delay(user["email"], ride)
    return {"message": "Email will be sent shortly"}
