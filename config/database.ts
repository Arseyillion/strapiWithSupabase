import path from 'path';

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'postgres');

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10), acquireTimeoutMillis: 60000, createTimeoutMillis: 30000, destroyTimeoutMillis: 5000, idleTimeoutMillis: 30000 },
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL', 'postgresql://postgres.imasqptbfyyfqnaqixks:RkH2r8YLhsgdL80Y@aws-1-us-east-2.pooler.supabase.com:6543/postgres'),
        host: env('DATABASE_HOST', 'aws-1-us-east-2.pooler.supabase.com'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'postgres'),
        user: env('DATABASE_USERNAME', 'postgres.imasqptbfyyfqnaqixks'),
        password: env('DATABASE_PASSWORD', 'RkH2r8YLhsgdL80Y'),
        ssl: env.bool('DATABASE_SSL', true) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', false),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 0), max: env.int('DATABASE_POOL_MAX', 3), acquireTimeoutMillis: 60000, createTimeoutMillis: 30000, destroyTimeoutMillis: 5000, idleTimeoutMillis: 30000 },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
