from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from collections import deque, defaultdict
import uuid
import urllib.request
import json
import re
import time
import threading

from app.models import (
    UserCreate, UserLogin, UserResponse, Token, TokenData,
    ClientCreate, ClientResponse, Client,
    MechanicCreate, MechanicResponse, Mechanic,
    WorkshopCreate, WorkshopResponse, Workshop,
    RepairCreate, RepairUpdate, RepairResponse, Repair, RepairStatus,
    AuthorizedPointCreate, AuthorizedPointResponse, AuthorizedPoint,
    PartCreate, PartUpdate, PartResponse, Part, PartStatus,
    ExpressServiceCreate, ExpressServiceUpdate, ExpressServiceResponse, ExpressService,
    ExpressServicePriority, ExpressServiceStatus,
    RepairRequestCreate, RepairRequestResponse, RepairRequest, RepairRequestStatus,
    User, UserRole, VinDecoded, VinEngineInfo
)
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_admin, require_mechanic,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.database import db

app = FastAPI(title="AYJ Auto Repair Platform")

ALLOWED_ORIGINS = [
    "https://repo-access-app-inch4qir.devinapps.com",
    "http://localhost:5173",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

RATE_LIMIT = 3  # requests
WINDOW_SEC = 3600  # per hour
_ip_buckets = defaultdict(deque)
_rl_lock = threading.Lock()

def rate_limit_public(request: Request):
    """Rate limit dependency for public endpoints"""
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host
    now = time.time()
    with _rl_lock:
        dq = _ip_buckets[ip]
        while dq and now - dq[0] > WINDOW_SEC:
            dq.popleft()
        if len(dq) >= RATE_LIMIT:
            raise HTTPException(status_code=429, detail="Too many requests, try later.")
        dq.append(now)
    return None

vin_cache: Dict[str, dict] = {}
VIN_CACHE_TTL = 7 * 24 * 60 * 60  # 7 days in seconds

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/db_info")
async def db_info():
    """Diagnostic endpoint to check which database engine is being used"""
    import os
    from app.database import db_engine
    return {
        "engine": db_engine,
        "database_url_present": bool(os.getenv("DATABASE_URL")),
        "production_mode": bool(os.getenv("FLY_APP_NAME"))
    }

@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    if db.get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone,
        created_at=datetime.utcnow()
    )
    
    db.create_user(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        phone=user.phone,
        created_at=user.created_at
    )

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    user = db.get_user_by_email(current_user.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        phone=user.phone,
        created_at=user.created_at
    )

@app.get("/api/clients", response_model=List[ClientResponse])
async def list_clients(current_user: TokenData = Depends(require_admin)):
    clients = db.get_all_clients()
    result = []
    for client in clients:
        user = db.get_user_by_id(client.user_id)
        if user:
            result.append(ClientResponse(
                id=client.id,
                user_id=client.user_id,
                user_name=user.name,
                user_email=user.email,
                user_phone=user.phone,
                city=client.city,
                address=client.address,
                vehicle_info=client.vehicle_info,
                created_at=client.created_at
            ))
    return result

@app.get("/api/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: TokenData = Depends(require_admin)):
    client = db.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    user = db.get_user_by_id(client.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return ClientResponse(
        id=client.id,
        user_id=client.user_id,
        user_name=user.name,
        user_email=user.email,
        user_phone=user.phone,
        city=client.city,
        address=client.address,
        vehicle_info=client.vehicle_info,
        created_at=client.created_at
    )

@app.post("/api/clients", response_model=ClientResponse)
async def create_client(client_data: ClientCreate, current_user: TokenData = Depends(require_admin)):
    user = db.get_user_by_id(client_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    client_id = str(uuid.uuid4())
    client = Client(
        id=client_id,
        user_id=client_data.user_id,
        city=client_data.city,
        address=client_data.address,
        vehicle_info=client_data.vehicle_info,
        created_at=datetime.utcnow()
    )
    
    db.create_client(client)
    
    return ClientResponse(
        id=client.id,
        user_id=client.user_id,
        user_name=user.name,
        user_email=user.email,
        user_phone=user.phone,
        city=client.city,
        address=client.address,
        vehicle_info=client.vehicle_info,
        created_at=client.created_at
    )

@app.put("/api/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, client_data: ClientCreate, current_user: TokenData = Depends(require_admin)):
    existing_client = db.get_client(client_id)
    if not existing_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    user = db.get_user_by_id(client_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_client = Client(
        id=client_id,
        user_id=client_data.user_id,
        city=client_data.city,
        address=client_data.address,
        vehicle_info=client_data.vehicle_info,
        created_at=existing_client.created_at
    )
    
    db.update_client(client_id, updated_client)
    
    return ClientResponse(
        id=updated_client.id,
        user_id=updated_client.user_id,
        user_name=user.name,
        user_email=user.email,
        user_phone=user.phone,
        city=updated_client.city,
        address=updated_client.address,
        vehicle_info=updated_client.vehicle_info,
        created_at=updated_client.created_at
    )

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str, current_user: TokenData = Depends(require_admin)):
    if not db.delete_client(client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

@app.get("/api/mechanics", response_model=List[MechanicResponse])
async def list_mechanics(current_user: TokenData = Depends(require_admin)):
    mechanics = db.get_all_mechanics()
    result = []
    for mechanic in mechanics:
        user = db.get_user_by_id(mechanic.user_id)
        if user:
            result.append(MechanicResponse(
                id=mechanic.id,
                user_id=mechanic.user_id,
                user_name=user.name,
                user_email=user.email,
                user_phone=user.phone,
                address=mechanic.address,
                specialties=mechanic.specialties,
                is_mobile=mechanic.is_mobile,
                speaks_english=mechanic.speaks_english,
                rating=mechanic.rating,
                created_at=mechanic.created_at
            ))
    return result

@app.get("/api/mechanics/{mechanic_id}", response_model=MechanicResponse)
async def get_mechanic(mechanic_id: str, current_user: TokenData = Depends(require_admin)):
    mechanic = db.get_mechanic(mechanic_id)
    if not mechanic:
        raise HTTPException(status_code=404, detail="Mechanic not found")
    
    user = db.get_user_by_id(mechanic.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return MechanicResponse(
        id=mechanic.id,
        user_id=mechanic.user_id,
        user_name=user.name,
        user_email=user.email,
        user_phone=user.phone,
        address=mechanic.address,
        specialties=mechanic.specialties,
        is_mobile=mechanic.is_mobile,
        speaks_english=mechanic.speaks_english,
        rating=mechanic.rating,
        created_at=mechanic.created_at
    )

@app.post("/api/mechanics", response_model=MechanicResponse)
async def create_mechanic(mechanic_data: MechanicCreate, current_user: TokenData = Depends(require_admin)):
    user = db.get_user_by_id(mechanic_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    mechanic_id = str(uuid.uuid4())
    mechanic = Mechanic(
        id=mechanic_id,
        user_id=mechanic_data.user_id,
        address=mechanic_data.address,
        specialties=mechanic_data.specialties,
        is_mobile=mechanic_data.is_mobile,
        speaks_english=mechanic_data.speaks_english,
        rating=5.0,
        created_at=datetime.utcnow()
    )
    
    db.create_mechanic(mechanic)
    
    return MechanicResponse(
        id=mechanic.id,
        user_id=mechanic.user_id,
        user_name=user.name,
        user_email=user.email,
        user_phone=user.phone,
        address=mechanic.address,
        specialties=mechanic.specialties,
        is_mobile=mechanic.is_mobile,
        speaks_english=mechanic.speaks_english,
        rating=mechanic.rating,
        created_at=mechanic.created_at
    )

@app.put("/api/mechanics/{mechanic_id}", response_model=MechanicResponse)
async def update_mechanic(mechanic_id: str, mechanic_data: MechanicCreate, current_user: TokenData = Depends(require_admin)):
    existing_mechanic = db.get_mechanic(mechanic_id)
    if not existing_mechanic:
        raise HTTPException(status_code=404, detail="Mechanic not found")
    
    user = db.get_user_by_id(mechanic_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_mechanic = Mechanic(
        id=mechanic_id,
        user_id=mechanic_data.user_id,
        address=mechanic_data.address,
        specialties=mechanic_data.specialties,
        is_mobile=mechanic_data.is_mobile,
        speaks_english=mechanic_data.speaks_english,
        rating=existing_mechanic.rating,
        created_at=existing_mechanic.created_at
    )
    
    db.update_mechanic(mechanic_id, updated_mechanic)
    
    return MechanicResponse(
        id=updated_mechanic.id,
        user_id=updated_mechanic.user_id,
        user_name=user.name,
        user_email=user.email,
        user_phone=user.phone,
        address=updated_mechanic.address,
        specialties=updated_mechanic.specialties,
        is_mobile=updated_mechanic.is_mobile,
        speaks_english=updated_mechanic.speaks_english,
        rating=updated_mechanic.rating,
        created_at=updated_mechanic.created_at
    )

@app.delete("/api/mechanics/{mechanic_id}")
async def delete_mechanic(mechanic_id: str, current_user: TokenData = Depends(require_admin)):
    if not db.delete_mechanic(mechanic_id):
        raise HTTPException(status_code=404, detail="Mechanic not found")
    return {"message": "Mechanic deleted successfully"}

@app.get("/api/workshops", response_model=List[WorkshopResponse])
async def list_workshops(current_user: TokenData = Depends(get_current_user)):
    workshops = db.get_all_workshops()
    return [WorkshopResponse(**workshop.model_dump()) for workshop in workshops]

@app.get("/api/workshops/{workshop_id}", response_model=WorkshopResponse)
async def get_workshop(workshop_id: str, current_user: TokenData = Depends(get_current_user)):
    workshop = db.get_workshop(workshop_id)
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    return WorkshopResponse(**workshop.model_dump())

@app.post("/api/workshops", response_model=WorkshopResponse)
async def create_workshop(workshop_data: WorkshopCreate, current_user: TokenData = Depends(require_admin)):
    workshop_id = str(uuid.uuid4())
    workshop = Workshop(
        id=workshop_id,
        name=workshop_data.name,
        address=workshop_data.address,
        phone=workshop_data.phone,
        services=workshop_data.services,
        rating=5.0,
        created_at=datetime.utcnow()
    )
    
    db.create_workshop(workshop)
    return WorkshopResponse(**workshop.model_dump())

@app.put("/api/workshops/{workshop_id}", response_model=WorkshopResponse)
async def update_workshop(workshop_id: str, workshop_data: WorkshopCreate, current_user: TokenData = Depends(require_admin)):
    existing_workshop = db.get_workshop(workshop_id)
    if not existing_workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    updated_workshop = Workshop(
        id=workshop_id,
        name=workshop_data.name,
        address=workshop_data.address,
        phone=workshop_data.phone,
        services=workshop_data.services,
        rating=existing_workshop.rating,
        created_at=existing_workshop.created_at
    )
    
    db.update_workshop(workshop_id, updated_workshop)
    return WorkshopResponse(**updated_workshop.model_dump())

@app.delete("/api/workshops/{workshop_id}")
async def delete_workshop(workshop_id: str, current_user: TokenData = Depends(require_admin)):
    if not db.delete_workshop(workshop_id):
        raise HTTPException(status_code=404, detail="Workshop not found")
    return {"message": "Workshop deleted successfully"}

@app.get("/api/repairs", response_model=List[RepairResponse])
async def list_repairs(current_user: TokenData = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        repairs = db.get_all_repairs()
    elif current_user.role == UserRole.CLIENTE:
        user = db.get_user_by_email(current_user.email)
        clients = [c for c in db.get_all_clients() if c.user_id == user.id]
        if clients:
            repairs = db.get_repairs_by_client(clients[0].id)
        else:
            repairs = []
    elif current_user.role == UserRole.MECANICO:
        user = db.get_user_by_email(current_user.email)
        mechanics = [m for m in db.get_all_mechanics() if m.user_id == user.id]
        if mechanics:
            repairs = db.get_repairs_by_mechanic(mechanics[0].id)
        else:
            repairs = []
    else:
        repairs = []
    
    result = []
    for repair in repairs:
        client = db.get_client(repair.client_id)
        client_user = db.get_user_by_id(client.user_id) if client else None
        
        mechanic_name = None
        if repair.mechanic_id:
            mechanic = db.get_mechanic(repair.mechanic_id)
            if mechanic:
                mechanic_user = db.get_user_by_id(mechanic.user_id)
                mechanic_name = mechanic_user.name if mechanic_user else None
        
        workshop_name = None
        if repair.workshop_id:
            workshop = db.get_workshop(repair.workshop_id)
            workshop_name = workshop.name if workshop else None
        
        result.append(RepairResponse(
            id=repair.id,
            client_id=repair.client_id,
            client_name=client_user.name if client_user else "Unknown",
            mechanic_id=repair.mechanic_id,
            mechanic_name=mechanic_name,
            workshop_id=repair.workshop_id,
            workshop_name=workshop_name,
            vehicle_info=repair.vehicle_info,
            issue_description=repair.issue_description,
            status=repair.status,
            service_type=repair.service_type,
            location=repair.location,
            scheduled_date=repair.scheduled_date,
            completed_date=repair.completed_date,
            cost=repair.cost,
            created_at=repair.created_at
        ))
    
    return result

@app.get("/api/repairs/{repair_id}", response_model=RepairResponse)
async def get_repair(repair_id: str, current_user: TokenData = Depends(get_current_user)):
    repair = db.get_repair(repair_id)
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    client = db.get_client(repair.client_id)
    client_user = db.get_user_by_id(client.user_id) if client else None
    
    mechanic_name = None
    if repair.mechanic_id:
        mechanic = db.get_mechanic(repair.mechanic_id)
        if mechanic:
            mechanic_user = db.get_user_by_id(mechanic.user_id)
            mechanic_name = mechanic_user.name if mechanic_user else None
    
    workshop_name = None
    if repair.workshop_id:
        workshop = db.get_workshop(repair.workshop_id)
        workshop_name = workshop.name if workshop else None
    
    return RepairResponse(
        id=repair.id,
        client_id=repair.client_id,
        client_name=client_user.name if client_user else "Unknown",
        mechanic_id=repair.mechanic_id,
        mechanic_name=mechanic_name,
        workshop_id=repair.workshop_id,
        workshop_name=workshop_name,
        vehicle_info=repair.vehicle_info,
        issue_description=repair.issue_description,
        status=repair.status,
        service_type=repair.service_type,
        location=repair.location,
        scheduled_date=repair.scheduled_date,
        completed_date=repair.completed_date,
        cost=repair.cost,
        created_at=repair.created_at
    )

@app.post("/api/repairs", response_model=RepairResponse)
async def create_repair(repair_data: RepairCreate, current_user: TokenData = Depends(get_current_user)):
    client = db.get_client(repair_data.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    repair_id = str(uuid.uuid4())
    repair = Repair(
        id=repair_id,
        client_id=repair_data.client_id,
        vehicle_info=repair_data.vehicle_info,
        issue_description=repair_data.issue_description,
        status=RepairStatus.PENDING,
        service_type=repair_data.service_type,
        location=repair_data.location,
        scheduled_date=repair_data.scheduled_date,
        created_at=datetime.utcnow()
    )
    
    db.create_repair(repair)
    
    client_user = db.get_user_by_id(client.user_id)
    
    return RepairResponse(
        id=repair.id,
        client_id=repair.client_id,
        client_name=client_user.name if client_user else "Unknown",
        mechanic_id=repair.mechanic_id,
        mechanic_name=None,
        workshop_id=repair.workshop_id,
        workshop_name=None,
        vehicle_info=repair.vehicle_info,
        issue_description=repair.issue_description,
        status=repair.status,
        service_type=repair.service_type,
        location=repair.location,
        scheduled_date=repair.scheduled_date,
        completed_date=repair.completed_date,
        cost=repair.cost,
        created_at=repair.created_at
    )

@app.put("/api/repairs/{repair_id}", response_model=RepairResponse)
async def update_repair(repair_id: str, repair_data: RepairUpdate, current_user: TokenData = Depends(get_current_user)):
    existing_repair = db.get_repair(repair_id)
    if not existing_repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    updated_repair = Repair(
        id=repair_id,
        client_id=existing_repair.client_id,
        mechanic_id=repair_data.mechanic_id if repair_data.mechanic_id else existing_repair.mechanic_id,
        workshop_id=repair_data.workshop_id if repair_data.workshop_id else existing_repair.workshop_id,
        vehicle_info=existing_repair.vehicle_info,
        issue_description=existing_repair.issue_description,
        status=repair_data.status if repair_data.status else existing_repair.status,
        service_type=existing_repair.service_type,
        location=existing_repair.location,
        scheduled_date=repair_data.scheduled_date if repair_data.scheduled_date else existing_repair.scheduled_date,
        completed_date=repair_data.completed_date if repair_data.completed_date else existing_repair.completed_date,
        cost=repair_data.cost if repair_data.cost else existing_repair.cost,
        amount_charged=existing_repair.amount_charged,
        balance_pending=existing_repair.balance_pending,
        share_token=existing_repair.share_token,
        created_at=existing_repair.created_at
    )
    
    db.update_repair(repair_id, updated_repair)
    
    client = db.get_client(updated_repair.client_id)
    client_user = db.get_user_by_id(client.user_id) if client else None
    
    mechanic_name = None
    if updated_repair.mechanic_id:
        mechanic = db.get_mechanic(updated_repair.mechanic_id)
        if mechanic:
            mechanic_user = db.get_user_by_id(mechanic.user_id)
            mechanic_name = mechanic_user.name if mechanic_user else None
    
    workshop_name = None
    if updated_repair.workshop_id:
        workshop = db.get_workshop(updated_repair.workshop_id)
        workshop_name = workshop.name if workshop else None
    
    return RepairResponse(
        id=updated_repair.id,
        client_id=updated_repair.client_id,
        client_name=client_user.name if client_user else "Unknown",
        mechanic_id=updated_repair.mechanic_id,
        mechanic_name=mechanic_name,
        workshop_id=updated_repair.workshop_id,
        workshop_name=workshop_name,
        vehicle_info=updated_repair.vehicle_info,
        issue_description=updated_repair.issue_description,
        status=updated_repair.status,
        service_type=updated_repair.service_type,
        location=updated_repair.location,
        scheduled_date=updated_repair.scheduled_date,
        completed_date=updated_repair.completed_date,
        cost=updated_repair.cost,
        amount_charged=updated_repair.amount_charged,
        balance_pending=updated_repair.balance_pending,
        share_token=updated_repair.share_token,
        created_at=updated_repair.created_at
    )

@app.patch("/api/repairs/{repair_id}/status", response_model=RepairResponse)
async def update_repair_status(repair_id: str, status: RepairStatus, current_user: TokenData = Depends(require_mechanic)):
    existing_repair = db.get_repair(repair_id)
    if not existing_repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    updated_repair = Repair(
        id=repair_id,
        client_id=existing_repair.client_id,
        mechanic_id=existing_repair.mechanic_id,
        workshop_id=existing_repair.workshop_id,
        vehicle_info=existing_repair.vehicle_info,
        issue_description=existing_repair.issue_description,
        status=status,
        service_type=existing_repair.service_type,
        location=existing_repair.location,
        scheduled_date=existing_repair.scheduled_date,
        completed_date=datetime.utcnow() if status == RepairStatus.COMPLETED else existing_repair.completed_date,
        cost=existing_repair.cost,
        amount_charged=existing_repair.amount_charged,
        balance_pending=existing_repair.balance_pending,
        share_token=existing_repair.share_token,
        created_at=existing_repair.created_at
    )
    
    db.update_repair(repair_id, updated_repair)
    
    client = db.get_client(updated_repair.client_id)
    client_user = db.get_user_by_id(client.user_id) if client else None
    
    mechanic_name = None
    if updated_repair.mechanic_id:
        mechanic = db.get_mechanic(updated_repair.mechanic_id)
        if mechanic:
            mechanic_user = db.get_user_by_id(mechanic.user_id)
            mechanic_name = mechanic_user.name if mechanic_user else None
    
    workshop_name = None
    if updated_repair.workshop_id:
        workshop = db.get_workshop(updated_repair.workshop_id)
        workshop_name = workshop.name if workshop else None
    
    return RepairResponse(
        id=updated_repair.id,
        client_id=updated_repair.client_id,
        client_name=client_user.name if client_user else "Unknown",
        mechanic_id=updated_repair.mechanic_id,
        mechanic_name=mechanic_name,
        workshop_id=updated_repair.workshop_id,
        workshop_name=workshop_name,
        vehicle_info=updated_repair.vehicle_info,
        issue_description=updated_repair.issue_description,
        status=updated_repair.status,
        service_type=updated_repair.service_type,
        location=updated_repair.location,
        scheduled_date=updated_repair.scheduled_date,
        completed_date=updated_repair.completed_date,
        cost=updated_repair.cost,
        amount_charged=updated_repair.amount_charged,
        balance_pending=updated_repair.balance_pending,
        share_token=updated_repair.share_token,
        created_at=updated_repair.created_at
    )

@app.delete("/api/repairs/{repair_id}")
async def delete_repair(repair_id: str, current_user: TokenData = Depends(require_admin)):
    if not db.delete_repair(repair_id):
        raise HTTPException(status_code=404, detail="Repair not found")
    return {"message": "Repair deleted successfully"}

@app.get("/api/authorized-points", response_model=List[AuthorizedPointResponse])
async def list_authorized_points(current_user: TokenData = Depends(get_current_user)):
    points = db.get_all_authorized_points()
    return [AuthorizedPointResponse(**point.model_dump()) for point in points]

@app.get("/api/authorized-points/{point_id}", response_model=AuthorizedPointResponse)
async def get_authorized_point(point_id: str, current_user: TokenData = Depends(get_current_user)):
    point = db.get_authorized_point(point_id)
    if not point:
        raise HTTPException(status_code=404, detail="Authorized point not found")
    return AuthorizedPointResponse(**point.model_dump())

@app.post("/api/authorized-points", response_model=AuthorizedPointResponse)
async def create_authorized_point(point_data: AuthorizedPointCreate, current_user: TokenData = Depends(require_admin)):
    point_id = str(uuid.uuid4())
    point = AuthorizedPoint(
        id=point_id,
        name=point_data.name,
        address=point_data.address,
        phone=point_data.phone,
        services=point_data.services,
        contact_person=point_data.contact_person,
        created_at=datetime.utcnow()
    )
    
    db.create_authorized_point(point)
    return AuthorizedPointResponse(**point.model_dump())

@app.put("/api/authorized-points/{point_id}", response_model=AuthorizedPointResponse)
async def update_authorized_point(point_id: str, point_data: AuthorizedPointCreate, current_user: TokenData = Depends(require_admin)):
    existing_point = db.get_authorized_point(point_id)
    if not existing_point:
        raise HTTPException(status_code=404, detail="Authorized point not found")
    
    updated_point = AuthorizedPoint(
        id=point_id,
        name=point_data.name,
        address=point_data.address,
        phone=point_data.phone,
        services=point_data.services,
        contact_person=point_data.contact_person,
        created_at=existing_point.created_at
    )
    
    db.update_authorized_point(point_id, updated_point)
    return AuthorizedPointResponse(**updated_point.model_dump())

@app.delete("/api/authorized-points/{point_id}")
async def delete_authorized_point(point_id: str, current_user: TokenData = Depends(require_admin)):
    if not db.delete_authorized_point(point_id):
        raise HTTPException(status_code=404, detail="Authorized point not found")
    return {"message": "Authorized point deleted successfully"}

@app.get("/api/repairs/{repair_id}/parts", response_model=List[PartResponse])
async def list_parts_for_repair(repair_id: str, current_user: TokenData = Depends(get_current_user)):
    repair = db.get_repair(repair_id)
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    parts = db.get_parts_by_repair(repair_id)
    result = []
    for part in parts:
        supplier_name = None
        if part.supplier_id:
            supplier = db.get_authorized_point(part.supplier_id)
            supplier_name = supplier.name if supplier else None
        
        result.append(PartResponse(
            id=part.id,
            repair_id=part.repair_id,
            name=part.name,
            supplier_id=part.supplier_id,
            supplier_name=supplier_name,
            status=part.status,
            ordered_online=part.ordered_online,
            estimated_arrival=part.estimated_arrival,
            cost=part.cost,
            notes=part.notes,
            created_at=part.created_at
        ))
    return result

@app.post("/api/parts", response_model=PartResponse)
async def create_part(part_data: PartCreate, current_user: TokenData = Depends(require_admin)):
    repair = db.get_repair(part_data.repair_id)
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    if part_data.supplier_id:
        supplier = db.get_authorized_point(part_data.supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
    
    part_id = str(uuid.uuid4())
    part = Part(
        id=part_id,
        repair_id=part_data.repair_id,
        name=part_data.name,
        supplier_id=part_data.supplier_id,
        status=PartStatus.PENDING,
        ordered_online=part_data.ordered_online,
        estimated_arrival=part_data.estimated_arrival,
        cost=part_data.cost,
        notes=part_data.notes,
        created_at=datetime.utcnow()
    )
    
    db.create_part(part)
    
    supplier_name = None
    if part.supplier_id:
        supplier = db.get_authorized_point(part.supplier_id)
        supplier_name = supplier.name if supplier else None
    
    return PartResponse(
        id=part.id,
        repair_id=part.repair_id,
        name=part.name,
        supplier_id=part.supplier_id,
        supplier_name=supplier_name,
        status=part.status,
        ordered_online=part.ordered_online,
        estimated_arrival=part.estimated_arrival,
        cost=part.cost,
        notes=part.notes,
        created_at=part.created_at
    )

@app.patch("/api/parts/{part_id}", response_model=PartResponse)
async def update_part(part_id: str, part_data: PartUpdate, current_user: TokenData = Depends(require_admin)):
    existing_part = db.get_part(part_id)
    if not existing_part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    if part_data.supplier_id:
        supplier = db.get_authorized_point(part_data.supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
    
    updated_part = Part(
        id=part_id,
        repair_id=existing_part.repair_id,
        name=part_data.name if part_data.name is not None else existing_part.name,
        supplier_id=part_data.supplier_id if part_data.supplier_id is not None else existing_part.supplier_id,
        status=part_data.status if part_data.status is not None else existing_part.status,
        ordered_online=part_data.ordered_online if part_data.ordered_online is not None else existing_part.ordered_online,
        estimated_arrival=part_data.estimated_arrival if part_data.estimated_arrival is not None else existing_part.estimated_arrival,
        cost=part_data.cost if part_data.cost is not None else existing_part.cost,
        notes=part_data.notes if part_data.notes is not None else existing_part.notes,
        created_at=existing_part.created_at
    )
    
    db.update_part(part_id, updated_part)
    
    supplier_name = None
    if updated_part.supplier_id:
        supplier = db.get_authorized_point(updated_part.supplier_id)
        supplier_name = supplier.name if supplier else None
    
    return PartResponse(
        id=updated_part.id,
        repair_id=updated_part.repair_id,
        name=updated_part.name,
        supplier_id=updated_part.supplier_id,
        supplier_name=supplier_name,
        status=updated_part.status,
        ordered_online=updated_part.ordered_online,
        estimated_arrival=updated_part.estimated_arrival,
        cost=updated_part.cost,
        notes=updated_part.notes,
        created_at=updated_part.created_at
    )

@app.delete("/api/parts/{part_id}")
async def delete_part(part_id: str, current_user: TokenData = Depends(require_admin)):
    if not db.delete_part(part_id):
        raise HTTPException(status_code=404, detail="Part not found")
    return {"message": "Part deleted successfully"}

@app.get("/api/express-services", response_model=List[ExpressServiceResponse])
async def list_express_services(current_user: TokenData = Depends(get_current_user)):
    services = db.get_all_express_services()
    result = []
    for service in services:
        client = db.get_client(service.client_id)
        if not client:
            continue
        user = db.get_user_by_id(client.user_id)
        if not user:
            continue
        
        mechanic_name = None
        if service.mechanic_id:
            mechanic = db.get_mechanic(service.mechanic_id)
            if mechanic:
                mechanic_user = db.get_user_by_id(mechanic.user_id)
                if mechanic_user:
                    mechanic_name = mechanic_user.name
        
        result.append(ExpressServiceResponse(
            id=service.id,
            client_id=service.client_id,
            client_name=user.name,
            mechanic_id=service.mechanic_id,
            mechanic_name=mechanic_name,
            vehicle_info=service.vehicle_info,
            emergency_type=service.emergency_type,
            description=service.description,
            priority=service.priority,
            status=service.status,
            location=service.location,
            contact_phone=service.contact_phone,
            estimated_arrival=service.estimated_arrival,
            started_at=service.started_at,
            completed_at=service.completed_at,
            cost=service.cost,
            created_at=service.created_at
        ))
    return result

@app.get("/api/express-services/{service_id}", response_model=ExpressServiceResponse)
async def get_express_service(service_id: str, current_user: TokenData = Depends(get_current_user)):
    service = db.get_express_service(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Express service not found")
    
    client = db.get_client(service.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    user = db.get_user_by_id(client.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    mechanic_name = None
    if service.mechanic_id:
        mechanic = db.get_mechanic(service.mechanic_id)
        if mechanic:
            mechanic_user = db.get_user_by_id(mechanic.user_id)
            if mechanic_user:
                mechanic_name = mechanic_user.name
    
    return ExpressServiceResponse(
        id=service.id,
        client_id=service.client_id,
        client_name=user.name,
        mechanic_id=service.mechanic_id,
        mechanic_name=mechanic_name,
        vehicle_info=service.vehicle_info,
        emergency_type=service.emergency_type,
        description=service.description,
        priority=service.priority,
        status=service.status,
        location=service.location,
        contact_phone=service.contact_phone,
        estimated_arrival=service.estimated_arrival,
        started_at=service.started_at,
        completed_at=service.completed_at,
        cost=service.cost,
        created_at=service.created_at
    )

@app.post("/api/express-services", response_model=ExpressServiceResponse)
async def create_express_service(service_data: ExpressServiceCreate, current_user: TokenData = Depends(require_admin)):
    client = db.get_client(service_data.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    service = ExpressService(
        id=str(uuid.uuid4()),
        client_id=service_data.client_id,
        mechanic_id=None,
        vehicle_info=service_data.vehicle_info,
        emergency_type=service_data.emergency_type,
        description=service_data.description,
        priority=service_data.priority,
        status=ExpressServiceStatus.PENDING,
        location=service_data.location,
        contact_phone=service_data.contact_phone,
        estimated_arrival=None,
        started_at=None,
        completed_at=None,
        cost=None,
        created_at=datetime.utcnow()
    )
    
    created_service = db.create_express_service(service)
    user = db.get_user_by_id(client.user_id)
    
    return ExpressServiceResponse(
        id=created_service.id,
        client_id=created_service.client_id,
        client_name=user.name if user else "Unknown",
        mechanic_id=created_service.mechanic_id,
        mechanic_name=None,
        vehicle_info=created_service.vehicle_info,
        emergency_type=created_service.emergency_type,
        description=created_service.description,
        priority=created_service.priority,
        status=created_service.status,
        location=created_service.location,
        contact_phone=created_service.contact_phone,
        estimated_arrival=created_service.estimated_arrival,
        started_at=created_service.started_at,
        completed_at=created_service.completed_at,
        cost=created_service.cost,
        created_at=created_service.created_at
    )

@app.patch("/api/express-services/{service_id}", response_model=ExpressServiceResponse)
async def update_express_service(service_id: str, service_update: ExpressServiceUpdate, current_user: TokenData = Depends(require_admin)):
    service = db.get_express_service(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Express service not found")
    
    if service_update.mechanic_id is not None:
        service.mechanic_id = service_update.mechanic_id
    if service_update.status is not None:
        service.status = service_update.status
    if service_update.estimated_arrival is not None:
        service.estimated_arrival = service_update.estimated_arrival
    if service_update.started_at is not None:
        service.started_at = service_update.started_at
    if service_update.completed_at is not None:
        service.completed_at = service_update.completed_at
    if service_update.cost is not None:
        service.cost = service_update.cost
    
    updated_service = db.update_express_service(service_id, service)
    if not updated_service:
        raise HTTPException(status_code=404, detail="Express service not found")
    
    client = db.get_client(updated_service.client_id)
    user = db.get_user_by_id(client.user_id) if client else None
    
    mechanic_name = None
    if updated_service.mechanic_id:
        mechanic = db.get_mechanic(updated_service.mechanic_id)
        if mechanic:
            mechanic_user = db.get_user_by_id(mechanic.user_id)
            if mechanic_user:
                mechanic_name = mechanic_user.name
    
    return ExpressServiceResponse(
        id=updated_service.id,
        client_id=updated_service.client_id,
        client_name=user.name if user else "Unknown",
        mechanic_id=updated_service.mechanic_id,
        mechanic_name=mechanic_name,
        vehicle_info=updated_service.vehicle_info,
        emergency_type=updated_service.emergency_type,
        description=updated_service.description,
        priority=updated_service.priority,
        status=updated_service.status,
        location=updated_service.location,
        contact_phone=updated_service.contact_phone,
        estimated_arrival=updated_service.estimated_arrival,
        started_at=updated_service.started_at,
        completed_at=updated_service.completed_at,
        cost=updated_service.cost,
        created_at=updated_service.created_at
    )

@app.delete("/api/express-services/{service_id}")
async def delete_express_service(service_id: str, current_user: TokenData = Depends(require_admin)):
    if not db.delete_express_service(service_id):
        raise HTTPException(status_code=404, detail="Express service not found")
    return {"message": "Express service deleted successfully"}

@app.post("/api/public/repair-requests", response_model=RepairRequestResponse)
async def create_public_repair_request(
    payload: RepairRequestCreate,
    request: Request,
    _: None = Depends(rate_limit_public)
):
    rid = str(uuid.uuid4())
    rr = RepairRequest(
        id=rid,
        name=payload.name.strip(),
        email=payload.email,
        phone=payload.phone.strip(),
        vehicle_info=payload.vehicle_info.strip(),
        description=payload.description.strip(),
        service_type=payload.service_type,
        location=payload.location.strip(),
        preferred_datetime=payload.preferred_datetime,
        is_emergency=payload.is_emergency,
        status=RepairRequestStatus.NEW,
        client_id=None,
        ip=request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host,
        user_agent=request.headers.get("user-agent"),
        created_at=datetime.utcnow(),
    )
    db.create_repair_request(rr)
    return RepairRequestResponse(
        id=rr.id,
        name=rr.name,
        email=rr.email,
        phone=rr.phone,
        vehicle_info=rr.vehicle_info,
        description=rr.description,
        service_type=rr.service_type,
        location=rr.location,
        preferred_datetime=rr.preferred_datetime,
        is_emergency=rr.is_emergency,
        status=rr.status,
        client_id=rr.client_id,
        created_at=rr.created_at
    )

@app.get("/api/repair-requests", response_model=List[RepairRequestResponse])
async def list_repair_requests(
    status: Optional[str] = None,
    current_user: TokenData = Depends(require_admin)
):
    requests = db.get_repair_requests(status)
    return [
        RepairRequestResponse(
            id=req.id,
            name=req.name,
            email=req.email,
            phone=req.phone,
            vehicle_info=req.vehicle_info,
            description=req.description,
            service_type=req.service_type,
            location=req.location,
            preferred_datetime=req.preferred_datetime,
            is_emergency=req.is_emergency,
            status=req.status,
            client_id=req.client_id,
            created_at=req.created_at
        )
        for req in requests
    ]

@app.get("/api/repair-requests/{request_id}", response_model=RepairRequestResponse)
async def get_repair_request(request_id: str, current_user: TokenData = Depends(require_admin)):
    req = db.get_repair_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Repair request not found")
    return RepairRequestResponse(
        id=req.id,
        name=req.name,
        email=req.email,
        phone=req.phone,
        vehicle_info=req.vehicle_info,
        description=req.description,
        service_type=req.service_type,
        location=req.location,
        preferred_datetime=req.preferred_datetime,
        is_emergency=req.is_emergency,
        status=req.status,
        client_id=req.client_id,
        created_at=req.created_at
    )

@app.post("/api/repair-requests/{request_id}/convert")
async def convert_repair_request(
    request_id: str,
    mode: str = "repair",
    current_user: TokenData = Depends(require_admin)
):
    req = db.get_repair_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Repair request not found")
    
    if req.status != RepairRequestStatus.NEW:
        raise HTTPException(status_code=409, detail="Request already processed")
    
    existing_client = db.get_client_by_email(req.email)
    
    if existing_client:
        client_id = existing_client.id
    else:
        user_id = str(uuid.uuid4())
        random_password = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=req.email,
            password_hash=get_password_hash(random_password),
            name=req.name,
            role=UserRole.CLIENTE,
            phone=req.phone,
            created_at=datetime.utcnow()
        )
        db.create_user(user)
        
        client_id = str(uuid.uuid4())
        client = Client(
            id=client_id,
            user_id=user_id,
            city="",
            address=req.location,
            vehicle_info=req.vehicle_info,
            created_at=datetime.utcnow()
        )
        db.create_client(client)
    
    if mode == "express":
        service_id = str(uuid.uuid4())
        priority = ExpressServicePriority.URGENT if req.is_emergency else ExpressServicePriority.HIGH
        express_service = ExpressService(
            id=service_id,
            client_id=client_id,
            mechanic_id=None,
            vehicle_info=req.vehicle_info,
            emergency_type="Emergency Repair",
            description=req.description,
            priority=priority,
            status=ExpressServiceStatus.PENDING,
            location=req.location,
            contact_phone=req.phone,
            estimated_arrival=None,
            started_at=None,
            completed_at=None,
            cost=None,
            created_at=datetime.utcnow()
        )
        db.create_express_service(express_service)
        entity_id = service_id
        entity_type = "express_service"
    else:
        repair_id = str(uuid.uuid4())
        repair = Repair(
            id=repair_id,
            client_id=client_id,
            mechanic_id=None,
            workshop_id=None,
            vehicle_info=req.vehicle_info,
            issue_description=req.description,
            status=RepairStatus.PENDING,
            service_type=req.service_type,
            location=req.location,
            scheduled_date=req.preferred_datetime,
            completed_date=None,
            cost=None,
            amount_charged=None,
            balance_pending=None,
            created_at=datetime.utcnow()
        )
        db.create_repair(repair)
        entity_id = repair_id
        entity_type = "repair"
    
    db.update_repair_request_status(request_id, RepairRequestStatus.CONVERTED, client_id)
    
    return {
        "message": f"Request converted to {entity_type} successfully",
        "entity_id": entity_id,
        "entity_type": entity_type,
        "client_id": client_id,
        "client_existed": existing_client is not None
    }

@app.post("/api/repair-requests/{request_id}/reject")
async def reject_repair_request(request_id: str, current_user: TokenData = Depends(require_admin)):
    req = db.get_repair_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Repair request not found")
    
    if req.status != RepairRequestStatus.NEW:
        raise HTTPException(status_code=409, detail="Request already processed")
    
    db.update_repair_request_status(request_id, RepairRequestStatus.REJECTED)
    return {"message": "Request rejected successfully"}

@app.delete("/api/repair-requests/{request_id}")
async def delete_repair_request(request_id: str, current_user: TokenData = Depends(require_admin)):
    if not db.delete_repair_request(request_id):
        raise HTTPException(status_code=404, detail="Repair request not found")
    return {"message": "Repair request deleted successfully"}

@app.get("/api/vin/decode/{vin}", response_model=VinDecoded)
async def decode_vin(vin: str):
    vin = vin.upper().strip()
    
    if not re.match(r'^[A-HJ-NPR-Z0-9]{17}$', vin):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid VIN format. VIN must be 17 characters (no I, O, or Q)"
        )
    
    current_time = time.time()
    if vin in vin_cache:
        cached_entry = vin_cache[vin]
        if cached_entry["expires_at"] > current_time:
            return cached_entry["data"]
        else:
            del vin_cache[vin]
    
    try:
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
        
        if not data.get("Results") or len(data["Results"]) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No data found for this VIN"
            )
        
        result = data["Results"][0]
        
        if not result.get("Make") or result.get("ModelYear") in ["0", "", None]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No vehicle data found for this VIN"
            )
        
        engine_info = VinEngineInfo(
            cylinders=result.get("EngineCylinders") or None,
            displacement_l=result.get("DisplacementL") or None,
            fuel_type=result.get("FuelTypePrimary") or None,
            horsepower=result.get("EngineHP") or None
        )
        
        parts = []
        if result.get("ModelYear"):
            parts.append(result["ModelYear"])
        if result.get("Make"):
            parts.append(result["Make"])
        if result.get("Model"):
            parts.append(result["Model"])
        if result.get("Trim") and result["Trim"] != "Not Applicable":
            parts.append(result["Trim"])
        
        details = []
        if result.get("DriveType"):
            details.append(result["DriveType"])
        if result.get("FuelTypePrimary"):
            details.append(result["FuelTypePrimary"])
        if result.get("DisplacementL"):
            details.append(f"{result['DisplacementL']}L")
        if result.get("TransmissionStyle"):
            details.append(result["TransmissionStyle"])
        
        summary_parts = [" ".join(parts)]
        if details:
            summary_parts.append(" — ".join(details))
        
        summary = " — ".join(summary_parts)
        
        decoded = VinDecoded(
            vin=vin,
            make=result.get("Make") or None,
            model=result.get("Model") or None,
            model_year=result.get("ModelYear") or None,
            trim=result.get("Trim") if result.get("Trim") != "Not Applicable" else None,
            body_class=result.get("BodyClass") or None,
            vehicle_type=result.get("VehicleType") or None,
            drive_type=result.get("DriveType") or None,
            transmission=result.get("TransmissionStyle") or None,
            engine=engine_info,
            plant_country=result.get("PlantCountry") or None,
            summary=summary
        )
        
        vin_cache[vin] = {
            "expires_at": current_time + VIN_CACHE_TTL,
            "data": decoded
        }
        
        return decoded
        
    except urllib.error.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VIN decoding service temporarily unavailable"
        )
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VIN decoding service temporarily unavailable"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error decoding VIN: {str(e)}"
        )

@app.post("/api/repairs/{repair_id}/generate-share-token")
async def generate_share_token(repair_id: str, current_user: TokenData = Depends(require_admin)):
    repair = db.get_repair(repair_id)
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    # Generate a unique share token if it doesn't exist
    if not repair.share_token:
        share_token = str(uuid.uuid4())
        repair.share_token = share_token
        db.update_repair(repair_id, repair)
    else:
        share_token = repair.share_token
    
    return {"share_token": share_token, "share_url": f"/track/{share_token}"}

@app.get("/api/public/track/{share_token}")
async def track_repair_by_token(share_token: str):
    """Public endpoint to view repair status by share token (no authentication required)"""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.*, 
                   u.name as client_name, u.email as client_email, u.phone as client_phone,
                   m_user.name as mechanic_name, m_user.phone as mechanic_phone
            FROM repairs r
            JOIN clients c ON r.client_id = c.id
            JOIN users u ON c.user_id = u.id
            LEFT JOIN mechanics m ON r.mechanic_id = m.id
            LEFT JOIN users m_user ON m.user_id = m_user.id
            WHERE r.share_token = ?
        """, (share_token,))
        
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Repair not found")
        
        # Get parts for this repair
        cursor.execute("""
            SELECT p.*, ap.name as supplier_name
            FROM parts p
            LEFT JOIN authorized_points ap ON p.supplier_id = ap.id
            WHERE p.repair_id = ?
            ORDER BY p.created_at DESC
        """, (row['id'],))
        
        parts_rows = cursor.fetchall()
        parts = []
        for part_row in parts_rows:
            parts.append({
                "id": part_row['id'],
                "name": part_row['name'],
                "status": part_row['status'],
                "ordered_online": bool(part_row['ordered_online']),
                "supplier_name": part_row['supplier_name'],
                "estimated_arrival": part_row['estimated_arrival'],
                "cost": part_row['cost']
            })
        
        return {
            "id": row['id'],
            "client_name": row['client_name'],
            "client_email": row['client_email'],
            "client_phone": row['client_phone'],
            "vehicle_info": row['vehicle_info'],
            "issue_description": row['issue_description'],
            "status": row['status'],
            "service_type": row['service_type'],
            "location": row['location'],
            "mechanic_name": row['mechanic_name'],
            "mechanic_phone": row['mechanic_phone'],
            "scheduled_date": row['scheduled_date'],
            "completed_date": row['completed_date'],
            "cost": row['cost'],
            "created_at": row['created_at'],
            "parts": parts
        }
