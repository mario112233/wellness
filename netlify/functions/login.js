// netlify/functions/login.js

const { pool } = require('./db_config'); // Upewnij się, że db_config jest w tym samym katalogu

exports.handler = async (event) => {
    
    // 1. Walidacja metody
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    // 2. Parsowanie ciała żądania
    let data;
    try {
        // Netlify Functions przesyłają ciało jako string JSON
        data = JSON.parse(event.body); 
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Invalid JSON format." }) };
    }

    const identifier = data.identifier;
    const isAdmin = data.is_admin;
    
    if (!identifier) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Brak kodu apartamentu/loginu." }) };
    }

    const client = await pool.connect();

    try {
        let query;
        let values;

        if (isAdmin) {
            // Logowanie Admina: Wyszukaj po loginie, upewnij się, że to admin
            query = `SELECT id, apartment_name, identifier, is_admin FROM users WHERE identifier = $1 AND is_admin = TRUE;`;
            values = [identifier.toUpperCase()]; // Użycie UPPERCASE dla admina
        } else {
            // Logowanie Użytkownika: Wyszukaj po identifierze, upewnij się, że to nie admin
            query = `SELECT id, apartment_name, identifier, is_admin FROM users WHERE identifier = $1 AND is_admin = FALSE;`;
            values = [identifier];
        }

        const res = await client.query(query, values);

        if (res.rows.length === 1) {
            const user = res.rows[0];
            // Logowanie pomyślne
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: `Zalogowano jako ${user.apartment_name}.`, user: {
                    id: user.id,
                    apartment_name: user.apartment_name,
                    identifier: user.identifier,
                    is_admin: user.is_admin
                }}),
            };
        } else {
            // Brak użytkownika lub niepoprawna rola/kod
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Nieprawidłowy kod/login lub brak dostępu.' }),
            };
        }

    } catch (error) {
        console.error("Login Error:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "Wewnętrzny błąd serwera." }) };
    } finally {
        client.release();
    }
};