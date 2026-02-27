from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
import math
from models.user import User
from models.location import DriverLocation
from models.ride import Ride

async def match_driver_to_ride(session: AsyncSession, ride: Ride):
    # Get all online drivers
    result = await session.execute(
        select(User, DriverLocation).join(
            DriverLocation, User.id == DriverLocation.driver_id
        ).where(User.role == "driver", DriverLocation.is_online == True)
    )
    drivers_with_locations = result.all()
    
    if not drivers_with_locations:
        return None
    
    # Find the nearest driver
    nearest_driver = None
    min_distance = float('inf')
    
    for user, driver_location in drivers_with_locations:
        distance = haversine_distance(
            ride.pickup_lat, ride.pickup_lng,
            driver_location.lat, driver_location.lng
        )
        if distance < min_distance:
            min_distance = distance
            nearest_driver = user
    
    # Assign the driver to the ride
    ride.driver_id = nearest_driver.id
    ride.status = "driver_assigned"
    session.add(ride)
    await session.commit()
    
    return nearest_driver

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points in kilometers."""
    R = 6371.0  # Earth radius in kilometers

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c