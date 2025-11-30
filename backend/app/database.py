"""
Database backend selector - chooses between SQLite and PostgreSQL based on environment
"""
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    print("[DATABASE] DATABASE_URL detected - using PostgreSQL backend")
    from app.database_postgres import PostgresDatabase
    db = PostgresDatabase()
else:
    print("[DATABASE] No DATABASE_URL - using SQLite backend")
    from app.database_sqlite import SQLiteDatabase
    db = SQLiteDatabase()

print(f"[DATABASE] Backend initialized: {type(db).__name__}")
