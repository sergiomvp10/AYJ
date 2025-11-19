# API Endpoints Plan - Auto Repair Platform

## Authentication Endpoints
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user info

## User Roles
- admin: Full access to all features
- cliente: Can request repairs, view their repairs
- mecanico: Can view assigned repairs, update repair status

## Client Management (Admin only)
- GET /api/clients - List all clients
- GET /api/clients/{id} - Get client details
- POST /api/clients - Create new client
- PUT /api/clients/{id} - Update client
- DELETE /api/clients/{id} - Delete client

## Mechanic Management (Admin only)
- GET /api/mechanics - List all mechanics
- GET /api/mechanics/{id} - Get mechanic details
- POST /api/mechanics - Create new mechanic
- PUT /api/mechanics/{id} - Update mechanic
- DELETE /api/mechanics/{id} - Delete mechanic

## Workshop Management (Admin only)
- GET /api/workshops - List all workshops
- GET /api/workshops/{id} - Get workshop details
- POST /api/workshops - Create new workshop
- PUT /api/workshops/{id} - Update workshop
- DELETE /api/workshops/{id} - Delete workshop

## Repair Management
- GET /api/repairs - List repairs (filtered by role)
- GET /api/repairs/{id} - Get repair details
- POST /api/repairs - Create new repair request
- PUT /api/repairs/{id} - Update repair
- PATCH /api/repairs/{id}/status - Update repair status
- DELETE /api/repairs/{id} - Delete repair (admin only)

## Authorized Points Management (Admin only)
- GET /api/authorized-points - List all authorized points
- GET /api/authorized-points/{id} - Get authorized point details
- POST /api/authorized-points - Create new authorized point
- PUT /api/authorized-points/{id} - Update authorized point
- DELETE /api/authorized-points/{id} - Delete authorized point

## Data Models

### User
- id, email, password_hash, name, role, phone, created_at

### Client
- id, user_id, address, vehicle_info, created_at

### Mechanic
- id, user_id, specialties, is_mobile, rating, created_at

### Workshop
- id, name, address, phone, services, rating, created_at

### Repair
- id, client_id, mechanic_id, workshop_id, vehicle_info, issue_description, status, service_type, location, scheduled_date, completed_date, cost, created_at

### AuthorizedPoint
- id, name, address, phone, services, contact_person, created_at
