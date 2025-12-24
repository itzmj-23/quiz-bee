# Quiz Bee MVP

Simple, real-time Quiz Bee game with an Admin/Game Master page and participant pages for teams.

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
```

## Local Development

```bash
# PowerShell
$env:ADMIN_PASSWORD="your_admin_password"
npm run dev
```

Open the admin UI:

```
http://localhost:3001/admin
```

## Deploy to Railway

### Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **Git Repository** - Your code should be in a Git repository (GitHub, GitLab, etc.)

### Deployment Steps

#### 1. Create New Project

1. Log in to Railway
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your quiz-bee repository
5. Railway will automatically detect it's a Node.js project

#### 2. Configure Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add the following environment variables:

```env
ADMIN_PASSWORD=your_secure_admin_password
NODE_ENV=production
```

**Note**: Railway automatically provides the `PORT` environment variable, so you don't need to set it.

#### 3. Deploy

Railway will automatically deploy your application. The deployment process:

1. Detects Node.js from `package.json`
2. Runs `npm install`
3. Starts the app using the `start` script from `package.json`
4. Provides a public URL (e.g., `your-app.up.railway.app`)

#### 4. Database Persistence

Railway provides persistent storage:

1. Go to your service settings
2. Add a **Volume** if you want persistent database storage
3. Mount path: `/app` (or specify `DB_PATH=/app/quizbee.db` in environment variables)

Alternatively, Railway ephemeral storage will work but data will be lost on redeploy. For production, use a volume or migrate to a proper database.

#### 5. Custom Domain (Optional)

1. Go to **Settings** tab
2. Click **Generate Domain** for a Railway subdomain
3. Or add your custom domain under **Custom Domains**

### Continuous Deployment

Railway automatically redeploys when you push to your main branch:

```bash
git add .
git commit -m "Update quiz app"
git push origin main
```

Railway will detect the changes and redeploy automatically.

### Monitoring

In Railway dashboard:

- **Deployments** - View deployment history and logs
- **Metrics** - Monitor CPU, memory, and network usage
- **Logs** - Real-time application logs

View logs in real-time:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# View logs
railway logs
```

### Railway CLI Deployment

Alternative deployment method using Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize and link project
railway init

# Deploy
railway up
```

### Configuration

Environment variables for Railway:

- `ADMIN_PASSWORD` - Admin authentication password (required)
- `NODE_ENV` - Automatically set to production
- `PORT` - Automatically provided by Railway
- `DB_PATH` - Optional, for custom database location

### Database Backup on Railway

Since Railway can use ephemeral storage by default:

1. **Option 1**: Add a volume for persistent storage
2. **Option 2**: Set up automated backups using Railway's scheduled tasks
3. **Option 3**: Migrate to PostgreSQL (Railway provides free PostgreSQL)

For SQLite with volume:
```bash
# Add DB_PATH environment variable
DB_PATH=/data/quizbee.db

# Mount volume to /data in Railway settings
```

## How to Use

1. Set your admin password at the top of the Admin page (must match `ADMIN_PASSWORD`).
2. Create questions and teams.
3. Each team gets a QR code or join URL (one device per team).
4. Select the current question and click **Open Question**.
5. Teams submit answers on their devices.
6. Click **Close Question** to auto-grade and score.
7. Use manual overrides to adjust points or reset submissions.

## Configuration

Environment variables:

- `PORT` - Server port (default: 3001, Railway auto-provides this)
- `ADMIN_PASSWORD` - Admin authentication password (required)
- `DB_PATH` - SQLite database path (default: ./quizbee.db)
- `NODE_ENV` - Environment (development/production)

## Database Backup

Since SQLite is file-based, backup your database regularly:

```bash
# Backup database
cp quizbee.db quizbee.db.backup

# Or with timestamp
cp quizbee.db quizbee-$(date +%Y%m%d-%H%M%S).db
```

Consider setting up a cron job for automated backups.

## Notes

- Admin password is required for all admin APIs.
- Participants bind to a team per device using a cookie.
- Database auto-creates in `quizbee.db`.
- Audio files are not included. Add MP3 files to `public/audio` using these filenames:
  - `mario.mp3` (background music)
  - `submitted.mp3`
  - `open.mp3`
  - `close.mp3`

## Tech Stack

- **Backend**: Node.js, Express
- **Real-time**: Socket.IO
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla JavaScript
- **Deployment**: Railway

## Troubleshooting

### Port Already in Use (Local Development)

```bash
# PowerShell - Find process using port 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object -Property OwningProcess
# Kill the process
Stop-Process -Id <PID> -Force
```

### Railway Deployment Issues

- Check the **Deployments** tab for build logs
- Verify environment variables in **Variables** tab
- Check **Logs** for runtime errors

### Database Issues on Railway

If data is lost after redeploy:
- Add a volume for persistent storage
- Or migrate to Railway's PostgreSQL service

## License

MIT

  - `reveal.mp3`
  - `setcurrent.mp3`

## File Tree

```
quiz-bee-mvp/
  package.json
  server.js
  quizbee.db (auto-created)
  public/
    admin.html
    admin.js
    participant.html
    participant.js
    styles.css
```
