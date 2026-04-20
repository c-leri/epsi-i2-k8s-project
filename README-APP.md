# Application de con 🤙

A single-screen dark mode webapp that fetches random tech jokes from a PostgreSQL database, assigns a random current user to the page session, and lets that user rate jokes from 1 to 5.

## Features
- Random tech joke display
- Random current user selected on page load
- Average rating displayed for each fetched joke
- Current user's rating displayed for the current joke
- Rating submission from 1 to 5
- Rating update if the same user rates the same joke again
- Recent rating history panel showing the latest 4 actions

## Stack
- **Frontend**: Nginx serving a static HTML/CSS/JS page
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 15
- **Container runtime**: Docker Compose

## Requirements
- Docker Desktop for Windows
- Port `8080` must be free
- Port `3001` must be free

## Run

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:8080`
- Backend health endpoint: `http://localhost:3001/health`

## Stop

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

## Architecture

```text
Browser → http://localhost:8080  → frontend (nginx)
Browser → http://localhost:3001  → backend (node/express)
                                      ↓
                                   db (postgres)
```

The frontend calls the backend directly from the browser at `http://localhost:3001`.

## Data model

### `jokes`
Stores the available tech jokes.

- `id`
- `joke`

### `users`
Stores the seeded demo users.

- `id`
- `username`

### `ratings`
Stores one rating per `(user, joke)` pair.

- `id`
- `user_id`
- `joke_id`
- `rating`
- `created_at`
- `updated_at`

### Rating rule
A user can only have one rating per joke.  
If the same user rates the same joke again, the previous rating is updated instead of inserting a second row.

## Main API endpoints

### `GET /health`
Health check endpoint.

### `GET /user/random`
Returns one random user from the `users` table.

### `GET /joke?userId=<id>`
Returns:
- one random joke
- average rating for that joke
- number of ratings for that joke
- current user's existing rating for that joke, if any

### `POST /ratings`
Creates or updates a rating.

Example JSON body:

```json
{
  "userId": 1,
  "jokeId": 3,
  "rating": 5
}
```

### `GET /ratings/recent`
Returns the latest 4 rating actions ordered by most recent update.

## PowerShell test examples

### Create or update a rating
```powershell
$body = @{
  userId = 1
  jokeId = 1
  rating = 4
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/ratings" `
  -ContentType "application/json" `
  -Body $body
```

### Get recent rating history
```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3001/ratings/recent"
```

## Manual test checklist
- Start the stack with `docker compose up --build`
- Open `http://localhost:8080`
- Confirm a random current user is displayed
- Click **Press Me**
- Confirm a random joke is displayed
- Confirm the average rating block is shown
- Confirm the current user's rating block is shown
- Select a rating from 1 to 5 and submit it
- Confirm the success message appears
- Submit another rating for the same joke
- Confirm the UI says this is an update
- Confirm the recent history panel refreshes
- Click **Press Me** again
- Confirm a different random joke can be loaded without frontend errors

## Seeded demo users
The app seeds the following users on first startup:
- `hugo`
- `alice`
- `bob`
- `charlie`
- `diana`
- `eve`

## Notes
- The app is intentionally simple and local-first.
- The backend seeds tables automatically on startup if they are empty.
- Because jokes are random, fetching again may return a different joke immediately after rating submission.