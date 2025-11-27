const { pool } = require('./db_config');
const { createArrayCsvStringifier } = require('csv-writer');
const { WritableStreamBuffer } = require('stream-buffers');

exports.handler = async (event) => {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT 
                apartment_name AS "APARTAMENT", 
                slot_date AS "DATA_REZERWACJI", 
                slot_time AS "GODZINA_START", 
                status AS "STATUS",
                created_at AS "CZAS_UTWORZENIA"
            FROM reservations
            ORDER BY created_at DESC;
        `);
        client.release();

        const data = res.rows;

        // Nagłówki i mapowanie do CSV
        const headers = [
            'APARTAMENT', 'DATA_REZERWACJI', 'GODZINA_START', 'STATUS', 'CZAS_UTWORZENIA'
        ];
        
        const csvStringifier = createArrayCsvStringifier({
            header: headers,
            fieldDelimiter: ';', // Użycie średnika dla lepszej kompatybilności z Excelem
        });
        
        const outputBuffer = new WritableStreamBuffer();
        
        outputBuffer.write(csvStringifier.getHeaderString());
        
        // Konwersja obiektów na tablice w kolejności nagłówków
        const records = data.map(row => headers.map(header => row[header]));
        
        outputBuffer.write(csvStringifier.stringifyRecords(records));

        // Zwracanie pliku CSV
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="pelny_raport.csv"',
            },
            body: outputBuffer.get
            BodyAsString('utf-8'),
        };

    } catch (error) {
        console.error("Full Report Error:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "Wewnętrzny błąd generowania raportu." }) };
    }
};