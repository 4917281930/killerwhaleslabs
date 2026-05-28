// Requires Node.js 18+ for PM2 cluster mode with this ESM project.
module.exports = {
  apps: [
    {
      name: 'killerwhaleslabs-api',
      script: 'server/server.js',
      exec_mode: 'cluster',
      instances: 'max',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 10000
    }
  ]
};
