from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    CLIENTE = "cliente"
    MECANICO = "mecanico"

class RepairStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    WAITING_PARTS = "waiting_parts"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PAID = "paid"
    BALANCE_PENDING = "balance_pending"

class ServiceType(str, Enum):
    MOBILE = "mobile"
    WORKSHOP = "workshop"

class User(BaseModel):
    id: str
    email: EmailStr
    password_hash: str
    name: str
    role: UserRole
    phone: str
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole
    phone: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: UserRole
    phone: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

class Client(BaseModel):
    id: str
    user_id: str
    city: str
    address: str
    vehicle_info: str
    created_at: datetime

class ClientCreate(BaseModel):
    user_id: str
    city: str
    address: str
    vehicle_info: str

class ClientResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    user_phone: str
    city: str
    address: str
    vehicle_info: str
    created_at: datetime

class Mechanic(BaseModel):
    id: str
    user_id: str
    address: str
    specialties: List[str]
    is_mobile: bool
    speaks_english: bool
    rating: float
    created_at: datetime

class MechanicCreate(BaseModel):
    user_id: str
    address: str
    specialties: List[str]
    is_mobile: bool
    speaks_english: bool

class MechanicResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    user_phone: str
    address: str
    specialties: List[str]
    is_mobile: bool
    speaks_english: bool
    rating: float
    created_at: datetime

class Workshop(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    services: List[str]
    rating: float
    created_at: datetime

class WorkshopCreate(BaseModel):
    name: str
    address: str
    phone: str
    services: List[str]

class WorkshopResponse(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    services: List[str]
    rating: float
    created_at: datetime

class Repair(BaseModel):
    id: str
    client_id: str
    mechanic_id: Optional[str] = None
    workshop_id: Optional[str] = None
    vehicle_info: str
    issue_description: str
    status: RepairStatus
    service_type: ServiceType
    location: str
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    cost: Optional[float] = None
    labor_cost: Optional[float] = None
    additional_services: Optional[float] = None
    amount_charged: Optional[float] = None
    balance_pending: Optional[float] = None
    share_token: Optional[str] = None
    created_at: datetime

class RepairCreate(BaseModel):
    client_id: str
    vehicle_info: str
    issue_description: str
    service_type: ServiceType
    location: str
    scheduled_date: Optional[datetime] = None

class RepairUpdate(BaseModel):
    mechanic_id: Optional[str] = None
    workshop_id: Optional[str] = None
    status: Optional[RepairStatus] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    cost: Optional[float] = None
    labor_cost: Optional[float] = None
    additional_services: Optional[float] = None
    amount_charged: Optional[float] = None
    balance_pending: Optional[float] = None

class RepairResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    mechanic_id: Optional[str] = None
    mechanic_name: Optional[str] = None
    workshop_id: Optional[str] = None
    workshop_name: Optional[str] = None
    vehicle_info: str
    issue_description: str
    status: RepairStatus
    service_type: ServiceType
    location: str
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    cost: Optional[float] = None
    labor_cost: Optional[float] = None
    additional_services: Optional[float] = None
    amount_charged: Optional[float] = None
    balance_pending: Optional[float] = None
    share_token: Optional[str] = None
    created_at: datetime

class AuthorizedPoint(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    services: List[str]
    contact_person: str
    created_at: datetime

class AuthorizedPointCreate(BaseModel):
    name: str
    address: str
    phone: str
    services: List[str]
    contact_person: str

class AuthorizedPointResponse(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    services: List[str]
    contact_person: str
    created_at: datetime

class PartStatus(str, Enum):
    PENDING = "pending"
    ORDERED = "ordered"
    RECEIVED = "received"

class Part(BaseModel):
    id: str
    repair_id: str
    name: str
    supplier_id: Optional[str] = None  # ID of AuthorizedPoint
    supplier_name: Optional[str] = None  # Custom supplier name
    status: PartStatus
    ordered_online: bool = False
    estimated_arrival: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

class PartCreate(BaseModel):
    repair_id: str
    name: str
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    ordered_online: bool = False
    estimated_arrival: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class PartUpdate(BaseModel):
    name: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    status: Optional[PartStatus] = None
    ordered_online: Optional[bool] = None
    estimated_arrival: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class PartResponse(BaseModel):
    id: str
    repair_id: str
    name: str
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    status: PartStatus
    ordered_online: bool
    estimated_arrival: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

class VinEngineInfo(BaseModel):
    cylinders: Optional[str] = None
    displacement_l: Optional[str] = None
    fuel_type: Optional[str] = None
    horsepower: Optional[str] = None

class VinDecoded(BaseModel):
    vin: str
    make: Optional[str] = None
    model: Optional[str] = None
    model_year: Optional[str] = None
    trim: Optional[str] = None
    body_class: Optional[str] = None
    vehicle_type: Optional[str] = None
    drive_type: Optional[str] = None
    transmission: Optional[str] = None
    engine: VinEngineInfo
    plant_country: Optional[str] = None
    summary: str

class ExpressServicePriority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    CRITICAL = "critical"

class ExpressServiceStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    EN_ROUTE = "en_route"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ExpressService(BaseModel):
    id: str
    client_id: str
    mechanic_id: Optional[str] = None
    vehicle_info: str
    emergency_type: str
    description: str
    priority: ExpressServicePriority
    status: ExpressServiceStatus
    location: str
    contact_phone: str
    estimated_arrival: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cost: Optional[float] = None
    created_at: datetime

class ExpressServiceCreate(BaseModel):
    client_id: str
    vehicle_info: str
    emergency_type: str
    description: str
    priority: ExpressServicePriority
    location: str
    contact_phone: str

class ExpressServiceUpdate(BaseModel):
    mechanic_id: Optional[str] = None
    status: Optional[ExpressServiceStatus] = None
    estimated_arrival: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cost: Optional[float] = None

class ExpressServiceResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    mechanic_id: Optional[str] = None
    mechanic_name: Optional[str] = None
    vehicle_info: str
    emergency_type: str
    description: str
    priority: ExpressServicePriority
    status: ExpressServiceStatus
    location: str
    contact_phone: str
    estimated_arrival: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cost: Optional[float] = None
    created_at: datetime

class RepairRequestStatus(str, Enum):
    NEW = "new"
    CONVERTED = "converted"
    REJECTED = "rejected"

class RepairRequest(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    vehicle_info: str
    description: str
    service_type: str  # 'mobile' | 'workshop'
    location: str
    preferred_datetime: Optional[datetime] = None
    is_emergency: bool = False
    status: RepairRequestStatus
    client_id: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

class RepairRequestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    vehicle_info: str
    description: str
    service_type: str
    location: str
    preferred_datetime: Optional[datetime] = None
    is_emergency: bool = False
    captcha_token: Optional[str] = None  # reserved for future

class RepairRequestResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    vehicle_info: str
    description: str
    service_type: str
    location: str
    preferred_datetime: Optional[datetime] = None
    is_emergency: bool
    status: RepairRequestStatus
    client_id: Optional[str] = None
    created_at: datetime
