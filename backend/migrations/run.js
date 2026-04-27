/**
 * migrations/run.js
 * Usage: npm run migrate
 * Reads schema.sql and runs it against MySQL.
 */
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('\n🔄  Running RecycleCred migrations...\n');

  let conn;
  try {
    conn = await mysql.createConnection({
      host:               process.env.DB_HOST     || 'localhost',
      port:               parseInt(process.env.DB_PORT) || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    console.log('✅  MySQL connected\n');
  } catch (err) {
    console.error('❌  Cannot connect to MySQL:', err.message);
    console.error('    → Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in your .env\n');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  try {
    console.log('▶   Applying schema.sql...');
    await conn.query(sql);
    console.log('✅  schema.sql applied\n');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    await conn.end();
    process.exit(1);
  }

  await conn.end();
  console.log('✅  All migrations complete!');
  console.log('    Database : recyclecred');
  console.log('    Tables   : users, profiles, devices, wallets, transactions, stations');
  console.log('    Seed data: 5 Nairobi recycling stations\n');
}

run().catch(err => { console.error(err); process.exit(1); });