# Quiz Bee MVP

Simple, real-time Quiz Bee game with an Admin/Game Master page and participant pages for teams.

## Requirements

- Node.js 18+ (or 20+ recommended)
- npm

## Setup

```bash
cd D:\Code\quiz-bee-mvp
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

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/quiz-bee-mvp)

### Manual Deployment

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add the following:
     - `ADMIN_PASSWORD`: Your secure admin password
     - `NODE_ENV`: production

5. **Production Deployment**:
   ```bash
   vercel --prod
   ```

### Important Notes for Vercel Deployment

⚠️ **Database Limitation**: Vercel's serverless functions use ephemeral storage. The SQLite database will reset on each deployment or function restart. For production use, consider:
- Using Vercel Postgres, PlanetScale, or another managed database
- Migrating to a cloud database solution
- Using Vercel KV for key-value storage

📝 **Environment Variables**: 
- Never commit `.env` files
- Set all environment variables in Vercel Dashboard
- Copy `.env.example` to create your local `.env` file

🔒 **Security**:
- Change the default `ADMIN_PASSWORD` immediately
- Use a strong, unique password for production
- Keep your admin credentials secure

## How to Use

1. Set your admin password at the top of the Admin page (must match `ADMIN_PASSWORD`).
2. Create questions and teams.
3. Each team gets a QR code or join URL (one device per team).
4. Select the current question and click **Open Question**.
5. Teams submit answers on their devices.
6. Click **Close Question** to auto-grade and score.
7. Use manual overrides to adjust points or reset submissions.

## Configuration

Environment variables (set in `.env` file for local or Vercel Dashboard for production):

- `PORT` - Server port (default: 3001)
- `ADMIN_PASSWORD` - Admin authentication password (required)
- `DB_PATH` - SQLite database path (default: ./quizbee.db)
- `NODE_ENV` - Environment (development/production)

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
- **Deployment**: Vercel

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
