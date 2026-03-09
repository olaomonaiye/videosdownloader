# Enterprise SEO-Driven Multi-Platform Video Downloader

A production-ready, enterprise-grade video downloading platform powered by **yt-dlp**, built with **Fastify**, **Next.js**, **PostgreSQL**, **Redis**, and **BullMQ**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | Fastify (TypeScript) on port 7500 |
| **Frontend** | Next.js 14 App Router (TypeScript) on port 7600 |
| **Database** | PostgreSQL with Prisma ORM |
| **Cache / Queue** | Redis + BullMQ |
| **Video Engine** | yt-dlp (auto-updating) |
| **Process Manager** | PM2 (cluster mode) |
| **Reverse Proxy** | Nginx |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- yt-dlp installed globally (`pip install yt-dlp`)
- PM2 installed globally (`npm install -g pm2`)

### Setup
```bash
# Clone and enter project
cd video-downloader-platform

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or manual setup:
npm install
cp .env.example .env          # Edit with your values
cp .env.local.example frontend/.env.local
cd backend && npx prisma generate && npx prisma migrate dev --name init && cd ..
npm run db:seed
```

### Development
```bash
npm run dev    # Starts both API (7500) and Frontend (7600)
```

### Production
```bash
npm run build
npm start      # Uses PM2 (ecosystem.config.js)
```

## Key Features

- **Dynamic Branding**: All brand references configurable via Admin Settings + .env
- **1000+ Platform Support**: Auto-syncs with yt-dlp extractors
- **Full CMS**: Blog, categories, tags, static pages with rich text editor
- **SEO Architecture**: Dynamic service pages, structured data, sitemaps
- **Admin Dashboard**: Analytics, charts, platform management
- **Dark/Light Mode**: Persistent theme with enterprise clean UI
- **Enterprise Security**: Rate limiting, CSRF, XSS, SSRF protection
- **Queue Processing**: BullMQ workers with priority queues

## Project Structure

```
├── backend/               # Fastify API
│   ├── src/
│   │   ├── config/        # Environment, database, Redis
│   │   ├── common/        # Shared utilities, schemas, errors
│   │   ├── plugins/       # Fastify plugins (auth, cors, etc)
│   │   ├── modules/       # Feature modules (auth, blog, downloads, etc)
│   │   └── workers/       # BullMQ workers, cron jobs
│   └── prisma/            # Schema, migrations, seed
├── frontend/              # Next.js App
│   └── src/
│       ├── app/           # Pages (public + admin)
│       ├── components/    # UI components
│       ├── hooks/         # Custom hooks
│       ├── lib/           # API client, utils, types
│       └── providers/     # React context providers
├── config/                # Nginx config
├── scripts/               # Setup scripts
├── ecosystem.config.js    # PM2 config
└── .env.example           # Environment template
```

## Admin Panel

Access at `/admin/login`. Default credentials from `.env`:
- Email: `admin@example.com`
- Password: `ChangeThisPassword123!`

## License

Proprietary. All rights reserved.
