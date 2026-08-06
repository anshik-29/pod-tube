import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    // Prefer DATABASE_URL if set, otherwise use individual variables
    const connectionString = process.env.DATABASE_URL;
    
    let config: PoolConfig;

    if (connectionString) {
      // Use connection string
      config = {
        connectionString,
      };
    } else {
      // Build config from individual variables
      const dbHost = process.env.DB_HOST;
      const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
      const dbName = process.env.DB_NAME;
      const dbUser = process.env.DB_USER;
      const dbPassword = process.env.DB_PASSWORD;

      if (!dbHost || !dbName || !dbUser || !dbPassword) {
        throw new Error('Database configuration incomplete. Set DATABASE_URL or all DB_* variables.');
      }

      config = {
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
      };
    }

    // Configure SSL based on DB_SSL_MODE or default behavior
    const sslMode = process.env.DB_SSL_MODE?.toLowerCase();
    if (sslMode === 'require' || sslMode === 'prefer') {
      config.ssl = { rejectUnauthorized: false };
    } else if (sslMode === 'disable') {
      config.ssl = false;
    } else {
      // Default: SSL in production, no SSL in development
      config.ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
    }

    // Set pool size if specified
    if (process.env.DB_POOL_SIZE) {
      config.max = parseInt(process.env.DB_POOL_SIZE, 10);
    }

    pool = new Pool(config);
  }

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
