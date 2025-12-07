import psycopg
from psycopg.rows import dict_row
import json
import os
from typing import Dict, List, Optional
from app.models import User, Client, Mechanic, Workshop, Repair, AuthorizedPoint, Part, ExpressService
from app.auth import get_password_hash
from datetime import datetime
import uuid
from contextlib import contextmanager

class PostgresDatabase:
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required for PostgreSQL")
        
        print(f"[DATABASE] Using PostgreSQL backend")
        print(f"[DATABASE] Connection string: {self.database_url[:30]}...")
        
        self._init_db()
        self._initialize_admin()
    
    @contextmanager
    def get_connection(self):
        conn = psycopg.connect(self.database_url, row_factory=dict_row)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def _init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS clients (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    vehicle_info TEXT NOT NULL,
                    address TEXT NOT NULL,
                    city TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mechanics (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    specialties TEXT NOT NULL,
                    address TEXT NOT NULL,
                    is_mobile BOOLEAN NOT NULL DEFAULT TRUE,
                    speaks_english BOOLEAN NOT NULL DEFAULT FALSE,
                    rating REAL NOT NULL DEFAULT 0.0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS workshops (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    address TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    services TEXT NOT NULL,
                    rating REAL NOT NULL DEFAULT 0.0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS repairs (
                    id TEXT PRIMARY KEY,
                    client_id TEXT NOT NULL,
                    mechanic_id TEXT,
                    workshop_id TEXT,
                    vehicle_info TEXT NOT NULL,
                    issue_description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    service_type TEXT NOT NULL,
                    location TEXT NOT NULL,
                    scheduled_date TIMESTAMP,
                    completed_date TIMESTAMP,
                    cost REAL,
                    amount_charged REAL,
                    balance_pending REAL,
                    share_token TEXT,
                    created_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (client_id) REFERENCES clients(id),
                    FOREIGN KEY (mechanic_id) REFERENCES mechanics(id),
                    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS authorized_points (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    address TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    services TEXT NOT NULL,
                    contact_person TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parts (
                    id TEXT PRIMARY KEY,
                    repair_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    supplier_id TEXT,
                    ordered_online BOOLEAN NOT NULL,
                    status TEXT NOT NULL,
                    estimated_arrival TIMESTAMP,
                    cost REAL,
                    notes TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (repair_id) REFERENCES repairs(id),
                    FOREIGN KEY (supplier_id) REFERENCES authorized_points(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS express_services (
                    id TEXT PRIMARY KEY,
                    client_id TEXT NOT NULL,
                    mechanic_id TEXT,
                    vehicle_info TEXT NOT NULL,
                    emergency_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    status TEXT NOT NULL,
                    location TEXT NOT NULL,
                    contact_phone TEXT NOT NULL,
                    estimated_arrival TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    cost REAL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients(id),
                    FOREIGN KEY (mechanic_id) REFERENCES mechanics(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS repair_requests (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    vehicle_info TEXT NOT NULL,
                    description TEXT NOT NULL,
                    service_type TEXT NOT NULL,
                    location TEXT NOT NULL,
                    preferred_datetime TIMESTAMP,
                    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
                    status TEXT NOT NULL,
                    client_id TEXT,
                    ip TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON repair_requests(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_repair_requests_created_at ON repair_requests(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_repairs_share_token ON repairs(share_token)")
            
            cursor.execute("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS share_token TEXT")
            cursor.execute("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS amount_charged REAL")
            cursor.execute("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS balance_pending REAL")
            
            print("[DATABASE] PostgreSQL tables initialized successfully")
    
    def _initialize_admin(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users WHERE email = %s", ("admin@ayj.com",))
            result = cursor.fetchone()
            if result['count'] == 0:
                admin_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO users (id, email, password_hash, name, role, phone, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    admin_id,
                    "admin@ayj.com",
                    get_password_hash("admin123"),
                    "Administrador",
                    "admin",
                    "+1234567890",
                    datetime.utcnow()
                ))
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            row = cursor.fetchone()
            if row:
                return User(**row)
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            row = cursor.fetchone()
            if row:
                return User(**row)
            return None
    
    def create_user(self, user: User) -> User:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, name, role, phone, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (user.id, user.email, user.password_hash, user.name, user.role, user.phone, user.created_at))
            return user
    
    def get_all_users(self) -> List[User]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            return [User(**row) for row in cursor.fetchall()]
    
    def create_client(self, client: Client) -> Client:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO clients (id, user_id, vehicle_info, address, city, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (client.id, client.user_id, client.vehicle_info, client.address, client.city, client.created_at))
            return client
    
    def get_client(self, client_id: str) -> Optional[Client]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM clients WHERE id = %s", (client_id,))
            row = cursor.fetchone()
            if row:
                return Client(**row)
            return None
    
    def get_all_clients(self) -> List[Client]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM clients ORDER BY created_at ASC, id ASC")
            return [Client(**row) for row in cursor.fetchall()]
    
    def update_client(self, client_id: str, client: Client) -> Optional[Client]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE clients SET user_id = %s, vehicle_info = %s, address = %s, city = %s
                WHERE id = %s
            """, (client.user_id, client.vehicle_info, client.address, client.city, client_id))
            if cursor.rowcount > 0:
                return client
            return None
    
    def delete_client(self, client_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM clients WHERE id = %s", (client_id,))
            return cursor.rowcount > 0
    
    def create_mechanic(self, mechanic: Mechanic) -> Mechanic:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO mechanics (id, user_id, specialties, address, is_mobile, speaks_english, rating, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (mechanic.id, mechanic.user_id, json.dumps(mechanic.specialties), mechanic.address, 
                  mechanic.is_mobile, mechanic.speaks_english, mechanic.rating, mechanic.created_at))
            return mechanic
    
    def get_mechanic(self, mechanic_id: str) -> Optional[Mechanic]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mechanics WHERE id = %s", (mechanic_id,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['specialties'] = json.loads(data['specialties']) if isinstance(data['specialties'], str) else data['specialties']
                return Mechanic(**data)
            return None
    
    def get_all_mechanics(self) -> List[Mechanic]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mechanics ORDER BY created_at ASC, id ASC")
            result = []
            for row in cursor.fetchall():
                data = dict(row)
                data['specialties'] = json.loads(data['specialties']) if isinstance(data['specialties'], str) else data['specialties']
                result.append(Mechanic(**data))
            return result
    
    def update_mechanic(self, mechanic_id: str, mechanic: Mechanic) -> Optional[Mechanic]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE mechanics SET user_id = %s, specialties = %s, address = %s, is_mobile = %s, speaks_english = %s, rating = %s
                WHERE id = %s
            """, (mechanic.user_id, json.dumps(mechanic.specialties), mechanic.address, 
                  mechanic.is_mobile, mechanic.speaks_english, mechanic.rating, mechanic_id))
            if cursor.rowcount > 0:
                return mechanic
            return None
    
    def delete_mechanic(self, mechanic_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM mechanics WHERE id = %s", (mechanic_id,))
            return cursor.rowcount > 0
    
    def create_workshop(self, workshop: Workshop) -> Workshop:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO workshops (id, name, address, phone, services, rating, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (workshop.id, workshop.name, workshop.address, workshop.phone, 
                  json.dumps(workshop.services), workshop.rating, workshop.created_at))
            return workshop
    
    def get_workshop(self, workshop_id: str) -> Optional[Workshop]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workshops WHERE id = %s", (workshop_id,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['services'] = json.loads(data['services']) if isinstance(data['services'], str) else data['services']
                return Workshop(**data)
            return None
    
    def get_all_workshops(self) -> List[Workshop]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workshops ORDER BY created_at ASC, id ASC")
            result = []
            for row in cursor.fetchall():
                data = dict(row)
                data['services'] = json.loads(data['services']) if isinstance(data['services'], str) else data['services']
                result.append(Workshop(**data))
            return result
    
    def update_workshop(self, workshop_id: str, workshop: Workshop) -> Optional[Workshop]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE workshops SET name = %s, address = %s, phone = %s, services = %s, rating = %s
                WHERE id = %s
            """, (workshop.name, workshop.address, workshop.phone, json.dumps(workshop.services), workshop.rating, workshop_id))
            if cursor.rowcount > 0:
                return workshop
            return None
    
    def delete_workshop(self, workshop_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM workshops WHERE id = %s", (workshop_id,))
            return cursor.rowcount > 0
    
    def create_repair(self, repair: Repair) -> Repair:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO repairs (id, client_id, mechanic_id, workshop_id, vehicle_info, issue_description, 
                                   status, service_type, location, scheduled_date, completed_date, cost, 
                                   amount_charged, balance_pending, share_token, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (repair.id, repair.client_id, repair.mechanic_id, repair.workshop_id, repair.vehicle_info,
                  repair.issue_description, repair.status, repair.service_type, repair.location,
                  repair.scheduled_date, repair.completed_date, repair.cost, repair.amount_charged,
                  repair.balance_pending, repair.share_token, repair.created_at))
            return repair
    
    def get_repair(self, repair_id: str) -> Optional[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs WHERE id = %s", (repair_id,))
            row = cursor.fetchone()
            if row:
                return Repair(**row)
            return None
    
    def get_all_repairs(self) -> List[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs ORDER BY created_at DESC, id DESC")
            return [Repair(**row) for row in cursor.fetchall()]
    
    def get_repairs_by_client(self, client_id: str) -> List[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs WHERE client_id = %s", (client_id,))
            return [Repair(**row) for row in cursor.fetchall()]
    
    def get_repairs_by_mechanic(self, mechanic_id: str) -> List[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs WHERE mechanic_id = %s", (mechanic_id,))
            return [Repair(**row) for row in cursor.fetchall()]
    
    def update_repair(self, repair_id: str, repair: Repair) -> Optional[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE repairs SET mechanic_id = %s, workshop_id = %s, status = %s, 
                                 scheduled_date = %s, completed_date = %s, cost = %s,
                                 amount_charged = %s, balance_pending = %s, share_token = %s
                WHERE id = %s
            """, (repair.mechanic_id, repair.workshop_id, repair.status, repair.scheduled_date,
                  repair.completed_date, repair.cost, repair.amount_charged, repair.balance_pending,
                  repair.share_token, repair_id))
            if cursor.rowcount > 0:
                return repair
            return None
    
    def delete_repair(self, repair_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM repairs WHERE id = %s", (repair_id,))
            return cursor.rowcount > 0
    
    def create_authorized_point(self, point: AuthorizedPoint) -> AuthorizedPoint:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO authorized_points (id, name, address, phone, services, contact_person, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (point.id, point.name, point.address, point.phone, json.dumps(point.services), 
                  point.contact_person, point.created_at))
            return point
    
    def get_authorized_point(self, point_id: str) -> Optional[AuthorizedPoint]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM authorized_points WHERE id = %s", (point_id,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['services'] = json.loads(data['services']) if isinstance(data['services'], str) else data['services']
                return AuthorizedPoint(**data)
            return None
    
    def get_all_authorized_points(self) -> List[AuthorizedPoint]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM authorized_points ORDER BY created_at ASC, id ASC")
            result = []
            for row in cursor.fetchall():
                data = dict(row)
                data['services'] = json.loads(data['services']) if isinstance(data['services'], str) else data['services']
                result.append(AuthorizedPoint(**data))
            return result
    
    def update_authorized_point(self, point_id: str, point: AuthorizedPoint) -> Optional[AuthorizedPoint]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE authorized_points SET name = %s, address = %s, phone = %s, services = %s, contact_person = %s
                WHERE id = %s
            """, (point.name, point.address, point.phone, json.dumps(point.services), point.contact_person, point_id))
            if cursor.rowcount > 0:
                return point
            return None
    
    def delete_authorized_point(self, point_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM authorized_points WHERE id = %s", (point_id,))
            return cursor.rowcount > 0
    
    def create_part(self, part: Part) -> Part:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO parts (id, repair_id, name, supplier_id, ordered_online, status, 
                                 estimated_arrival, cost, notes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (part.id, part.repair_id, part.name, part.supplier_id, part.ordered_online,
                  part.status, part.estimated_arrival, part.cost, part.notes, part.created_at))
            return part
    
    def get_part(self, part_id: str) -> Optional[Part]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parts WHERE id = %s", (part_id,))
            row = cursor.fetchone()
            if row:
                return Part(**row)
            return None
    
    def get_parts_by_repair(self, repair_id: str) -> List[Part]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parts WHERE repair_id = %s", (repair_id,))
            return [Part(**row) for row in cursor.fetchall()]
    
    def update_part(self, part_id: str, part: Part) -> Optional[Part]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE parts SET name = %s, supplier_id = %s, ordered_online = %s, status = %s,
                               estimated_arrival = %s, cost = %s, notes = %s
                WHERE id = %s
            """, (part.name, part.supplier_id, part.ordered_online, part.status,
                  part.estimated_arrival, part.cost, part.notes, part_id))
            if cursor.rowcount > 0:
                return part
            return None
    
    def delete_part(self, part_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM parts WHERE id = %s", (part_id,))
            return cursor.rowcount > 0
    
    def create_express_service(self, service: ExpressService) -> ExpressService:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO express_services (id, client_id, mechanic_id, vehicle_info, emergency_type,
                                            description, priority, status, location, contact_phone,
                                            estimated_arrival, started_at, completed_at, cost, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (service.id, service.client_id, service.mechanic_id, service.vehicle_info, service.emergency_type,
                  service.description, service.priority, service.status, service.location, service.contact_phone,
                  service.estimated_arrival, service.started_at, service.completed_at, service.cost, service.created_at))
            return service
    
    def get_express_service(self, service_id: str) -> Optional[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM express_services WHERE id = %s", (service_id,))
            row = cursor.fetchone()
            if row:
                return ExpressService(**row)
            return None
    
    def get_all_express_services(self) -> List[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM express_services")
            return [ExpressService(**row) for row in cursor.fetchall()]
    
    def get_express_services_by_client(self, client_id: str) -> List[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM express_services WHERE client_id = %s", (client_id,))
            return [ExpressService(**row) for row in cursor.fetchall()]
    
    def get_express_services_by_mechanic(self, mechanic_id: str) -> List[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM express_services WHERE mechanic_id = %s", (mechanic_id,))
            return [ExpressService(**row) for row in cursor.fetchall()]
    
    def update_express_service(self, service_id: str, service: ExpressService) -> Optional[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE express_services SET mechanic_id = %s, status = %s, estimated_arrival = %s,
                                          started_at = %s, completed_at = %s, cost = %s
                WHERE id = %s
            """, (service.mechanic_id, service.status, service.estimated_arrival,
                  service.started_at, service.completed_at, service.cost, service_id))
            if cursor.rowcount > 0:
                return service
            return None
    
    def delete_express_service(self, service_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM express_services WHERE id = %s", (service_id,))
            return cursor.rowcount > 0
    
    def create_repair_request(self, request_data: dict) -> dict:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            request_id = request_data.get('id') or str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO repair_requests (id, name, email, phone, vehicle_info, description,
                                           service_type, location, preferred_datetime, is_emergency,
                                           status, client_id, ip, user_agent, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (request_id, request_data['name'], request_data['email'], request_data['phone'],
                  request_data['vehicle_info'], request_data['description'], request_data['service_type'],
                  request_data['location'], request_data.get('preferred_datetime'), 
                  request_data.get('is_emergency', False), request_data.get('status', 'new'), request_data.get('client_id'),
                  request_data.get('ip'), request_data.get('user_agent'), datetime.utcnow()))
            return cursor.fetchone()
    
    def get_repair_request(self, request_id: str) -> Optional[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repair_requests WHERE id = %s", (request_id,))
            row = cursor.fetchone()
            return row if row else None
    
    def get_repair_requests(self, status: Optional[str] = None) -> List[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if status:
                cursor.execute("SELECT * FROM repair_requests WHERE status = %s ORDER BY created_at DESC", (status,))
            else:
                cursor.execute("SELECT * FROM repair_requests ORDER BY created_at DESC")
            return cursor.fetchall()
    
    def update_repair_request_status(self, request_id: str, status: str, client_id: Optional[str] = None) -> Optional[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if client_id:
                cursor.execute("""
                    UPDATE repair_requests SET status = %s, client_id = %s WHERE id = %s
                    RETURNING *
                """, (status, client_id, request_id))
            else:
                cursor.execute("""
                    UPDATE repair_requests SET status = %s WHERE id = %s
                    RETURNING *
                """, (status, request_id))
            row = cursor.fetchone()
            return row if row else None
    
    def delete_repair_request(self, request_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM repair_requests WHERE id = %s", (request_id,))
            return cursor.rowcount > 0
    
    def get_client_by_email(self, email: str) -> Optional[Client]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT c.* FROM clients c
                JOIN users u ON c.user_id = u.id
                WHERE u.email = %s
            """, (email,))
            row = cursor.fetchone()
            if row:
                return Client(**row)
            return None
    
    def get_repair_by_share_token(self, share_token: str) -> Optional[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs WHERE share_token = %s", (share_token,))
            row = cursor.fetchone()
            if row:
                return Repair(**row)
            return None
    
    def set_repair_share_token(self, repair_id: str, share_token: str) -> bool:
        """Update only the share_token for a repair"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE repairs SET share_token = %s WHERE id = %s
            """, (share_token, repair_id))
            return cursor.rowcount > 0
