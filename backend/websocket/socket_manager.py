import socketio
from fastapi import FastAPI

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_ride(sid, ride_id):
    sio.enter_room(sid, ride_id)
    await sio.emit('joined_ride', {'ride_id': ride_id}, room=sid)

@sio.event
async def driver_location(sid, data):
    ride_id = data['ride_id']
    location = data['location']  # {lat: ..., lng: ...}
    # Broadcast to everyone in the ride room except the sender
    await sio.emit('driver_location_update', location, room=ride_id, skip_sid=sid)