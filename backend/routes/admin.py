from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from typing import Optional, List, Dict, Any
import os
from datetime import datetime, timedelta
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io
import json

from db import get_session
from models.ride import Ride, RideStatus, PaymentStatus
from models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])

# Get admin token from environment variable
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "admin-secret-token")

class RideStatusUpdate(BaseModel):
    status: str

class PaymentStatusUpdate(BaseModel):
    payment_status: str

class RideFilter(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    user_id: Optional[str] = None

def verify_admin_token(x_admin_token: Optional[str] = Header(None)):
    """Verify admin token from request header"""
    if not x_admin_token:
        raise HTTPException(
            status_code=401,
            detail="Admin token required"
        )
    
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin token"
        )
    
    return x_admin_token

@router.get("/rides", response_model=List[Dict[str, Any]])
async def get_all_rides(
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    admin_token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_session)
):
    """Get all rides with optional filtering - ADMIN ONLY"""
    try:
        print(f"📊 Admin: Fetching rides from local database with filters")
        
        # Start building the query
        query = select(Ride)
        
        # Apply filters if provided
        if status and status != "all":
            query = query.where(Ride.status == status)
        
        if payment_status and payment_status != "all":
            query = query.where(Ride.payment_status == payment_status)
        
        if user_id:
            query = query.where(Ride.user_id == user_id)
        
        # Date filtering (converting string dates to datetime)
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.where(Ride.created_at >= start_dt)
            except:
                pass
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.where(Ride.created_at <= end_dt)
            except:
                pass
        
        # Order by latest first
        query = query.order_by(Ride.created_at.desc())
        
        # Execute the query
        result = await session.execute(query)
        rides = result.scalars().all()
        
        print(f"✅ Found {len(rides)} rides in local database")
        
        # Format the response with user details
        formatted_rides = []
        for ride in rides:
            # Get user details if user_id exists
            user_info = {}
            if ride.user_id:
                try:
                    # Try to find user in local database
                    user_result = await session.execute(
                        select(User).where(User.id == ride.user_id)
                    )
                    user = user_result.scalar_one_or_none()
                    
                    if user:
                        user_info = {
                            "email": user.email,
                            "name": f"{user.first_name} {user.last_name}",
                            "phone": getattr(user, 'phone', '')  # Use getattr for optional fields
                        }
                except Exception as user_err:
                    print(f"⚠️ Error fetching user details: {user_err}")
                    user_info = {}
            
            # Format the ride data
            formatted_ride = {
                "id": ride.id,
                "user_id": ride.user_id,
                "user_email": user_info.get("email", ""),
                "user_name": user_info.get("name", ""),
                "user_phone": user_info.get("phone", ""),
                "pickup_address": ride.pickup_address,
                "pickup_lat": ride.pickup_lat,
                "pickup_lng": ride.pickup_lng,
                "drop_address": ride.drop_address,
                "drop_lat": ride.drop_lat,
                "drop_lng": ride.drop_lng,
                "estimated_price": float(ride.estimated_price) if ride.estimated_price else 0,
                "actual_price": float(ride.final_price) if ride.final_price else None,
                "status": ride.status,
                "payment_status": ride.payment_status,
                "payment_method": "Stripe" if ride.payment_intent_id else "Cash",
                "payment_id": ride.payment_intent_id,
                "created_at": ride.created_at.isoformat() if ride.created_at else None,
                "updated_at": ride.updated_at.isoformat() if ride.updated_at else None,
                "started_at": ride.started_at.isoformat() if ride.started_at else None,
                "completed_at": ride.completed_at.isoformat() if ride.completed_at else None,
                "cancelled_at": ride.cancelled_at.isoformat() if hasattr(ride, 'cancelled_at') and ride.cancelled_at else None,
                "driver_id": ride.driver_id,
                "driver_name": "",  # You can add driver model if needed
                "driver_phone": "",
                "vehicle_number": "",
                "distance": float(ride.estimated_distance_km) if ride.estimated_distance_km else 0,
                "actual_distance_km": float(ride.actual_distance_km) if ride.actual_distance_km else None,
                "duration": None,  # Add if you track duration
                "ride_notes": "",
                "rating": None,
                "review": ""
            }
            formatted_rides.append(formatted_ride)
        
        return formatted_rides
        
    except Exception as e:
        print(f"❌ Error fetching rides: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/rides/{ride_id}", response_model=Dict[str, Any])
async def get_ride_details(
    ride_id: int,
    admin_token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_session)
):
    """Get detailed information about a specific ride"""
    try:
        # Fetch ride details from local database
        result = await session.execute(select(Ride).where(Ride.id == ride_id))
        ride = result.scalar_one_or_none()
        
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        # Fetch user details
        user_info = {}
        if ride.user_id:
            user_result = await session.execute(
                select(User).where(User.id == ride.user_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                user_info = {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "name": f"{user.first_name} {user.last_name}",
                    "phone": getattr(user, 'phone', ''),
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "role": user.role
                }
        
        # Format ride details
        ride_details = {
            "id": ride.id,
            "user_id": ride.user_id,
            "pickup_address": ride.pickup_address,
            "drop_address": ride.drop_address,
            "pickup_lat": ride.pickup_lat,
            "pickup_lng": ride.pickup_lng,
            "drop_lat": ride.drop_lat,
            "drop_lng": ride.drop_lng,
            "estimated_distance_km": ride.estimated_distance_km,
            "actual_distance_km": ride.actual_distance_km,
            "estimated_price": ride.estimated_price,
            "final_price": ride.final_price,
            "status": ride.status,
            "driver_id": ride.driver_id,
            "payment_intent_id": ride.payment_intent_id,
            "payment_status": ride.payment_status,
            "payment_amount": ride.payment_amount,
            "assigned_at": ride.assigned_at.isoformat() if ride.assigned_at else None,
            "started_at": ride.started_at.isoformat() if ride.started_at else None,
            "completed_at": ride.completed_at.isoformat() if ride.completed_at else None,
            "created_at": ride.created_at.isoformat() if ride.created_at else None,
            "updated_at": ride.updated_at.isoformat() if ride.updated_at else None
        }
        
        return {
            "ride_details": ride_details,
            "user_details": user_info,
            "driver_details": {},  # Add driver model if needed
            "payment_details": {}   # Add payment model if needed
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/rides/{ride_id}/status")
async def update_ride_status(
    ride_id: int,
    status_update: RideStatusUpdate,
    admin_token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_session)
):
    """Update ride status - ADMIN ONLY"""
    try:
        # Fetch the ride
        result = await session.execute(select(Ride).where(Ride.id == ride_id))
        ride = result.scalar_one_or_none()
        
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        # Validate status
        valid_statuses = [status.value for status in RideStatus]
        if status_update.status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        # Update ride status
        ride.status = status_update.status
        ride.updated_at = datetime.utcnow()
        
        # Set timestamps based on status
        if status_update.status == RideStatus.IN_PROGRESS.value:
            ride.started_at = datetime.utcnow()
        elif status_update.status == RideStatus.COMPLETED.value:
            ride.completed_at = datetime.utcnow()
        
        session.add(ride)
        await session.commit()
        
        return {
            "message": "Status updated successfully",
            "ride_id": ride_id,
            "status": status_update.status
        }
        
    # except Exception as e:
    #     await session.rollback()
    #     import traceback
    #     traceback.print_exc()
    #     print(f"Error updating ride {ride_id}: {str(e)}")  
    #     raise HTTPException(status_code=500, detail=str(e))

    except HTTPException:
            raise  # let validation errors (400) pass through
    except Exception as e:
        await session.rollback()
        import traceback
        traceback.print_exc()
        print(f"Error updating ride {ride_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/rides/{ride_id}/payment-status")
async def update_payment_status(
    ride_id: int,
    payment_update: PaymentStatusUpdate,
    admin_token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_session)
):
    """Update payment status - ADMIN ONLY"""
    try:
        # Fetch the ride
        result = await session.execute(select(Ride).where(Ride.id == ride_id))
        ride = result.scalar_one_or_none()
        
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        # Validate payment status
        valid_statuses = [status.value for status in PaymentStatus]
        if payment_update.payment_status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid payment status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        # Update payment status
        ride.payment_status = payment_update.payment_status
        ride.updated_at = datetime.utcnow()
        
        # If payment is marked as paid, update final price if not set
        if payment_update.payment_status == PaymentStatus.PAID.value:
            if not ride.final_price and ride.estimated_price:
                ride.final_price = ride.estimated_price
        
        session.add(ride)
        await session.commit()
        
        return {
            "message": "Payment status updated successfully",
            "ride_id": ride_id,
            "payment_status": payment_update.payment_status
        }
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/rides/{ride_id}")
async def delete_ride(
    ride_id: int,
    admin_token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_session)
):
    """Delete a ride - ADMIN ONLY (use with caution)"""
    try:
        # Fetch the ride
        result = await session.execute(select(Ride).where(Ride.id == ride_id))
        ride = result.scalar_one_or_none()
        
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        # Delete the ride
        await session.delete(ride)
        await session.commit()
        
        return {"message": "Ride deleted successfully", "ride_id": ride_id}
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_admin_stats(
    admin_token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_session)
):
    """Get admin dashboard statistics"""
    try:
        # Get total rides count
        result = await session.execute(select(func.count(Ride.id)))
        total_rides = result.scalar_one() or 0
        
        # Get rides by status
        result = await session.execute(
            select(Ride.status, func.count(Ride.id)).group_by(Ride.status)
        )
        status_counts = {}
        for status, count in result.all():
            status_counts[status] = count
        
        # Get payment statistics
        result = await session.execute(
            select(Ride.payment_status, func.count(Ride.id), func.sum(Ride.estimated_price))
            .group_by(Ride.payment_status)
        )
        payment_counts = {}
        total_revenue = 0
        for payment_status, count, sum_price in result.all():
            payment_counts[payment_status] = count
            if payment_status == PaymentStatus.PAID.value and sum_price:
                total_revenue += float(sum_price)
        
        # Get today's rides
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        result = await session.execute(
            select(func.count(Ride.id)).where(Ride.created_at >= today_start)
        )
        today_rides = result.scalar_one() or 0
        
        # Get this week's revenue
        week_ago = datetime.utcnow() - timedelta(days=7)
        result = await session.execute(
            select(func.sum(Ride.estimated_price))
            .where(Ride.payment_status == PaymentStatus.PAID.value)
            .where(Ride.created_at >= week_ago)
        )
        weekly_revenue = float(result.scalar_one() or 0)
        
        # Calculate average ride value
        avg_ride_value = round(total_revenue / max(1, total_rides), 2) if total_rides > 0 else 0
        
        return {
            "total_rides": total_rides,
            "today_rides": today_rides,
            "status_counts": status_counts,
            "payment_counts": payment_counts,
            "total_revenue": round(total_revenue, 2),
            "weekly_revenue": round(weekly_revenue, 2),
            "average_ride_value": avg_ride_value
        }
        
    except Exception as e:
        print(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rides/export")
async def export_rides(
    format: str = Query("json", regex="^(json|csv)$"),
    admin_token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_session)
):
    """Export rides data in different formats"""
    try:
        # Fetch all rides
        result = await session.execute(
            select(Ride).order_by(Ride.created_at.desc())
        )
        rides = result.scalars().all()
        
        if not rides:
            return {"message": "No rides found", "data": []}
        
        # Convert rides to dict list
        rides_data = []
        for ride in rides:
            rides_data.append({
                "id": ride.id,
                "user_id": ride.user_id,
                "pickup_address": ride.pickup_address,
                "drop_address": ride.drop_address,
                "estimated_price": ride.estimated_price,
                "final_price": ride.final_price,
                "status": ride.status,
                "payment_status": ride.payment_status,
                "payment_intent_id": ride.payment_intent_id,
                "created_at": ride.created_at.isoformat() if ride.created_at else None,
                "updated_at": ride.updated_at.isoformat() if ride.updated_at else None,
                "driver_id": ride.driver_id,
                "estimated_distance_km": ride.estimated_distance_km,
                "actual_distance_km": ride.actual_distance_km
            })
        
        if format == "csv":
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            if rides_data:
                writer = csv.DictWriter(output, fieldnames=rides_data[0].keys())
                writer.writeheader()
                writer.writerows(rides_data)
            
            return {
                "content": output.getvalue(),
                "filename": f"rides_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        else:
            # Return as JSON
            return {
                "count": len(rides_data),
                "rides": rides_data
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# def verify_admin_token(x_admin_token: Optional[str] = Header(None)):
#     print(f"🔑 Received admin token: '{x_admin_token}'")
#     print(f"🔑 Expected token:      '{ADMIN_TOKEN}'")
#     if not x_admin_token:
#         raise HTTPException(status_code=401, detail="Admin token required")
#     if x_admin_token != ADMIN_TOKEN:
#         raise HTTPException(status_code=401, detail="Invalid admin token")
#     return x_admin_token

def verify_admin_token(x_admin_token: Optional[str] = Header(None)):
    print(f"🔑 Received header: '{x_admin_token}'")
    print(f"🔑 Expected token:  '{ADMIN_TOKEN}'")
    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Admin token required")
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return x_admin_token

# from fastapi import APIRouter, HTTPException, Depends, Query
# from sqlmodel import select, update
# from sqlalchemy.ext.asyncio import AsyncSession
# from typing import List, Optional, Dict, Any
# from datetime import datetime
# import traceback
# import logging

# from db import get_session
# from models.ride import Ride
# from models.user import User
# from pydantic import BaseModel

# router = APIRouter(prefix="/admin", tags=["admin"])
# logger = logging.getLogger(__name__)

# # ---------- Schemas ----------
# class RideStatusUpdate(BaseModel):
#     status: str

# class PaymentStatusUpdate(BaseModel):
#     payment_status: str

# # ---------- Admin token verification ----------
# ADMIN_TOKEN = "admin-secret-token"  # Should match your frontend

# def verify_admin_token(authorization: Optional[str] = Header(None)):
#     if not authorization:
#         raise HTTPException(status_code=401, detail="Missing Authorization header")
    
#     scheme, token = authorization.split()
#     if scheme.lower() != "bearer" or token != ADMIN_TOKEN:
#         raise HTTPException(status_code=401, detail="Invalid admin token")
#     return token

# # ---------- Routes ----------
# @router.get("/rides", response_model=List[Dict[str, Any]])
# async def get_all_rides(
#     status: Optional[str] = Query(None),
#     payment_status: Optional[str] = Query(None),
#     search: Optional[str] = Query(None),
#     start_date: Optional[str] = Query(None),
#     end_date: Optional[str] = Query(None),
#     limit: int = Query(100, ge=1, le=1000),
#     offset: int = Query(0, ge=0),
#     admin_token: str = Depends(verify_admin_token),
#     session: AsyncSession = Depends(get_session)
# ):
#     """Get all rides with optional filtering – ADMIN ONLY"""
#     try:
#         # Build query
#         query = select(Ride).order_by(Ride.id.desc())
        
#         if status and status != "all":
#             query = query.where(Ride.status == status)
#         if payment_status and payment_status != "all":
#             query = query.where(Ride.payment_status == payment_status)
#         if start_date:
#             query = query.where(Ride.created_at >= datetime.fromisoformat(start_date))
#         if end_date:
#             query = query.where(Ride.created_at <= datetime.fromisoformat(end_date))
#         # (search not implemented for brevity)
        
#         query = query.offset(offset).limit(limit)
        
#         result = await session.execute(query)
#         rides = result.scalars().all()
        
#         # Convert to dicts and optionally fetch user email
#         ride_list = []
#         for ride in rides:
#             ride_dict = {
#                 "id": ride.id,
#                 "user_id": ride.user_id,
#                 "pickup_address": ride.pickup_address,
#                 "drop_address": ride.drop_address,
#                 "estimated_price": ride.estimated_price,
#                 "actual_price": ride.final_price or ride.estimated_price,
#                 "status": ride.status,
#                 "payment_status": ride.payment_status,
#                 "payment_method": "Stripe" if ride.payment_intent_id else "Cash",
#                 "created_at": ride.created_at.isoformat() if ride.created_at else None,
#                 "updated_at": ride.updated_at.isoformat() if ride.updated_at else None,
#                 "completed_at": ride.completed_at.isoformat() if ride.completed_at else None,
#                 "driver_id": ride.driver_id,
#                 "distance": ride.estimated_distance_km,
#             }
#             # Optionally get user email
#             user_result = await session.execute(select(User).where(User.id == ride.user_id))
#             user = user_result.scalar_one_or_none()
#             if user:
#                 ride_dict["user_email"] = user.email
#                 ride_dict["user_name"] = f"{user.first_name} {user.last_name}"
#             ride_list.append(ride_dict)
        
#         return ride_list
#     except Exception as e:
#         logger.error(f"Error fetching rides: {e}")
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))

# @router.patch("/rides/{ride_id}/status")
# async def update_ride_status(
#     ride_id: int,
#     status_update: RideStatusUpdate,
#     admin_token: str = Depends(verify_admin_token),
#     session: AsyncSession = Depends(get_session)
# ):
#     """Update ride status – ADMIN ONLY"""
#     try:
#         result = await session.execute(select(Ride).where(Ride.id == ride_id))
#         ride = result.scalar_one_or_none()
#         if not ride:
#             raise HTTPException(status_code=404, detail="Ride not found")
        
#         ride.status = status_update.status
#         ride.updated_at = datetime.utcnow()
        
#         if status_update.status == "completed":
#             ride.completed_at = datetime.utcnow()
#         elif status_update.status == "cancelled":
#             ride.cancelled_at = datetime.utcnow()
        
#         session.add(ride)
#         await session.commit()
#         await session.refresh(ride)
        
#         return {"message": "Status updated", "ride_id": ride_id, "status": ride.status}
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error updating ride status: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.patch("/rides/{ride_id}/payment-status")
# async def update_payment_status(
#     ride_id: int,
#     payment_update: PaymentStatusUpdate,
#     admin_token: str = Depends(verify_admin_token),
#     session: AsyncSession = Depends(get_session)
# ):
#     """Update payment status – ADMIN ONLY"""
#     try:
#         result = await session.execute(select(Ride).where(Ride.id == ride_id))
#         ride = result.scalar_one_or_none()
#         if not ride:
#             raise HTTPException(status_code=404, detail="Ride not found")
        
#         ride.payment_status = payment_update.payment_status
#         ride.updated_at = datetime.utcnow()
        
#         if payment_update.payment_status == "paid":
#             ride.paid_at = datetime.utcnow()  # you may need to add this field to your model
#             # Optionally set actual price
#             if not ride.final_price:
#                 ride.final_price = ride.estimated_price
        
#         session.add(ride)
#         await session.commit()
#         await session.refresh(ride)
        
#         return {"message": "Payment status updated", "ride_id": ride_id, "payment_status": ride.payment_status}
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error updating payment status: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/stats")
# async def get_admin_stats(
#     admin_token: str = Depends(verify_admin_token),
#     session: AsyncSession = Depends(get_session)
# ):
#     """Get dashboard statistics – ADMIN ONLY"""
#     try:
#         # Total rides
#         total = await session.execute(select(Ride.id))
#         total_rides = len(total.all())
        
#         # Today's rides
#         today = datetime.utcnow().date()
#         today_start = datetime(today.year, today.month, today.day)
#         today_stmt = select(Ride.id).where(Ride.created_at >= today_start)
#         today_result = await session.execute(today_stmt)
#         today_rides = len(today_result.all())
        
#         # Completed rides
#         completed_stmt = select(Ride.id).where(Ride.status == "completed")
#         completed_result = await session.execute(completed_stmt)
#         completed_rides = len(completed_result.all())
        
#         # Paid rides & total revenue
#         paid_stmt = select(Ride).where(Ride.payment_status == "paid")
#         paid_result = await session.execute(paid_stmt)
#         paid_rides = paid_result.scalars().all()
#         total_revenue = sum((ride.final_price or ride.estimated_price or 0) for ride in paid_rides)
        
#         # Pending payments
#         pending_stmt = select(Ride.id).where(Ride.payment_status == "pending")
#         pending_result = await session.execute(pending_stmt)
#         pending_payments = len(pending_result.all())
        
#         return {
#             "total_rides": total_rides,
#             "today_rides": today_rides,
#             "completed_rides": completed_rides,
#             "total_revenue": round(total_revenue, 2),
#             "pending_payments": pending_payments,
#             "paid_rides": len(paid_rides),
#             "average_ride_value": round(total_revenue / len(paid_rides), 2) if paid_rides else 0
#         }
#     except Exception as e:
#         logger.error(f"Error fetching stats: {e}")
#         raise HTTPException(status_code=500, detail=str(e))