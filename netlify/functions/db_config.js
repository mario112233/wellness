// netlify/functions/db_config.js

const { Pool } = require('pg');

const pool = new Pool({
    // Używamy zmiennej środowiskowej ustawionej w Netlify
    connectionString: process.env.DATABASE_URL,
    
    // Kluczowa konfiguracja SSL dla połączeń z chmury (Netlify)
    // To jest niezbędne dla Supabase
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = {
    pool,
};