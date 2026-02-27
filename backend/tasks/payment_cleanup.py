# tasks/payment_cleanup.py
from celery_app import celery
from sqlmodel import select
from datetime import datetime, timedelta
import asyncio
from db import engine
from sqlalchemy.ext.asyncio import AsyncSession
from models.ride import Ride, PaymentStatus
import logging

logger = logging.getLogger(__name__)

@celery.task(name="cleanup_pending_payments")
def cleanup_pending_payments():
    """Celery task to cleanup old pending payments"""
    async def async_cleanup():
        async with AsyncSession(engine) as session:
            time_threshold = datetime.utcnow() - timedelta(hours=24)
            
            result = await session.execute(
                select(Ride).where(
                    (Ride.payment_status == PaymentStatus.PENDING) &
                    (Ride.created_at < time_threshold) &
                    (Ride.status != "completed")
                )
            )
            
            stuck_rides = result.scalars().all()
            
            for ride in stuck_rides:
                ride.payment_status = PaymentStatus.FAILED
                ride.updated_at = datetime.utcnow()
                session.add(ride)
            
            await session.commit()
            return len(stuck_rides)
    
    # Run the async function
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    count = loop.run_until_complete(async_cleanup())
    loop.close()
    
    logger.info(f"Cleaned up {count} stuck payments")
    return count

# Schedule this task to run hourly
celery.conf.beat_schedule = {
    'cleanup-pending-payments-hourly': {
        'task': 'cleanup_pending_payments',
        'schedule': 3600.0,  # Every hour
    },
}