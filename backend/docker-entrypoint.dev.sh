#!/bin/sh
set -e

echo "Initializing database schema..."
python init_db.py

echo "Starting Backend (Development Mode with Hot Reload)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload