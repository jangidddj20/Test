const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(__dirname, 'database', 'restaurant.db');

// Remove existing database to ensure clean setup
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Removed existing database for clean setup');
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Hash password function
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

// Promisify database operations
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

const prepareStatement = (sql) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(sql, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(stmt);
            }
        });
    });
};

// Database setup function
async function setupDatabase() {
    try {
        console.log('Setting up database tables...');

        // Enable foreign keys
        await runQuery('PRAGMA foreign_keys = ON');

        // Create signup_users table (temporary storage for signup process)
        await runQuery(`
            CREATE TABLE IF NOT EXISTS signup_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                password_hash TEXT NOT NULL,
                otp TEXT,
                otp_expires DATETIME,
                is_verified BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create login_users table (verified users who can login)
        await runQuery(`
            CREATE TABLE IF NOT EXISTS login_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'customer',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create restaurants table first (referenced by other tables)
        await runQuery(`
            CREATE TABLE IF NOT EXISTS restaurants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cuisine TEXT NOT NULL,
                rating REAL DEFAULT 4.5,
                image TEXT,
                address TEXT,
                phone TEXT,
                description TEXT,
                admin_id TEXT UNIQUE NOT NULL,
                admin_password_hash TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table (includes admins and superadmins)
        await runQuery(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'customer',
                restaurant_id INTEGER,
                admin_id TEXT UNIQUE,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
            )
        `);

        // Create restaurant_tables table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS restaurant_tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                restaurant_id INTEGER NOT NULL,
                table_number INTEGER NOT NULL,
                capacity INTEGER NOT NULL,
                status TEXT DEFAULT 'available',
                type TEXT DEFAULT 'standard',
                features TEXT,
                image TEXT,
                x_position INTEGER DEFAULT 0,
                y_position INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
            )
        `);

        // Create menu_items table WITH cuisine column
        await runQuery(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                restaurant_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                cuisine TEXT NOT NULL,
                price REAL NOT NULL,
                description TEXT,
                image TEXT,
                dietary TEXT,
                chef_special BOOLEAN DEFAULT 0,
                available BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
            )
        `);

        // Create bookings table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                restaurant_id INTEGER NOT NULL,
                table_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                guests INTEGER NOT NULL,
                special_requests TEXT,
                status TEXT DEFAULT 'confirmed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES login_users (id),
                FOREIGN KEY (restaurant_id) REFERENCES restaurants (id),
                FOREIGN KEY (table_id) REFERENCES restaurant_tables (id)
            )
        `);

        // Create orders table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                restaurant_id INTEGER NOT NULL,
                order_type TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                total_amount REAL NOT NULL,
                scheduled_time TEXT,
                special_instructions TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES login_users (id),
                FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
            )
        `);

        // Create order_items table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                menu_item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
            )
        `);

        // Create order_status_history table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS order_status_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                changed_by INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (changed_by) REFERENCES users (id)
            )
        `);

        // Create otp_logs table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS otp_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mobile TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                status TEXT DEFAULT 'unused',
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES login_users (id)
            )
        `);

        // Create table_images table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS table_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                description TEXT,
                is_primary BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (table_id) REFERENCES restaurant_tables (id)
            )
        `);

        // Create notifications table
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

        console.log('All tables created successfully');
        console.log('Inserting sample data...');

        // Insert sample restaurants with hashed passwords
        const adminPassword = await hashPassword('admin123');
        const restaurants = [
            [1, 'The Golden Spoon', 'Fine Dining', 4.8, 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg', '123 Gourmet Street, Downtown', '+1 (555) 123-4567', 'Exquisite fine dining experience with contemporary cuisine', 'GS001', adminPassword],
            [2, 'Sakura Sushi', 'Japanese', 4.6, 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg', '456 Zen Garden Ave, Midtown', '+1 (555) 234-5678', 'Authentic Japanese cuisine with fresh sushi and sashimi', 'SS002', adminPassword],
            [3, 'Mama\'s Italian', 'Italian', 4.7, 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg', '789 Pasta Lane, Little Italy', '+1 (555) 345-6789', 'Traditional Italian flavors in a cozy family atmosphere', 'MI003', adminPassword]
        ];

        const restaurantStmt = await prepareStatement(`
            INSERT OR IGNORE INTO restaurants 
            (id, name, cuisine, rating, image, address, phone, description, admin_id, admin_password_hash) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const restaurant of restaurants) {
            await new Promise((resolve, reject) => {
                restaurantStmt.run(restaurant, function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        }
        restaurantStmt.finalize();

        // Insert admin users
        const superAdminPassword = await hashPassword('superadmin2025');
        const adminUsers = [
            ['Golden Spoon Admin', 'admin@goldenspoon.com', null, adminPassword, 'admin', 1, 'GS001'],
            ['Sakura Admin', 'admin@sakurasushi.com', null, adminPassword, 'admin', 2, 'SS002'],
            ['Italian Admin', 'admin@mamasitalian.com', null, adminPassword, 'admin', 3, 'MI003'],
            ['Platform Owner', 'owner@restaurantai.com', null, superAdminPassword, 'superadmin', null, null]
        ];

        const userStmt = await prepareStatement(`
            INSERT OR IGNORE INTO users 
            (name, email, phone, password_hash, role, restaurant_id, admin_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const user of adminUsers) {
            await new Promise((resolve, reject) => {
                userStmt.run(user, function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        }
        userStmt.finalize();

        // Insert sample menu items WITH cuisine column
        const menuItems = [
            // The Golden Spoon - Fine Dining
            [1, 'Wagyu Beef Tenderloin', 'Mains', 'Fine Dining', 89.99, 'Premium wagyu beef with truffle sauce and seasonal vegetables', 'https://images.pexels.com/photos/361184/asparagus-steak-veal-steak-veal-361184.jpeg', 'gluten-free', 1, 1],
            [1, 'Pan-Seared Salmon', 'Mains', 'Fine Dining', 32.99, 'Fresh Atlantic salmon with lemon herb butter and quinoa', 'https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg', 'gluten-free,healthy', 0, 1],
            [1, 'Truffle Arancini', 'Starters', 'Fine Dining', 18.99, 'Crispy risotto balls with black truffle and parmesan', 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg', 'vegetarian', 0, 1],
            [1, 'Lobster Thermidor', 'Mains', 'Fine Dining', 65.99, 'Fresh lobster with creamy cognac sauce and herbs', 'https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg', 'gluten-free', 0, 1],
            [1, 'Chocolate Soufflé', 'Desserts', 'Fine Dining', 16.99, 'Warm chocolate soufflé with vanilla ice cream', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg', 'vegetarian', 0, 1],
            
            // Sakura Sushi - Japanese
            [2, 'Sashimi Platter', 'Sashimi', 'Japanese', 45.99, 'Fresh selection of tuna, salmon, and yellowtail', 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg', 'gluten-free,healthy', 0, 1],
            [2, 'Dragon Roll', 'Sushi', 'Japanese', 18.99, 'Eel and cucumber topped with avocado and eel sauce', 'https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg', '', 0, 1],
            [2, 'Miso Soup', 'Starters', 'Japanese', 6.99, 'Traditional soybean paste soup with tofu and seaweed', 'https://images.pexels.com/photos/5409751/pexels-photo-5409751.jpeg', 'vegetarian,healthy', 0, 1],
            [2, 'Chirashi Bowl', 'Sashimi', 'Japanese', 28.99, 'Assorted sashimi over seasoned sushi rice', 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg', 'gluten-free,healthy', 1, 1],
            [2, 'Tempura Udon', 'Noodles', 'Japanese', 16.99, 'Thick udon noodles in hot broth with tempura', 'https://images.pexels.com/photos/5409751/pexels-photo-5409751.jpeg', '', 0, 1],
            
            // Mama's Italian - Italian
            [3, 'Margherita Pizza', 'Pizza', 'Italian', 22.99, 'Fresh mozzarella, tomato sauce, and basil', 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg', 'vegetarian', 0, 1],
            [3, 'Fettuccine Alfredo', 'Pasta', 'Italian', 19.99, 'Creamy parmesan sauce with fresh fettuccine', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg', 'vegetarian', 0, 1],
            [3, 'Tiramisu', 'Desserts', 'Italian', 12.99, 'Classic Italian dessert with coffee and mascarpone', 'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg', 'vegetarian', 0, 1],
            [3, 'Osso Buco', 'Mains', 'Italian', 34.99, 'Braised veal shanks with risotto milanese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg', '', 1, 1],
            [3, 'Bruschetta', 'Starters', 'Italian', 12.99, 'Grilled bread with tomatoes, garlic, and basil', 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg', 'vegetarian', 0, 1]
        ];

        const menuStmt = await prepareStatement(`
            INSERT OR IGNORE INTO menu_items 
            (restaurant_id, name, category, cuisine, price, description, image, dietary, chef_special, available) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of menuItems) {
            await new Promise((resolve, reject) => {
                menuStmt.run(item, function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        }
        menuStmt.finalize();

        // Insert sample restaurant tables
        const restaurantTables = [
            // The Golden Spoon tables
            [1, 1, 2, 'available', 'standard', 'Window view', null, 100, 100],
            [1, 2, 4, 'available', 'standard', 'Center dining', null, 200, 100],
            [1, 3, 6, 'available', 'premium', 'Private booth', null, 300, 100],
            [1, 4, 8, 'available', 'premium', 'VIP section', null, 400, 100],
            [1, 5, 2, 'available', 'standard', 'Quiet corner', null, 150, 200],
            
            // Sakura Sushi tables
            [2, 1, 2, 'available', 'standard', 'Sushi bar view', null, 100, 150],
            [2, 2, 4, 'available', 'standard', 'Traditional seating', null, 200, 150],
            [2, 3, 6, 'available', 'premium', 'Tatami room', null, 300, 150],
            [2, 4, 8, 'available', 'premium', 'Private dining', null, 400, 150],
            
            // Mama's Italian tables
            [3, 1, 4, 'available', 'standard', 'Family style', null, 100, 200],
            [3, 2, 2, 'available', 'standard', 'Romantic corner', null, 200, 200],
            [3, 3, 8, 'available', 'premium', 'Large family table', null, 300, 200],
            [3, 4, 6, 'available', 'standard', 'Garden view', null, 250, 250]
        ];

        const tableStmt = await prepareStatement(`
            INSERT OR IGNORE INTO restaurant_tables 
            (restaurant_id, table_number, capacity, status, type, features, image, x_position, y_position) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const table of restaurantTables) {
            await new Promise((resolve, reject) => {
                tableStmt.run(table, function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        }
        tableStmt.finalize();

        console.log('✅ Database setup completed successfully!');
        console.log('\n📊 Sample Data Inserted:');
        console.log('- 3 Restaurants with admin accounts');
        console.log('- 1 Super admin account');
        console.log('- Restaurant tables for each location');
        console.log('- Sample menu items with cuisine information');
        console.log('\n🔐 Demo Credentials:');
        console.log('Restaurant Admins: GS001/admin123, SS002/admin123, MI003/admin123');
        console.log('Super Admin: owner@restaurantai.com/superadmin2025');
        console.log('\n🚀 Run "npm start" to start the server');

    } catch (error) {
        console.error('Error setting up database:', error);
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

// Run setup
setupDatabase();