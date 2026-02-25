#!/bin/sh
set -e

echo "Initializing database schema..."
python init_db.py

echo "Starting SpotiHost..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000