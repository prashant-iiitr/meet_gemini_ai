import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL?.trim();

//  console.log(process.env.DATABASE_URL);

if (!connectionString) {
	throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
	connectionString,
	ssl: {
		rejectUnauthorized: false,
	},
});

export const db = drizzle(pool);
