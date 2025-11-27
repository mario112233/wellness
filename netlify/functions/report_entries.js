const { pool } = require('./db_config');
const moment = require('moment-timezone');

exports.handler = async (event) => {
    try {
        const client = await pool.connect();

        // 1. Pobierz dane o rezerwacjach, które są 'Zarezerwowane'
        // W realnym świecie, to by wymagało kolumny 'finished_at', 
        // ale na potrzeby tego zadania: liczymy aktywne rezerwacje w przeszłości.
        const res = await client.query(`
            SELECT 
                apartment_name, 
                EXTRACT(YEAR FROM slot_date) AS year,
                EXTRACT(MONTH FROM slot_date) AS month,
                slot_date
            FROM reservations
            WHERE status = 'Zarezerwowana' 
            AND slot_date < CURRENT_DATE 
            ORDER BY slot_date ASC;
        `);
        client.release();

        const data = res.rows;
        const apart_counts = {}; // {'YYYY-MM': {'APARTAMENT 1': 5, ...}}

        // 2. Agregacja danych
        data.forEach(row => {
            const yearMonth = `${row.year}-${String(row.month).padStart(2, '0')}`;
            const apartment = row.apartment_name;

            if (!apart_counts[yearMonth]) {
                apart_counts[yearMonth] = {};
            }
            apart_counts[yearMonth][apartment] = (apart_counts[yearMonth][apartment] || 0) + 1;
        });

        // 3. Generowanie finalnej struktury tabeli
        const apartments = Array.from(new Set(data.map(r => r.apartment_name))).sort();
        const months_list = Object.keys(apart_counts).sort();

        const table_data = months_list.map(ym => {
            const [year, monthNum] = ym.split('-');
            const monthName = moment().month(parseInt(monthNum) - 1).format('MMMM').toUpperCase();
            
            const row = {
                'ROK_MIESIĄC': `${year} - ${monthName}`,
                'MIESIĄC': monthName
            };
            
            apartments.forEach(apt => {
                row[apt] = apart_counts[ym][apt] || 0;
            });
            return row;
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, table_data: table_data, apartments: apartments }),
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (error) {
        console.error("Report Entries Error:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "Wewnętrzny błąd generowania raportu." }) };
    }
};