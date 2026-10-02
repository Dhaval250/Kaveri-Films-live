import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

const poolOptions = {
  waitForConnections: true,
  connectionLimit: 25,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // Faster round-trips
  namedPlaceholders: true,
  dateStrings: true,
  multipleStatements: false,
  // Avoid slow DNS / reconnects
  connectTimeout: 10000,
} as const;

function createPool() {
  if (process.env.DB_HOST || process.env.DB_NAME) {
    return mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME || "kaveri_production",
      ...poolOptions,
    });
  }

  const url = process.env.DATABASE_URL || "";
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);

  if (match) {
    const [, user, password, host, port, database] = match;
    return mysql.createPool({
      host,
      port: Number(port),
      user,
      password: password || undefined,
      database,
      ...poolOptions,
    });
  }

  return mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "kaveri_production",
    ...poolOptions,
  });
}

export const pool = globalForDb.pool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export type Row = mysql.RowDataPacket;
export type Result = mysql.ResultSetHeader;

/** Run multiple queries in parallel */
export async function queryAll<T = any>(
  queries: Array<{ sql: string; params?: any[] }>
): Promise<T[][]> {
  const results = await Promise.all(
    queries.map(async ({ sql, params }) => {
      const [rows] = await pool.query<Row[]>(sql, params || []);
      return rows as unknown as T[];
    })
  );
  return results;
}
