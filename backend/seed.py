import os
import sys

# Ensure we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import User
import bcrypt

def seed_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    test_users = [
        {"email": "admin@cbfx.com", "name": "Super Admin", "role": "super_admin", "password": "password123"},
        {"email": "editor@cbfx.com", "name": "Main Editor", "role": "editor", "password": "password123"},
        {"email": "broker@cbfx.com", "name": "Main Broker", "role": "broker", "password": "password123"}
    ]
    
    for tu in test_users:
        if not db.query(User).filter(User.email == tu["email"]).first():
            hashed = bcrypt.hashpw(tu["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            new_user = User(email=tu["email"], name=tu["name"], role=tu["role"], hashed_password=hashed)
            db.add(new_user)
            print(f"Created {tu['role']} user: {tu['email']}")
        else:
            print(f"User {tu['email']} already exists")
    
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_users()
