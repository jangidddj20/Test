const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Middleware to ensure super admin access
router.use(authenticateToken);
router.use(authorizeRole(['superadmin']));

// POST /api/super-admin/restaurants - Add new restaurant
router.post('/restaurants', [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Restaurant name is required and must be less than 100 characters'),
    body('cuisine').trim().isLength({ min: 1, max: 50 }).withMessage('Cuisine type is required'),
    body('address').trim().isLength({ min: 1, max: 200 }).withMessage('Address is required'),
    body('phone').trim().isLength({ min: 1, max: 20 }).withMessage('Phone number is required'),
    body('admin_id').trim().isLength({ min: 1, max: 20 }).withMessage('Admin ID is required'),
    body('admin_password').isLength({ min: 6 }).withMessage('Admin password must be at least 6 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('image').optional().isURL().withMessage('Image must be a valid URL')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, cuisine, address, phone, description, image, admin_id, admin_password } = req.body;

        // Check if admin_id already exists
        const existingAdmin = await db.get(
            'SELECT id FROM restaurants WHERE admin_id = ?',
            [admin_id]
        );

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin ID already exists'
            });
        }

        // Hash admin password
        const hashedPassword = await bcrypt.hash(admin_password, 12);

        // Insert restaurant
        const restaurantResult = await db.run(`
            INSERT INTO restaurants (name, cuisine, address, phone, description, image, admin_id, admin_password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [name, cuisine, address, phone, description || null, image || null, admin_id, hashedPassword]);

        // Create admin user entry
        await db.run(`
            INSERT INTO users (name, email, password_hash, role, restaurant_id, admin_id, is_active)
            VALUES (?, ?, ?, 'admin', ?, ?, 1)
        `, [`${name} Admin`, `admin@${admin_id.toLowerCase()}.com`, hashedPassword, restaurantResult.id, admin_id]);

        console.log(`✅ Restaurant created: ${name} with Admin ID ${admin_id} by Super Admin ${req.user.id}`);

        res.status(201).json({
            success: true,
            message: 'Restaurant created successfully',
            data: {
                id: restaurantResult.id,
                name,
                admin_id
            }
        });

    } catch (error) {
        console.error('Create restaurant error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating restaurant'
        });
    }
});

// PUT /api/super-admin/restaurants/:id - Update restaurant
router.put('/restaurants/:id', [
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Restaurant name must be less than 100 characters'),
    body('cuisine').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Cuisine type is required'),
    body('address').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Address is required'),
    body('phone').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Phone number is required'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('image').optional().isURL().withMessage('Image must be a valid URL'),
    body('rating').optional().isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;

        // Check if restaurant exists
        const existingRestaurant = await db.get(
            'SELECT id FROM restaurants WHERE id = ?',
            [id]
        );

        if (!existingRestaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        const allowedFields = ['name', 'cuisine', 'address', 'phone', 'description', 'image', 'rating'];
        
        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                updateFields.push(`${field} = ?`);
                updateValues.push(req.body[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        await db.run(
            `UPDATE restaurants SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get admin user for this restaurant to send notification
        const adminUser = await db.get(
            'SELECT id FROM users WHERE restaurant_id = ? AND role = "admin" LIMIT 1',
            [id]
        );

        const updatedRestaurant = await db.get(
            'SELECT name FROM restaurants WHERE id = ?',
            [id]
        );

        // Send notification to admin about restaurant update
        if (adminUser && updatedRestaurant) {
            const updatedFieldsList = updateFields
                .filter(f => !f.includes('updated_at'))
                .map(f => f.split(' = ')[0])
                .join(', ');

            await db.run(`
                INSERT INTO notifications (admin_user_id, restaurant_id, title, message, type, is_read)
                VALUES (?, ?, ?, ?, ?, 0)
            `, [
                adminUser.id,
                id,
                'Restaurant Information Updated',
                `Your restaurant "${updatedRestaurant.name}" information has been updated by the Super Admin. Updated fields: ${updatedFieldsList}`,
                'info'
            ]);

            console.log(`✅ Notification sent to admin user ${adminUser.id}`);
        }

        console.log(`✅ Restaurant updated: ID ${id} by Super Admin ${req.user.id}`);

        res.status(200).json({
            success: true,
            message: 'Restaurant updated successfully',
            data: {
                id: parseInt(id),
                updated: true
            }
        });

    } catch (error) {
        console.error('Update restaurant error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating restaurant'
        });
    }
});

// PUT /api/super-admin/restaurants/:id/status - Toggle restaurant status
router.put('/restaurants/:id/status', [
    body('is_active').isBoolean().withMessage('is_active must be a boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { is_active } = req.body;

        // Check if restaurant exists
        const existingRestaurant = await db.get(
            'SELECT id, name FROM restaurants WHERE id = ?',
            [id]
        );

        if (!existingRestaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Update restaurant status WITHOUT affecting user data
        await db.run(
            'UPDATE restaurants SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [is_active, id]
        );

        // Get admin user for this restaurant to send notification
        const adminUser = await db.get(
            'SELECT id FROM users WHERE restaurant_id = ? AND role = "admin" LIMIT 1',
            [id]
        );

        // Update ONLY the admin user status for this restaurant, not customer data
        await db.run(
            'UPDATE users SET is_active = ? WHERE restaurant_id = ? AND role = "admin"',
            [is_active, id]
        );

        // Send notification to admin
        if (adminUser) {
            const notificationMessage = is_active
                ? `Your restaurant "${existingRestaurant.name}" has been activated by the Super Admin. You can now resume operations.`
                : `Your restaurant "${existingRestaurant.name}" has been deactivated by the Super Admin. Please contact support for more information.`;

            const notificationTitle = is_active
                ? 'Restaurant Activated'
                : 'Restaurant Deactivated';

            await db.run(`
                INSERT INTO notifications (admin_user_id, restaurant_id, title, message, type, is_read)
                VALUES (?, ?, ?, ?, ?, 0)
            `, [
                adminUser.id,
                id,
                notificationTitle,
                notificationMessage,
                is_active ? 'success' : 'alert'
            ]);

            console.log(`✅ Notification sent to admin user ${adminUser.id}`);
        }

        console.log(`✅ Restaurant status updated: ${existingRestaurant.name} set to ${is_active ? 'active' : 'inactive'} by Super Admin ${req.user.id}`);

        res.status(200).json({
            success: true,
            message: `Restaurant ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: parseInt(id),
                is_active,
                updated: true
            }
        });

    } catch (error) {
        console.error('Update restaurant status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating restaurant status'
        });
    }
});
// GET /api/super-admin/dashboard - Get platform analytics
router.get('/dashboard', async (req, res) => {
    try {
        // Get platform-wide statistics
        const stats = await Promise.all([
            db.get('SELECT COUNT(*) as total_restaurants FROM restaurants WHERE is_active = 1'),
            db.get('SELECT COUNT(*) as total_customers FROM login_users WHERE role = "customer" AND is_active = 1'),
            db.get('SELECT COUNT(*) as total_orders FROM orders'),
            db.get('SELECT COUNT(*) as total_bookings FROM bookings'),
            db.get('SELECT SUM(total_amount) as total_revenue FROM orders WHERE status = "completed"'),
            db.get('SELECT COUNT(*) as pending_orders FROM orders WHERE status = "pending"'),
            db.get('SELECT COUNT(*) as active_admins FROM users WHERE role = "admin" AND is_active = 1')
        ]);

        const dashboardData = {
            totalRestaurants: stats[0].total_restaurants || 0,
            totalCustomers: stats[1].total_customers || 0,
            totalOrders: stats[2].total_orders || 0,
            totalBookings: stats[3].total_bookings || 0,
            totalRevenue: stats[4].total_revenue || 0,
            pendingOrders: stats[5].pending_orders || 0,
            activeAdmins: stats[6].active_admins || 0
        };

        // Get recent activity
        const recentOrders = await db.all(`
            SELECT 
                o.id, o.order_type, o.status, o.total_amount, o.created_at,
                r.name as restaurant_name,
                lu.name as customer_name
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            JOIN login_users lu ON o.user_id = lu.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);

        const recentBookings = await db.all(`
            SELECT 
                b.id, b.date, b.time, b.guests, b.status, b.created_at,
                r.name as restaurant_name,
                lu.name as customer_name
            FROM bookings b
            JOIN restaurants r ON b.restaurant_id = r.id
            JOIN login_users lu ON b.user_id = lu.id
            ORDER BY b.created_at DESC
            LIMIT 10
        `);

        res.status(200).json({
            success: true,
            message: 'Super admin dashboard data retrieved successfully',
            data: {
                stats: dashboardData,
                recentOrders,
                recentBookings
            }
        });

    } catch (error) {
        console.error('Get super admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching dashboard data'
        });
    }
});

// GET /api/super-admin/restaurants - Get all restaurants
router.get('/restaurants', async (req, res) => {
    try {
        const restaurants = await db.all(`
            SELECT 
                r.id, r.name, r.cuisine, r.rating, r.image, r.address, r.phone, 
                r.description, r.admin_id, r.is_active, r.created_at,
                COUNT(o.id) as total_orders,
                COUNT(b.id) as total_bookings,
                SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as revenue
            FROM restaurants r
            LEFT JOIN orders o ON r.id = o.restaurant_id
            LEFT JOIN bookings b ON r.id = b.restaurant_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);

        // Ensure we always return an array
        const restaurantList = restaurants || [];

        res.status(200).json({
            success: true,
            message: 'Restaurants retrieved successfully',
            data: restaurantList
        });

    } catch (error) {
        console.error('Get all restaurants error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching restaurants',
            data: []
        });
    }
});

// GET /api/super-admin/users - Get all users
router.get('/users', async (req, res) => {
    try {
        const { role, limit = 100 } = req.query;

        let query = `
            SELECT id, name, email, phone, role, is_active, created_at
            FROM login_users
            WHERE 1=1
        `;
        const queryParams = [];

        if (role) {
            query += ' AND role = ?';
            queryParams.push(role);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        queryParams.push(parseInt(limit));

        const users = await db.all(query, queryParams);

        // Also get admin users
        const adminUsers = await db.all(`
            SELECT 
                u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
                r.name as restaurant_name
            FROM users u
            LEFT JOIN restaurants r ON u.restaurant_id = r.id
            WHERE u.role IN ('admin', 'superadmin')
            ORDER BY u.created_at DESC
        `);

        // Ensure we always return arrays
        const customerList = users || [];
        const adminList = adminUsers || [];

        res.status(200).json({
            success: true,
            message: 'Users retrieved successfully',
            data: {
                customers: customerList,
                admins: adminList
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching users',
            data: {
                customers: [],
                admins: []
            }
        });
    }
});

// GET /api/super-admin/orders - Get all orders
router.get('/orders', async (req, res) => {
    try {
        const { status, restaurantId, limit = 100 } = req.query;

        let query = `
            SELECT 
                o.id, o.order_type, o.status, o.total_amount, o.scheduled_time, 
                o.special_instructions, o.created_at,
                r.name as restaurant_name,
                lu.name as customer_name, lu.email as customer_email
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            JOIN login_users lu ON o.user_id = lu.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (status) {
            query += ' AND o.status = ?';
            queryParams.push(status);
        }

        if (restaurantId) {
            query += ' AND o.restaurant_id = ?';
            queryParams.push(restaurantId);
        }

        query += ' ORDER BY o.created_at DESC LIMIT ?';
        queryParams.push(parseInt(limit));

        const orders = await db.all(query, queryParams);

        // Ensure we always return an array
        const orderList = orders || [];

        res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            data: orderList
        });

    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching orders',
            data: []
        });
    }
});

// GET /api/super-admin/analytics - Get detailed analytics
router.get('/analytics', async (req, res) => {
    try {
        // Revenue analytics
        const revenueByMonth = await db.all(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                SUM(total_amount) as revenue,
                COUNT(*) as order_count
            FROM orders 
            WHERE status = 'completed' 
            AND created_at >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month DESC
        `);

        // Restaurant performance
        const restaurantPerformance = await db.all(`
            SELECT 
                r.name,
                COUNT(o.id) as total_orders,
                SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as revenue,
                AVG(r.rating) as avg_rating
            FROM restaurants r
            LEFT JOIN orders o ON r.id = o.restaurant_id
            WHERE r.is_active = 1
            GROUP BY r.id, r.name
            ORDER BY revenue DESC
        `);

        // Order status distribution
        const orderStatusDistribution = await db.all(`
            SELECT 
                status,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders), 2) as percentage
            FROM orders
            GROUP BY status
            ORDER BY count DESC
        `);

        // Ensure we always return objects with arrays
        const revenueData = revenueByMonth || [];
        const performanceData = restaurantPerformance || [];
        const statusData = orderStatusDistribution || [];

        // Popular cuisines
        const popularCuisines = await db.all(`
            SELECT 
                r.cuisine,
                COUNT(o.id) as order_count,
                SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as revenue
            FROM restaurants r
            LEFT JOIN orders o ON r.id = o.restaurant_id
            GROUP BY r.cuisine
            ORDER BY order_count DESC
        `);

        const cuisineData = popularCuisines || [];

        res.status(200).json({
            success: true,
            message: 'Analytics data retrieved successfully',
            data: {
                revenueByMonth: revenueData,
                restaurantPerformance: performanceData,
                orderStatusDistribution: statusData,
                popularCuisines: cuisineData
            }
        });

    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching analytics',
            data: {
                revenueByMonth: [],
                restaurantPerformance: [],
                orderStatusDistribution: [],
                popularCuisines: []
            }
        });
    }
});

// GET /api/super-admin/notifications - Get super admin notifications
router.get('/notifications', async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        // Super admin can see system-level notifications
        const notifications = await db.all(`
            SELECT
                n.id, n.title, n.message, n.type, n.is_read as read, n.created_at,
                r.name as restaurant_name
            FROM notifications n
            LEFT JOIN restaurants r ON n.restaurant_id = r.id
            WHERE n.admin_user_id IS NULL AND n.user_id IS NULL
            ORDER BY n.created_at DESC
            LIMIT ?
        `, [parseInt(limit)]);

        res.status(200).json({
            success: true,
            message: 'Notifications retrieved successfully',
            data: notifications
        });

    } catch (error) {
        console.error('Get super admin notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching notifications'
        });
    }
});

// POST /api/super-admin/notifications/send - Send notification to admin
router.post('/notifications/send', [
    body('restaurant_id').isInt({ min: 1 }).withMessage('Valid restaurant ID is required'),
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required'),
    body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message is required'),
    body('type').optional().isIn(['info', 'success', 'alert', 'error']).withMessage('Invalid notification type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { restaurant_id, title, message, type = 'info' } = req.body;

        // Get admin user for this restaurant
        const adminUser = await db.get(
            'SELECT id FROM users WHERE restaurant_id = ? AND role = "admin" LIMIT 1',
            [restaurant_id]
        );

        if (!adminUser) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found for this restaurant'
            });
        }

        // Create notification
        await db.run(`
            INSERT INTO notifications (admin_user_id, restaurant_id, title, message, type, is_read)
            VALUES (?, ?, ?, ?, ?, 0)
        `, [adminUser.id, restaurant_id, title, message, type]);

        console.log(`✅ Notification sent to admin of restaurant ${restaurant_id} by Super Admin ${req.user.id}`);

        res.status(201).json({
            success: true,
            message: 'Notification sent successfully'
        });

    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while sending notification'
        });
    }
});

// PUT /api/super-admin/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        await db.run(
            'UPDATE notifications SET is_read = 1 WHERE id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while marking notification as read'
        });
    }
});

// DELETE /api/super-admin/notifications/:id - Delete notification
router.delete('/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await db.run(
            'DELETE FROM notifications WHERE id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while deleting notification'
        });
    }
});

module.exports = router;