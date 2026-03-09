// ecosystem.config.js
// PM2 Production Configuration - No Docker
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    // ── Fastify API Server (Cluster Mode) ──
    {
      name: 'api',
      cwd: './backend',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        API_PORT: 7500,
      },
      env_development: {
        NODE_ENV: 'development',
        API_PORT: 7500,
      },
      // Logging
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      kill_timeout: 30000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      // Health check
      health_check_interval: 30000,
      health_check_grace_period: 10000,
    },

    // ── BullMQ Download Worker (Fork Mode) ──
    {
      name: 'worker',
      cwd: './backend',
      script: 'dist/workers/download-worker.js',
      instances: 2,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: 5,
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 60000,
    },

    // ── Cron Job Runner (Fork Mode) ──
    {
      name: 'cron',
      cwd: './backend',
      script: 'dist/workers/cron-runner.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/cron-error.log',
      out_file: './logs/cron-out.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 30000,
    },

    // ── Next.js Frontend (Fork Mode) ──
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 7600',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 7600,
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 15000,
    },
  ],
};
