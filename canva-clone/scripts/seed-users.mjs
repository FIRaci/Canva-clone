import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = [
  { name: "User A", email: "a@gmail.com", password: "123" },
  { name: "User B", email: "b@gmail.com", password: "456" },
];

for (const u of users) {
  const hashed = await bcrypt.hash(u.password, 12);
  await pool.query(`DELETE FROM "user" WHERE email = $1`, [u.email]);
  await pool.query(
    `INSERT INTO "user" (id, name, email, password, language) VALUES (gen_random_uuid(), $1, $2, $3, 'en')`,
    [u.name, u.email, hashed]
  );
  console.log(`✅ Created: ${u.email}`);
}

const res = await pool.query(`SELECT id, name, email FROM "user" WHERE email IN ('a@gmail.com', 'b@gmail.com')`);
console.log("Users in DB:", res.rows);
await pool.end();
