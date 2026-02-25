<div align="center">

[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)](https://www.python.org/)
[![MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/nilsgenge/spotihost?style=for-the-badge&logo=github&label=Stars)](https://github.com/nilsgenge/spotihost/stargazers)

</div>

# SpotiHost
> A selfhosted analysics tool for Spotify

<p align="center">
  <img src="assets/dashboard_top.png" alt="Dashboard">
</p>

## Overview
SpotiHost is a self-hostable Spotify analytics tool designed to give you complete ownership of your listening data. 
Unlike standard applications that limit you to a single year of statistics, SpotiHost allows you to import your entire Spotify history, transforming it into a deep, searchable archive of your musical life.
Explore your habits through detailed time-series visualizations, track your top artists and albums over time, and uncover hidden patterns with advanced metrics like skip rates and track completion rates.
<br>
Built with a modern stack of React, TypeScript, and FastAPI, SpotiHost runs automatically in the background, ensuring your dashboard is always up-to-date with your latest listens.
<br>
SpotiHost is lightweight enough to run unobtrusively in the background on your local machine or on modest home server hardware.
<br>
Getting started is seamless—simply log in with your Spotify account to get started instantly, and deploy the application effortlessly using Docker. A detailed guide can be found below.


## Features

- Docker Deployment: Run the full application stack effortlessly with just a few commands.
- Spotify Integration: Log in securely with your Spotify account to get started immediately.
- Automatic Syncing: Runs in the background to fetch and update your latest listens automatically.
- Full History Import: Import your entire Spotify library to analyze lifetime statistics, not just recent data.
- Detailed Metrics: Analyze skip rates and track completion percentages for songs, albums, and artists.
- Interactive Charts: Visualize trends with line charts tracking minutes and plays over any time range.
- Dynamic Rankings: View your top artists, albums, and tracks filtered by specific date ranges.
- Listening History: Access a complete, searchable log of every song you have ever played.

## Screenshots
<p align="center">
  <img src="assets/dashboard.png" alt="Dashboard"></img><br>
  <em>Dashboard</em>
</p>
<br>

<p align="center">
  <img src="assets/track.png" alt="Track"></img><br>
  <em>Track Pages</em>
</p>
<br>

<p align="center">
  <img src="assets/album.png" alt="Album"></img><br>
  <em>Album Pages</em>
</p>

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



