from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
import os
import hashlib
import secrets

app = FastAPI()

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "gordotech2026")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

DB_PATH = os.environ.get("DB_PATH", "/data/app.db")

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS spots (
            number INTEGER PRIMARY KEY,
            buyer_name TEXT NOT NULL,
            buyer_phone TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

class SpotReservation(BaseModel):
    number: int
    buyer_name: str
    buyer_phone: str

class SpotUpdate(BaseModel):
    buyer_name: str
    buyer_phone: str

class AdminLogin(BaseModel):
    password: str

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/spots")
async def get_spots():
    conn = get_db()
    rows = conn.execute("SELECT number, buyer_name, buyer_phone FROM spots ORDER BY number").fetchall()
    conn.close()
    taken = {row["number"]: {"buyer_name": row["buyer_name"], "buyer_phone": row["buyer_phone"]} for row in rows}
    spots = []
    for i in range(1, 101):
        if i in taken:
            spots.append({"number": i, "buyer_name": taken[i]["buyer_name"], "buyer_phone": taken[i]["buyer_phone"], "taken": True})
        else:
            spots.append({"number": i, "buyer_name": "", "buyer_phone": "", "taken": False})
    return {"spots": spots}

@app.post("/api/spots")
async def reserve_spot(reservation: SpotReservation):
    if reservation.number < 1 or reservation.number > 100:
        raise HTTPException(status_code=400, detail="El número debe estar entre 1 y 100")
    if not reservation.buyer_name.strip():
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    if not reservation.buyer_phone.strip():
        raise HTTPException(status_code=400, detail="El teléfono es obligatorio")
    conn = get_db()
    existing = conn.execute("SELECT number FROM spots WHERE number = ?", (reservation.number,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail=f"El puesto #{reservation.number} ya está tomado")
    conn.execute(
        "INSERT INTO spots (number, buyer_name, buyer_phone) VALUES (?, ?, ?)",
        (reservation.number, reservation.buyer_name.strip(), reservation.buyer_phone.strip())
    )
    conn.commit()
    conn.close()
    return {"message": f"Puesto #{reservation.number} reservado exitosamente", "number": reservation.number}

@app.delete("/api/spots/{number}")
async def release_spot(number: int):
    if number < 1 or number > 100:
        raise HTTPException(status_code=400, detail="El número debe estar entre 1 y 100")
    conn = get_db()
    existing = conn.execute("SELECT number FROM spots WHERE number = ?", (number,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail=f"El puesto #{number} no está reservado")
    conn.execute("DELETE FROM spots WHERE number = ?", (number,))
    conn.commit()
    conn.close()
    return {"message": f"Puesto #{number} liberado exitosamente"}

@app.post("/api/admin/login")
async def admin_login(login: AdminLogin):
    if login.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    return {"authenticated": True, "message": "Acceso concedido"}

@app.put("/api/admin/spots/{number}")
async def update_spot(number: int, update: SpotUpdate, x_admin_password: str = Header(alias="X-Admin-Password")):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="No autorizado")
    if number < 1 or number > 100:
        raise HTTPException(status_code=400, detail="El número debe estar entre 1 y 100")
    if not update.buyer_name.strip():
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    if not update.buyer_phone.strip():
        raise HTTPException(status_code=400, detail="El teléfono es obligatorio")
    conn = get_db()
    existing = conn.execute("SELECT number FROM spots WHERE number = ?", (number,)).fetchone()
    if existing:
        conn.execute(
            "UPDATE spots SET buyer_name = ?, buyer_phone = ? WHERE number = ?",
            (update.buyer_name.strip(), update.buyer_phone.strip(), number)
        )
    else:
        conn.execute(
            "INSERT INTO spots (number, buyer_name, buyer_phone) VALUES (?, ?, ?)",
            (number, update.buyer_name.strip(), update.buyer_phone.strip())
        )
    conn.commit()
    conn.close()
    return {"message": f"Puesto #{number} actualizado exitosamente"}

@app.delete("/api/admin/spots/{number}")
async def admin_release_spot(number: int, x_admin_password: str = Header(alias="X-Admin-Password")):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="No autorizado")
    if number < 1 or number > 100:
        raise HTTPException(status_code=400, detail="El número debe estar entre 1 y 100")
    conn = get_db()
    existing = conn.execute("SELECT number FROM spots WHERE number = ?", (number,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail=f"El puesto #{number} no está reservado")
    conn.execute("DELETE FROM spots WHERE number = ?", (number,))
    conn.commit()
    conn.close()
    return {"message": f"Puesto #{number} liberado exitosamente"}
