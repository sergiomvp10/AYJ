from typing import Dict, List, Optional
from app.models import User, Client, Mechanic, Workshop, Repair, AuthorizedPoint, Part
from app.auth import get_password_hash
from datetime import datetime
import uuid

class InMemoryDatabase:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.clients: Dict[str, Client] = {}
        self.mechanics: Dict[str, Mechanic] = {}
        self.workshops: Dict[str, Workshop] = {}
        self.repairs: Dict[str, Repair] = {}
        self.authorized_points: Dict[str, AuthorizedPoint] = {}
        self.parts: Dict[str, Part] = {}
        self._initialize_admin()
    
    def _initialize_admin(self):
        admin_id = str(uuid.uuid4())
        admin_user = User(
            id=admin_id,
            email="admin@ayj.com",
            password_hash=get_password_hash("admin123"),
            name="Administrador",
            role="admin",
            phone="+1234567890",
            created_at=datetime.utcnow()
        )
        self.users[admin_id] = admin_user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        for user in self.users.values():
            if user.email == email:
                return user
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)
    
    def create_user(self, user: User) -> User:
        self.users[user.id] = user
        return user
    
    def get_all_users(self) -> List[User]:
        return list(self.users.values())
    
    def create_client(self, client: Client) -> Client:
        self.clients[client.id] = client
        return client
    
    def get_client(self, client_id: str) -> Optional[Client]:
        return self.clients.get(client_id)
    
    def get_all_clients(self) -> List[Client]:
        return list(self.clients.values())
    
    def update_client(self, client_id: str, client: Client) -> Optional[Client]:
        if client_id in self.clients:
            self.clients[client_id] = client
            return client
        return None
    
    def delete_client(self, client_id: str) -> bool:
        if client_id in self.clients:
            del self.clients[client_id]
            return True
        return False
    
    def create_mechanic(self, mechanic: Mechanic) -> Mechanic:
        self.mechanics[mechanic.id] = mechanic
        return mechanic
    
    def get_mechanic(self, mechanic_id: str) -> Optional[Mechanic]:
        return self.mechanics.get(mechanic_id)
    
    def get_all_mechanics(self) -> List[Mechanic]:
        return list(self.mechanics.values())
    
    def update_mechanic(self, mechanic_id: str, mechanic: Mechanic) -> Optional[Mechanic]:
        if mechanic_id in self.mechanics:
            self.mechanics[mechanic_id] = mechanic
            return mechanic
        return None
    
    def delete_mechanic(self, mechanic_id: str) -> bool:
        if mechanic_id in self.mechanics:
            del self.mechanics[mechanic_id]
            return True
        return False
    
    def create_workshop(self, workshop: Workshop) -> Workshop:
        self.workshops[workshop.id] = workshop
        return workshop
    
    def get_workshop(self, workshop_id: str) -> Optional[Workshop]:
        return self.workshops.get(workshop_id)
    
    def get_all_workshops(self) -> List[Workshop]:
        return list(self.workshops.values())
    
    def update_workshop(self, workshop_id: str, workshop: Workshop) -> Optional[Workshop]:
        if workshop_id in self.workshops:
            self.workshops[workshop_id] = workshop
            return workshop
        return None
    
    def delete_workshop(self, workshop_id: str) -> bool:
        if workshop_id in self.workshops:
            del self.workshops[workshop_id]
            return True
        return False
    
    def create_repair(self, repair: Repair) -> Repair:
        self.repairs[repair.id] = repair
        return repair
    
    def get_repair(self, repair_id: str) -> Optional[Repair]:
        return self.repairs.get(repair_id)
    
    def get_all_repairs(self) -> List[Repair]:
        return list(self.repairs.values())
    
    def get_repairs_by_client(self, client_id: str) -> List[Repair]:
        return [r for r in self.repairs.values() if r.client_id == client_id]
    
    def get_repairs_by_mechanic(self, mechanic_id: str) -> List[Repair]:
        return [r for r in self.repairs.values() if r.mechanic_id == mechanic_id]
    
    def update_repair(self, repair_id: str, repair: Repair) -> Optional[Repair]:
        if repair_id in self.repairs:
            self.repairs[repair_id] = repair
            return repair
        return None
    
    def delete_repair(self, repair_id: str) -> bool:
        if repair_id in self.repairs:
            del self.repairs[repair_id]
            return True
        return False
    
    def create_authorized_point(self, point: AuthorizedPoint) -> AuthorizedPoint:
        self.authorized_points[point.id] = point
        return point
    
    def get_authorized_point(self, point_id: str) -> Optional[AuthorizedPoint]:
        return self.authorized_points.get(point_id)
    
    def get_all_authorized_points(self) -> List[AuthorizedPoint]:
        return list(self.authorized_points.values())
    
    def update_authorized_point(self, point_id: str, point: AuthorizedPoint) -> Optional[AuthorizedPoint]:
        if point_id in self.authorized_points:
            self.authorized_points[point_id] = point
            return point
        return None
    
    def delete_authorized_point(self, point_id: str) -> bool:
        if point_id in self.authorized_points:
            del self.authorized_points[point_id]
            return True
        return False
    
    def create_part(self, part: Part) -> Part:
        self.parts[part.id] = part
        return part
    
    def get_part(self, part_id: str) -> Optional[Part]:
        return self.parts.get(part_id)
    
    def get_parts_by_repair(self, repair_id: str) -> List[Part]:
        return [p for p in self.parts.values() if p.repair_id == repair_id]
    
    def update_part(self, part_id: str, part: Part) -> Optional[Part]:
        if part_id in self.parts:
            self.parts[part_id] = part
            return part
        return None
    
    def delete_part(self, part_id: str) -> bool:
        if part_id in self.parts:
            del self.parts[part_id]
            return True
        return False

db = InMemoryDatabase()
