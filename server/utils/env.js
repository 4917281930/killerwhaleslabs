const REQUIRED_IN_PRODUCTION = ['SESSION_SECRET', 'CLIENT_ORIGIN'];
const INSECURE_DEFAULTS = {
  SESSION_SECRET: 'dev-session-secret-change-me',
  ADMIN_PASSWORD: 'change-this-password'
};

export function validateEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars in production: ${missing.join(', ')}`);
  }

  for (const [key, bad] of Object.entries(INSECURE_DEFAULTS)) {
    if (process.env[key] === bad) {
      throw new Error(`Insecure default value detected for ${key} - set a strong value in .env`);
    }
  }
}
