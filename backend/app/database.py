"""
Database backend selector - chooses between SQLite and PostgreSQL based on environment
"""
import os
import sys

DATABASE_URL = os.getenv("DATABASE_URL")
FLY_APP_NAME = os.getenv("FLY_APP_NAME")

if FLY_APP_NAME and not DATABASE_URL:
    print("[DATABASE] ERROR: Running in production (Fly.io) without DATABASE_URL!")
    print("[DATABASE] ERROR: This would use ephemeral SQLite storage and cause data loss.")
    print("[DATABASE] ERROR: Please set DATABASE_URL with: flyctl secrets set DATABASE_URL='postgres://...' -a app-vfhfzlyo")
    sys.exit(1)

if DATABASE_URL:
    print("[DATABASE] DATABASE_URL detected - using PostgreSQL backend")
    from app.database_postgres import PostgresDatabase
    db = PostgresDatabase()
    db_engine = "postgresql"
else:
    print("[DATABASE] No DATABASE_URL - using SQLite backend (development only)")
    from app.database_sqlite import SQLiteDatabase
    db = SQLiteDatabase()
    db_engine = "sqlite"

print(f"[DATABASE] Backend initialized: {type(db).__name__}")
print(f"[DATABASE] Engine: {db_engine}")
print(f"[DATABASE] Production mode: {bool(FLY_APP_NAME)}")
