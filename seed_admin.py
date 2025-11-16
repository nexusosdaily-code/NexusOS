#!/usr/bin/env python3
"""
Admin Bootstrap Script for NexusOS

Creates the initial admin user for the system.
Run this script to set up the first administrator account.

Usage:
    python seed_admin.py
"""

import sys
from sqlalchemy.orm import sessionmaker
from database import init_db, get_engine
from auth import bootstrap_admin, init_roles

def main():
    print("=" * 60)
    print("NexusOS Admin Bootstrap")
    print("=" * 60)
    print()
    
    try:
        engine = init_db()
        if not engine:
            print("❌ Error: Could not connect to database")
            print("Please check your DATABASE_URL environment variable")
            sys.exit(1)
        
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            init_roles(db)
            print("✅ Initialized roles: admin, researcher, viewer")
            print()
            
            print("Creating admin user...")
            email = input("Admin email: ").strip()
            
            if not email:
                print("❌ Email cannot be empty")
                sys.exit(1)
            
            password = input("Admin password (min 8 characters): ").strip()
            
            if len(password) < 8:
                print("❌ Password must be at least 8 characters")
                sys.exit(1)
            
            confirm_password = input("Confirm password: ").strip()
            
            if password != confirm_password:
                print("❌ Passwords do not match")
                sys.exit(1)
            
            print()
            print("Creating admin user...")
            
            success = bootstrap_admin(db, email, password)
            
            if success:
                print()
                print("✅ Admin user created successfully!")
                print()
                print(f"Email: {email}")
                print("Role: admin")
                print()
                print("You can now log in to NexusOS with these credentials.")
                print("To enable authentication, set AUTH_ENABLED=true in your environment.")
            else:
                print()
                print("⚠️  An admin user already exists in the system.")
                print("No new admin was created.")
        
        finally:
            db.close()
    
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
