import sys
import os

sys.path.insert(0, '/app')

from app.database import Base, engine
from app.models import Artist, Album, Track, Listen, SpotifyToken

def init_db():
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    init_db()