# SpotiHost

<div align="center">
A selfhosted analysics tool for Spotify
<img src="assets/dashboard_top.png" alt="Dashboard" width="90%" />
</div>

## Overview
SpotiHost is a selfhostable service that analysis all your spotify listens and provides insights into your listening habits.

## Features

- **Spotify API** Integration: Login with your Spotify account and SpotiHost automatically fetches all your future listens without you even noticing.  
- **Docker**: the entire application runs in a few commands on your server

## Screenshots
<div align="center">
  <img src="assets/dashboard.png" alt="Dashboard" width="80%" />
</div>
<br />
<div align="center">
  <img src="assets/track.png" alt="Track" width="80%" />
</div>
<br />
<div align="center">
  <img src="assets/album.png" alt="Album" width="80%" />
</div>

## Tech Stack
**Frontend:** React, TypeScript

**Backend:** Python, FastAPI, PostgreSQL

## Quick Start
### Prerequisites
- Docker and Docker Compose installed
- Spotify Developer Account

### Get Spotify Credentials
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in app name and description
4. In the app settings, add a Redirect URI:
   - For local use: `http://localhost:8000/callback`
   - For deployment on a server: `https://your-domain.com/callback`
5. Copy the **Client ID** and **Client Secret**

### Configure Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/spotihost.git
cd spotihost

# Create your config file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database Configuration
DB_USER=spotihost_user
DB_PASSWORD=your_secure_password_here
DB_NAME=spotihost_db

# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Application Settings
PORT=8000
SPOTIFY_REDIRECT_URI=http://localhost:8000/callback
```

### Start the Application

```bash
# Build and start (first time or after updates)
docker compose up -d --build

# Subsequent starts
docker compose up -d

# Stop the application
docker compose down
```

### Access SpotiHost

Open your browser and go to: **http://localhost:8000** or configure your own domain.

### Updating

```bash
git pull
docker compose down
docker compose up -d --build
```
For bigger updates, you may want to reinstall the app. You can easily import your data again.

## Troubleshooting

### Database Connection Errors

```bash
# Check if database is healthy
docker compose ps

# Restart the app container
docker compose restart app
```
### Reset Everything (Fresh Start)

```bash
# Warning: This deletes all your data!
docker compose down -v
docker compose up -d --build
```

### View Container Status

```bash
docker compose ps
```
Look for spotihost-app and spotihost-db.

## Contributing
I appreciate any contributions you this project! Whether you’re reporting a bug, suggesting a new feature, or submitting a pull request. Your input helps shape the project and makes it better for everyone.
Don’t hesitate to open an issue or share your ideas.



