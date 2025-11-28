// netlify/functions/login.js

const { pool } = require('./db_config');

exports.handler = async (event) => {
    // Akceptujemy tylko metodę POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    // Sprawdzenie, czy body jest dostępne
    if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Missing request body.' }) };
    }

    let data;
    try {
        // Parsowanie danych JSON
        data = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid JSON format.' }) };
    }

    const { identifier, is_admin } = data;
    let client; // Deklaracja klienta poza blokiem try

    // Weryfikacja danych wejściowych
    if (!identifier) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Identifier is required.' }) };
    }

    try {
        // Uzyskanie klienta z puli połączeń
        client = await pool.connect(); 

        let query;
        let queryParams = [identifier];
        
        // Zapytanie SQL
        if (is_admin) {
            // Logowanie Admina
            query = `SELECT id, apartment_name, identifier, is_admin FROM users WHERE identifier = $1 AND is_admin = TRUE;`;
        } else {
            // Logowanie Użytkownika
            query = `SELECT id, apartment_name, identifier, is_admin FROM users WHERE identifier = $1 AND is_admin = FALSE;`;
        }
        
        const result = await client.query(query, queryParams);

        if (result.rows.length === 1) {
            const user = result.rows[0];
            
            // Logowanie pomyślne
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: true, 
                    user: {
                        id: user.id,
                        apartment_name: user.apartment_name,
                        identifier: user.identifier,
                        is_admin: user.is_admin
                    }
                })
            };
        } else {
            // Użytkownik nie znaleziony lub nie jest adminem
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Nieprawidłowy kod lub brak uprawnień.' })
            };
        }

    } catch (error) {
        // Logowanie błędu do konsoli Netlify
        console.error('Database/Function Error:', error); 
        
        // Zwracamy status 500 z komunikatem, aby ułatwić debugowanie
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                success: false, 
                // Zwracamy treść błędu, by zobaczyć, czy to błąd hasła/sieci
                message: error.message || 'Wystąpił wewnętrzny błąd serwera.' 
            }),
        };
    } finally {
        // KRTYCZNE: Zwalnia klienta z powrotem do puli po zakończeniu.
        // Zapobiega błędom 502/500 spowodowanym brakiem dostępnych połączeń.
        if (client) {
            client.release();
        }
    }
};