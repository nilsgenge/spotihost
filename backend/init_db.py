import sys
import os
from alembic import command
from alembic.config import Config

def init_db():
    print("Running database migrations...")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "spotihost_db")

    print(f"Attempting to connect to database at {db_host}:{db_port}, database: {db_name}")

    alembic_cfg = Config("/app/alembic.ini") # type: ignore
    alembic_cfg.set_main_option("script_location", "/app/alembic")

    try:
        command.upgrade(alembic_cfg, "head")
        print("Database schema is up to date.")
    except Exception as e:
        print(f"Database migration failed: {e}")
        print(f"ERROR: Could not connect to the database. Please ensure:")
        print(f"  - DB_HOST={db_host} is correct")
        print(f"  - DB_PORT={db_port} matches the database container's port")
        print(f"  - DB_NAME={db_name} exists")
        print(f"  - The database container is running and healthy")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    init_db()
