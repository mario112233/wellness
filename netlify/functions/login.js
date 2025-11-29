// netlify/functions/login.js

const { pool } = require('./db_config'); // Upewnij się, że db_config jest w tym samym katalogu

exports.handler = async (event) => {
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    let data;
    try {
        data = JSON.parse(event.body); 
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Invalid JSON format." }) };
    }

    const identifier = data.identifier;
    
    if (!identifier) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Brak kodu apartamentu/loginu." }) };
    }

    const client = await pool.connect();

    try {
        let query;
        let values;

        // OSTATECZNA WERSJA TESTOWA:
        // 1. Użycie cudzysłowów (") dla nazw tabeli/kolumn, aby uniknąć problemów z wielkością liter w Postgresie.
        // 2. USUNIĘCIE warunku is_admin, aby sprawdzić, czy jakikolwiek rekord pasuje.
        
        // Ponieważ nie znamy dokładnej wielkości liter loginu admina, 
        // użyjemy .toUpperCase() tylko dla bezpieczeństwa
        const finalIdentifier = data.is_admin ? identifier.toUpperCase() : identifier;

        query = `SELECT "id", "apartment_name", "identifier", "is_admin" FROM "users" WHERE "identifier" = $1;`;
        values = [finalIdentifier];
        
        const res = await client.query(query, values);

        if (res.rows.length === 1) {
            const user = res.rows[0];
            // Logowanie pomyślne - Jeśli ten kod zadziała, problemem był warunek is_admin
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
            // Błąd logowania, jeśli żaden rekord nie został znaleziony
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Nieprawidłowy kod/login lub brak dostępu.' }),
            };
        }

    } catch (error) {
        console.error("CRITICAL LOGIN ERROR:", error);
        // Jeśli błąd nadal występuje, Netlify nie może nawet wykonać zapytania SQL
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "Wewnętrzny błąd serwera. Sprawdź, czy klucz połączeniowy jest poprawny." }) };
    } finally {
        client.release();
    }
};