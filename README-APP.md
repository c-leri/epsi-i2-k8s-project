# Application de con 🤙

A single-screen dark mode webapp that fetches random tech jokes from a PostgreSQL database.

## Stack
- **Frontend**: Nginx serving a static HTML/CSS/JS page
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 16

## Requirements
- Docker Desktop (Windows, latest)
- Ports 8080 and 3000 must be free

## Run

```bash
docker-compose up --build
```

Then open your browser at: **http://localhost:8080**

## Stop

```bash
docker-compose down
```

To also remove the database volume:
```bash
docker-compose down -v
```

## Architecture

```
Browser → http://localhost:8080  →  frontend (nginx)
Browser → http://localhost:3000  →  backend (node)
                                        ↓
                                    db (postgres)
```

The frontend calls the backend directly from the browser at `http://localhost:3000`.
