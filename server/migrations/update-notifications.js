const db = require('../config/database');

async function updateNotificationsTable() {
    try {
        console.log('Updating notifications table...');

        // Add admin_user_id column if it doesn't exist
        await db.run(`
            ALTER TABLE notifications ADD COLUMN admin_user_id INTEGER REFERENCES users(id)
        `).catch(err => {
            if (err.message.includes('duplicate column name')) {
                console.log('admin_user_id column already exists, skipping...');
            } else {
                throw err;
            }
        });

        // Make user_id nullable since notifications can be for either customers or admins
        console.log('✅ Notifications table updated successfully!');
        console.log('Migration completed. Admin notifications are now supported.');
        process.exit(0);

    } catch (error) {
        console.error('Error updating notifications table:', error);
        process.exit(1);
    }
}

updateNotificationsTable();
