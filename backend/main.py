from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from routes.payments import router as payments_router
from routes.rides import router as rides_router
from routes.booking import router as booking_router
from routes.auth import router as auth_router
from routes.receipts import router as receipts_router
from routes.health import router as health_router
from routes.admin import router as admin_router
from routes.ratings import router as ratings_router

from security.middleware import request_validation_middleware
from websocket.socket_manager import socket_app, sio

app = FastAPI()
app.middleware("http")(request_validation_middleware)

# CORS configuration (already fine)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.get("/api/status")
async def api_status(request: Request):
    return {"status": "ok", "message": "API is running"}

# ✅ REGISTER ROUTERS – EACH ONCE, WITH CORRECT PREFIXES
app.include_router(rides_router, prefix="/rides", tags=["rides"])
app.include_router(payments_router, tags=["payments"])          # ← router already has prefix="/payments"
app.include_router(booking_router, prefix="/booking", tags=["booking"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(receipts_router, prefix="/receipts", tags=["receipts"])
app.include_router(health_router, tags=["health"])
# app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(admin_router)
app.include_router(ratings_router,tags=["ratings"])

@app.on_event("startup")
async def startup():
    from db import engine
    from models.ride import Ride
    from models.user import User
    from models.location import DriverLocation
    from models.booking import Booking

    app.mount("/ws", socket_app)

    print("🚀 Starting PyCab Backend Server...")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # List all registered routes for verification
    print("📡 Registered Routes:")
    for route in app.routes:
        if hasattr(route, "methods"):
            print(f"   {list(route.methods)} {route.path}")