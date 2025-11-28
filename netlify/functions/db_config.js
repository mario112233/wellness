// netlify/functions/db_config.js

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // TEN BLOK SSL JEST KRYTYCZNY DLA SUPABASE W CHMURZE:
    ssl: {
        rejectUnauthorized: false // Ignoruje sprawdzenie certyfikatu
    }
});

module.exports = {
    pool,
};