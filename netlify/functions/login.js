const { pool } = require('./db_config');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const data = JSON.body ? JSON.parse(event.body) : {};
        const identifier = data.code;
        const password = data.password;

        const client = await pool.connect();
        const res = await client.query(
            "SELECT id, role, apartment_name, password FROM users WHERE identifier = $1", 
            [identifier]
        );
        client.release();

        const user = res.rows[0];

        if (!user) {
            return { statusCode: 401, body: JSON.stringify({ success: false, message: "Błędny kod/login" }) };
        }

        if (user.role === 'admin') {
            // Weryfikacja hasła dla Admina
            if (!password || user.password !== password) {
                return { statusCode: 401, body: JSON.stringify({ success: false, message: "Błędne hasło administratora" }) };
            }
        } else {
            // Weryfikacja dla zwykłego użytkownika (bez hasła)
            if (password) {
                return { statusCode: 401, body: JSON.stringify({ success: false, message: "Apartamenty nie używają hasła" }) };
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                user_id: user.id, 
                role: user.role, 
                name: user.apartment_name 
            })
        };

    } catch (error) {
        console.error("Login error:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "Wewnętrzny błąd serwera." }) };
    }
};