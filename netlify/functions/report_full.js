// netlify/functions/report_full.js

const { pool } = require('./db_config');

// Funkcja pomocnicza do konwersji wyników SQL na format CSV
const convertToCSV = (arr) => {
    if (!arr || arr.length === 0) {
        return '';
    }

    const header = Object.keys(arr[0]);
    
    // Konwersja nagłówków: usuwamy podkreślenia, zaczynamy od dużej litery
    const csvHeader = header.map(key => key.replace(/_/g, ' ')
                                            .toUpperCase()
                                            .trim());
    
    const csvRows = arr.map(row => {
        return header.map(fieldName => {
            const cell = row[fieldName];
            // Jeśli pole zawiera przecinek, otocz je cudzysłowami
            if (cell && typeof cell === 'string' && cell.includes(',')) {
                return `"${cell.replace(/"/g, '""')}"`; // Ucieczka cudzysłowów
            }
            return cell;
        }).join(';'); // Separator dla polskiego CSV
    });

    // Połącz nagłówki i wiersze
    return [
        csvHeader.join(';'),
        ...csvRows
    ].join('\n');
};

exports.handler = async (event) => {
    // Sprawdzenie, czy żądanie pochodzi od administratora
    // To jest podstawowa kontrola, pełna walidacja powinna być w osobnym middleware
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }
    
    // UWAGA: W praktyce powinieneś tutaj zweryfikować Token/Sesję Admina, 
    // aby zapobiec dostępowi do raportu przez nieautoryzowane osoby.

    const client = await pool.connect();
    
    try {
        // Zapytanie SQL pobierające wszystkie rezerwacje
        const query = `
            SELECT
                r.id AS rezerwacja_id,
                u.apartment_name AS apartament,
                u.identifier AS kod_apartamentu,
                r.slot_date AS data_rezerwacji,
                r.slot_time AS czas_rezerwacji,
                r.status AS status_rezerwacji,
                TO_CHAR(r.created_at, 'YYYY-MM-DD HH24:MI:SS') AS utworzono_dnia
            FROM
                reservations r
            JOIN
                users u ON r.user_id = u.id
            ORDER BY 
                r.slot_date DESC, r.slot_time DESC;
        `;
        
        const result = await client.query(query);
        
        if (result.rows.length === 0) {
             return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Nie znaleziono żadnych rezerwacji.' }),
            };
        }

        // Konwersja danych do CSV
        const csvContent = convertToCSV(result.rows);
        
        // POPRAWNA STRUKTURA ODPOWIEDZI HTTP DLA POBIERANIA PLIKU CSV
        return {
            statusCode: 200,
            headers: {
                // Ustawienie Content-Type na CSV
                'Content-Type': 'text/csv',
                // Ustawienie Content-Disposition wymusza pobranie pliku
                'Content-Disposition': 'attachment; filename="pelny_raport_wellness.csv"',
            },
            // Zwracana treść to ciąg znaków CSV
            body: csvContent, 
        };

    } catch (error) {
        console.error('Database Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error podczas generowania raportu.' }),
        };
    } finally {
        client.release();
    }
};