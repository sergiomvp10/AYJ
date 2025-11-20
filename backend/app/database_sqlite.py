import sqlite3
import json
import os
from typing import Dict, List, Optional
from app.models import User, Client, Mechanic, Workshop, Repair, AuthorizedPoint, Part, ExpressService
from app.auth import get_password_hash
from datetime import datetime
import uuid
from contextlib import contextmanager

if os.path.isdir("/data"):
    DB_PATH = os.getenv("DB_PATH", "/data/ayj.db")
else:
    DB_PATH = os.getenv("DB_PATH", "./data/ayj.db")

print(f"[DATABASE] Using database path: {DB_PATH}")

class SQLiteDatabase:
    def __init__(self):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        self.db_path = DB_PATH
        self._init_db()
        self._initialize_admin()
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.row_factory = sqlite3.Row
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
                    created_at TEXT NOT NULL
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS clients (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    vehicle_info TEXT NOT NULL,
                    address TEXT NOT NULL,
                    city TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mechanics (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    specialties TEXT NOT NULL,
                    address TEXT NOT NULL,
                    is_mobile INTEGER NOT NULL DEFAULT 1,
                    speaks_english INTEGER NOT NULL DEFAULT 0,
                    rating REAL NOT NULL DEFAULT 0.0,
                    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
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
                    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
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
                    scheduled_date TEXT,
                    completed_date TEXT,
                    cost REAL,
                    amount_charged REAL,
                    balance_pending REAL,
                    created_at TEXT NOT NULL,
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
                    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parts (
                    id TEXT PRIMARY KEY,
                    repair_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    supplier_id TEXT,
                    ordered_online INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    estimated_arrival TEXT,
                    cost REAL,
                    notes TEXT,
                    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
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
                    estimated_arrival TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    cost REAL,
                    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                    FOREIGN KEY (client_id) REFERENCES clients(id),
                    FOREIGN KEY (mechanic_id) REFERENCES mechanics(id)
                )
            """)
            
            self._run_migrations(cursor)
    
    def _run_migrations(self, cursor):
        """Add missing columns to existing tables"""
        print(f"[MIGRATION] Running migrations at startup; DB_PATH={DB_PATH}")
        
        def get_columns(table_name):
            cursor.execute(f"PRAGMA table_info({table_name})")
            return {row[1] for row in cursor.fetchall()}
        
        cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
        for row in cursor.fetchall():
            print(f"[MIGRATION] Table {row[0]}: {row[1][:100]}...")
        
        clients_cols = get_columns('clients')
        print(f"[MIGRATION] Clients columns: {clients_cols}")
        if 'created_at' not in clients_cols:
            print("[MIGRATION] Adding created_at to clients table")
            cursor.execute("ALTER TABLE clients ADD COLUMN created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)")
            cursor.execute("UPDATE clients SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR created_at = ''")
            cursor.execute("SELECT COUNT(*) FROM clients")
            print(f"[MIGRATION] Updated {cursor.fetchone()[0]} client records")
        
        mechanics_cols = get_columns('mechanics')
        print(f"[MIGRATION] Mechanics columns: {mechanics_cols}")
        if 'created_at' not in mechanics_cols:
            print("[MIGRATION] Adding created_at to mechanics table")
            cursor.execute("ALTER TABLE mechanics ADD COLUMN created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)")
            cursor.execute("UPDATE mechanics SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR created_at = ''")
        if 'rating' not in mechanics_cols:
            print("[MIGRATION] Adding rating to mechanics table")
            cursor.execute("ALTER TABLE mechanics ADD COLUMN rating REAL NOT NULL DEFAULT 0.0")
        if 'is_mobile' not in mechanics_cols:
            print("[MIGRATION] Adding is_mobile to mechanics table")
            cursor.execute("ALTER TABLE mechanics ADD COLUMN is_mobile INTEGER NOT NULL DEFAULT 1")
        if 'specialties' not in mechanics_cols and 'specialization' in mechanics_cols:
            try:
                print("[MIGRATION] Renaming specialization to specialties in mechanics table")
                cursor.execute("ALTER TABLE mechanics RENAME COLUMN specialization TO specialties")
            except Exception as e:
                print(f"[MIGRATION] RENAME COLUMN failed: {e}, using fallback")
                cursor.execute("ALTER TABLE mechanics ADD COLUMN specialties TEXT NOT NULL DEFAULT '[]'")
                cursor.execute("UPDATE mechanics SET specialties = COALESCE(specialization, '[]')")
        
        workshops_cols = get_columns('workshops')
        print(f"[MIGRATION] Workshops columns: {workshops_cols}")
        if 'created_at' not in workshops_cols:
            print("[MIGRATION] Adding created_at to workshops table")
            cursor.execute("ALTER TABLE workshops ADD COLUMN created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)")
            cursor.execute("UPDATE workshops SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR created_at = ''")
        if 'rating' not in workshops_cols:
            print("[MIGRATION] Adding rating to workshops table")
            cursor.execute("ALTER TABLE workshops ADD COLUMN rating REAL NOT NULL DEFAULT 0.0")
        
        auth_points_cols = get_columns('authorized_points')
        print(f"[MIGRATION] Authorized points columns: {auth_points_cols}")
        if 'created_at' not in auth_points_cols:
            print("[MIGRATION] Adding created_at to authorized_points table")
            cursor.execute("ALTER TABLE authorized_points ADD COLUMN created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)")
            cursor.execute("UPDATE authorized_points SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR created_at = ''")
        
        parts_cols = get_columns('parts')
        print(f"[MIGRATION] Parts columns: {parts_cols}")
        if 'created_at' not in parts_cols:
            print("[MIGRATION] Adding created_at to parts table")
            cursor.execute("ALTER TABLE parts ADD COLUMN created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)")
            cursor.execute("UPDATE parts SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR created_at = ''")
        
        print("[MIGRATION] Migrations completed successfully")
    
    def _initialize_admin(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", ("admin@ayj.com",))
            if cursor.fetchone()[0] == 0:
                admin_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO users (id, email, password_hash, name, role, phone, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    admin_id,
                    "admin@ayj.com",
                    get_password_hash("admin123"),
                    "Administrador",
                    "admin",
                    "+1234567890",
                    datetime.utcnow().isoformat()
                ))
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row:
                return User(**dict(row))
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return User(**dict(row))
            return None
    
    def create_user(self, user: User) -> User:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, name, role, phone, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user.id, user.email, user.password_hash, user.name, user.role, user.phone, user.created_at.isoformat()))
            return user
    
    def get_all_users(self) -> List[User]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            return [User(**dict(row)) for row in cursor.fetchall()]
    
    def create_client(self, client: Client) -> Client:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO clients (id, user_id, vehicle_info, address, city, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (client.id, client.user_id, client.vehicle_info, client.address, client.city, client.created_at.isoformat()))
            return client
    
    def get_client(self, client_id: str) -> Optional[Client]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM clients WHERE id = ?", (client_id,))
            row = cursor.fetchone()
            if row:
                return Client(**dict(row))
            return None
    
    def get_all_clients(self) -> List[Client]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT * FROM clients")
                return [Client(**dict(row)) for row in cursor.fetchall()]
            except Exception as e:
                if "no such column: created_at" in str(e).lower():
                    print("[DEFENSIVE] created_at column missing, running migration")
                    cursor.execute("ALTER TABLE clients ADD COLUMN created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)")
                    cursor.execute("UPDATE clients SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL OR created_at = ''")
                    conn.commit()
                    cursor.execute("SELECT * FROM clients")
                    return [Client(**dict(row)) for row in cursor.fetchall()]
                raise
    
    def update_client(self, client_id: str, client: Client) -> Optional[Client]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE clients SET user_id = ?, vehicle_info = ?, address = ?, city = ?
                WHERE id = ?
            """, (client.user_id, client.vehicle_info, client.address, client.city, client_id))
            if cursor.rowcount > 0:
                return client
            return None
    
    def delete_client(self, client_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
            return cursor.rowcount > 0
    
    def create_mechanic(self, mechanic: Mechanic) -> Mechanic:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO mechanics (id, user_id, specialties, address, is_mobile, speaks_english, rating, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (mechanic.id, mechanic.user_id, json.dumps(mechanic.specialties), mechanic.address, 
                  int(mechanic.is_mobile), int(mechanic.speaks_english), mechanic.rating, mechanic.created_at.isoformat()))
            return mechanic
    
    def get_mechanic(self, mechanic_id: str) -> Optional[Mechanic]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mechanics WHERE id = ?", (mechanic_id,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['specialties'] = json.loads(data['specialties']) if isinstance(data['specialties'], str) else data['specialties']
                data['is_mobile'] = bool(data['is_mobile'])
                data['speaks_english'] = bool(data['speaks_english'])
                return Mechanic(**data)
            return None
    
    def get_all_mechanics(self) -> List[Mechanic]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mechanics")
            result = []
            for row in cursor.fetchall():
                data = dict(row)
                data['specialties'] = json.loads(data['specialties']) if isinstance(data['specialties'], str) else data['specialties']
                data['is_mobile'] = bool(data['is_mobile'])
                data['speaks_english'] = bool(data['speaks_english'])
                result.append(Mechanic(**data))
            return result
    
    def update_mechanic(self, mechanic_id: str, mechanic: Mechanic) -> Optional[Mechanic]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE mechanics SET user_id = ?, specialties = ?, address = ?, is_mobile = ?, speaks_english = ?, rating = ?
                WHERE id = ?
            """, (mechanic.user_id, json.dumps(mechanic.specialties), mechanic.address, 
                  int(mechanic.is_mobile), int(mechanic.speaks_english), mechanic.rating, mechanic_id))
            if cursor.rowcount > 0:
                return mechanic
            return None
    
    def delete_mechanic(self, mechanic_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM mechanics WHERE id = ?", (mechanic_id,))
            return cursor.rowcount > 0
    
    def create_workshop(self, workshop: Workshop) -> Workshop:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO workshops (id, name, address, phone, services, rating, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (workshop.id, workshop.name, workshop.address, workshop.phone, 
                  json.dumps(workshop.services), workshop.rating, workshop.created_at.isoformat()))
            return workshop
    
    def get_workshop(self, workshop_id: str) -> Optional[Workshop]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workshops WHERE id = ?", (workshop_id,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['services'] = json.loads(data['services']) if isinstance(data['services'], str) else data['services']
                return Workshop(**data)
            return None
    
    def get_all_workshops(self) -> List[Workshop]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workshops")
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
                UPDATE workshops SET name = ?, address = ?, phone = ?, services = ?, rating = ?
                WHERE id = ?
            """, (workshop.name, workshop.address, workshop.phone, json.dumps(workshop.services), workshop.rating, workshop_id))
            if cursor.rowcount > 0:
                return workshop
            return None
    
    def delete_workshop(self, workshop_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM workshops WHERE id = ?", (workshop_id,))
            return cursor.rowcount > 0
    
    def create_repair(self, repair: Repair) -> Repair:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO repairs (id, client_id, mechanic_id, workshop_id, vehicle_info, issue_description,
                                   status, service_type, location, scheduled_date, completed_date, cost,
                                   amount_charged, balance_pending, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                repair.id, repair.client_id, repair.mechanic_id, repair.workshop_id, repair.vehicle_info,
                repair.issue_description, repair.status, repair.service_type, repair.location,
                repair.scheduled_date.isoformat() if repair.scheduled_date else None,
                repair.completed_date.isoformat() if repair.completed_date else None,
                repair.cost, repair.amount_charged, repair.balance_pending, repair.created_at.isoformat()
            ))
            return repair
    
    def get_repair(self, repair_id: str) -> Optional[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs WHERE id = ?", (repair_id,))
            row = cursor.fetchone()
            if row:
                return Repair(**dict(row))
            return None
    
    def get_all_repairs(self) -> List[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs")
            return [Repair(**dict(row)) for row in cursor.fetchall()]
    
    def get_repairs_by_client(self, client_id: str) -> List[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs WHERE client_id = ?", (client_id,))
            return [Repair(**dict(row)) for row in cursor.fetchall()]
    
    def get_repairs_by_mechanic(self, mechanic_id: str) -> List[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repairs WHERE mechanic_id = ?", (mechanic_id,))
            return [Repair(**dict(row)) for row in cursor.fetchall()]
    
    def update_repair(self, repair_id: str, repair: Repair) -> Optional[Repair]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE repairs SET client_id = ?, mechanic_id = ?, workshop_id = ?, vehicle_info = ?,
                                 issue_description = ?, status = ?, service_type = ?, location = ?,
                                 scheduled_date = ?, completed_date = ?, cost = ?, amount_charged = ?,
                                 balance_pending = ?, created_at = ?
                WHERE id = ?
            """, (
                repair.client_id, repair.mechanic_id, repair.workshop_id, repair.vehicle_info,
                repair.issue_description, repair.status, repair.service_type, repair.location,
                repair.scheduled_date.isoformat() if repair.scheduled_date else None,
                repair.completed_date.isoformat() if repair.completed_date else None,
                repair.cost, repair.amount_charged, repair.balance_pending, repair.created_at.isoformat(),
                repair_id
            ))
            if cursor.rowcount > 0:
                return repair
            return None
    
    def delete_repair(self, repair_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM repairs WHERE id = ?", (repair_id,))
            return cursor.rowcount > 0
    
    def create_authorized_point(self, point: AuthorizedPoint) -> AuthorizedPoint:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO authorized_points (id, name, address, phone, services, contact_person, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (point.id, point.name, point.address, point.phone, 
                  json.dumps(point.services), point.contact_person, point.created_at.isoformat()))
            return point
    
    def get_authorized_point(self, point_id: str) -> Optional[AuthorizedPoint]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM authorized_points WHERE id = ?", (point_id,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['services'] = json.loads(data['services']) if isinstance(data['services'], str) else data['services']
                return AuthorizedPoint(**data)
            return None
    
    def get_all_authorized_points(self) -> List[AuthorizedPoint]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM authorized_points")
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
                UPDATE authorized_points SET name = ?, address = ?, phone = ?, services = ?, contact_person = ?
                WHERE id = ?
            """, (point.name, point.address, point.phone, json.dumps(point.services), point.contact_person, point_id))
            if cursor.rowcount > 0:
                return point
            return None
    
    def delete_authorized_point(self, point_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM authorized_points WHERE id = ?", (point_id,))
            return cursor.rowcount > 0
    
    def create_part(self, part: Part) -> Part:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO parts (id, repair_id, name, supplier_id, ordered_online, status,
                                 estimated_arrival, cost, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                part.id, part.repair_id, part.name, part.supplier_id, int(part.ordered_online),
                part.status, part.estimated_arrival.isoformat() if part.estimated_arrival else None,
                part.cost, part.notes, part.created_at.isoformat()
            ))
            return part
    
    def get_part(self, part_id: str) -> Optional[Part]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parts WHERE id = ?", (part_id,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['ordered_online'] = bool(data['ordered_online'])
                return Part(**data)
            return None
    
    def get_parts_by_repair(self, repair_id: str) -> List[Part]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parts WHERE repair_id = ?", (repair_id,))
            result = []
            for row in cursor.fetchall():
                data = dict(row)
                data['ordered_online'] = bool(data['ordered_online'])
                result.append(Part(**data))
            return result
    
    def update_part(self, part_id: str, part: Part) -> Optional[Part]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE parts SET repair_id = ?, name = ?, supplier_id = ?, ordered_online = ?,
                               status = ?, estimated_arrival = ?, cost = ?, notes = ?
                WHERE id = ?
            """, (
                part.repair_id, part.name, part.supplier_id, int(part.ordered_online),
                part.status, part.estimated_arrival.isoformat() if part.estimated_arrival else None,
                part.cost, part.notes, part_id
            ))
            if cursor.rowcount > 0:
                return part
            return None
    
    def delete_part(self, part_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM parts WHERE id = ?", (part_id,))
            return cursor.rowcount > 0
    
    def create_express_service(self, service: ExpressService) -> ExpressService:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO express_services (id, client_id, mechanic_id, vehicle_info, emergency_type,
                                            description, priority, status, location, contact_phone,
                                            estimated_arrival, started_at, completed_at, cost, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                service.id, service.client_id, service.mechanic_id, service.vehicle_info,
                service.emergency_type, service.description, service.priority, service.status,
                service.location, service.contact_phone,
                service.estimated_arrival.isoformat() if service.estimated_arrival else None,
                service.started_at.isoformat() if service.started_at else None,
                service.completed_at.isoformat() if service.completed_at else None,
                service.cost, service.created_at.isoformat()
            ))
            return service
    
    def get_express_service(self, service_id: str) -> Optional[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM express_services WHERE id = ?", (service_id,))
            row = cursor.fetchone()
            if row:
                return ExpressService(**dict(row))
            return None
    
    def get_all_express_services(self) -> List[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM express_services ORDER BY created_at DESC")
            return [ExpressService(**dict(row)) for row in cursor.fetchall()]
    
    def get_express_services_by_client(self, client_id: str) -> List[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM express_services WHERE client_id = ? ORDER BY created_at DESC", (client_id,))
            return [ExpressService(**dict(row)) for row in cursor.fetchall()]
    
    def get_express_services_by_mechanic(self, mechanic_id: str) -> List[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM express_services WHERE mechanic_id = ? ORDER BY created_at DESC", (mechanic_id,))
            return [ExpressService(**dict(row)) for row in cursor.fetchall()]
    
    def update_express_service(self, service_id: str, service: ExpressService) -> Optional[ExpressService]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE express_services SET mechanic_id = ?, status = ?, estimated_arrival = ?,
                                          started_at = ?, completed_at = ?, cost = ?
                WHERE id = ?
            """, (
                service.mechanic_id,
                service.status,
                service.estimated_arrival.isoformat() if service.estimated_arrival else None,
                service.started_at.isoformat() if service.started_at else None,
                service.completed_at.isoformat() if service.completed_at else None,
                service.cost,
                service_id
            ))
            if cursor.rowcount > 0:
                return service
            return None
    
    def delete_express_service(self, service_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM express_services WHERE id = ?", (service_id,))
            return cursor.rowcount > 0

db = SQLiteDatabase()
