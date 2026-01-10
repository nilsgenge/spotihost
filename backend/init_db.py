import sys
from alembic import command
from alembic.config import Config

def init_db():
    print("Running database migrations...")

    alembic_cfg = Config("/app/alembic.ini")
    alembic_cfg.set_main_option("script_location", "/app/alembic")

    try:
        command.upgrade(alembic_cfg, "head")
        print("Database schema is up to date.")
    except Exception as e:
        print(f"Database migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    init_db()
