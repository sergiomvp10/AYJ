from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import List
import uuid

from app.models import (
    UserCreate, UserLogin, UserResponse, Token, TokenData,
    ClientCreate, ClientResponse, Client,
    MechanicCreate, MechanicResponse, Mechanic,
    WorkshopCreate, WorkshopResponse, Workshop,
    RepairCreate, RepairUpdate, RepairResponse, Repair, RepairStatus,
    AuthorizedPointCreate, AuthorizedPointResponse, AuthorizedPoint,
    PartCreate, PartUpdate, PartResponse, Part, PartStatus,
    User, UserRole
)
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_admin, require_mechanic,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.database import db

app = FastAPI(title="AYJ Auto Repair Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

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
                specialties=mechanic.specialties,
                is_mobile=mechanic.is_mobile,
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
        specialties=mechanic.specialties,
        is_mobile=mechanic.is_mobile,
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
        specialties=mechanic_data.specialties,
        is_mobile=mechanic_data.is_mobile,
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
        specialties=mechanic.specialties,
        is_mobile=mechanic.is_mobile,
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
        specialties=mechanic_data.specialties,
        is_mobile=mechanic_data.is_mobile,
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
        specialties=updated_mechanic.specialties,
        is_mobile=updated_mechanic.is_mobile,
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
