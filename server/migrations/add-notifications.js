const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'restaurant.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
};

async function addNotificationsTable() {
    try {
        console.log('Adding notifications table...');

        await runQuery(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                restaurant_id INTEGER,
                booking_id INTEGER,
                order_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES login_users (id),
                FOREIGN KEY (restaurant_id) REFERENCES restaurants (id),
                FOREIGN KEY (booking_id) REFERENCES bookings (id),
                FOREIGN KEY (order_id) REFERENCES orders (id)
            )
        `);

        console.log('✅ Notifications table added successfully!');
        console.log('Migration completed. You can now use the notification features.');

    } catch (error) {
        console.error('Error adding notifications table:', error);
        process.exit(1);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
            process.exit(0);
        });
    }
}

addNotificationsTable();
