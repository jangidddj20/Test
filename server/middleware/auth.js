const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add role validation to ensure token matches expected role
        const expectedRole = getExpectedRoleFromPath(req.path);
        if (expectedRole && decoded.role !== expectedRole) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Expected ${expectedRole} role, but token has ${decoded.role} role.`
            });
        }
        
        // Get user details from database
        let user;
        if (decoded.role === 'customer') {
            user = await db.get(
                'SELECT id, name, email, phone, role FROM login_users WHERE id = ? AND is_active = 1',
                [decoded.userId]
            );
        } else if (decoded.role === 'admin') {
            // For admin, get from users table and verify restaurant access
            user = await db.get(
                'SELECT id, name, email, phone, role, restaurant_id, admin_id FROM users WHERE id = ? AND role = "admin" AND is_active = 1',
                [decoded.userId]
            );
            
            // Add restaurant info to user object
            if (user && decoded.restaurantId) {
                user.restaurant_id = decoded.restaurantId;
                user.admin_id = decoded.adminId;
            }
        } else if (decoded.role === 'superadmin') {
            user = await db.get(
                'SELECT id, name, email, phone, role FROM users WHERE id = ? AND role = "superadmin" AND is_active = 1',
                [decoded.userId]
            );
        } else {
            return res.status(403).json({
                success: false,
                message: 'Invalid role in token'
            });
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: `Invalid token - ${decoded.role} user not found or inactive` 
            });
        }

        // Add decoded token data to user object for role-specific access
        user.tokenRole = decoded.role;
        user.tokenUserId = decoded.userId;
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

// Helper function to determine expected role from request path
const getExpectedRoleFromPath = (path) => {
    if (path.startsWith('/api/admin/')) return 'admin';
    if (path.startsWith('/api/super-admin/')) return 'superadmin';
    // Customer endpoints and public endpoints don't have strict role requirements
    return null;
};
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        // Check both user role and token role for extra security
        const userRole = req.user.role || req.user.tokenRole;
        if (!roles.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Insufficient permissions. Required: ${roles.join(' or ')}, Current: ${userRole}` 
            });
        }

        next();
    };
};

const authorizeRestaurantAdmin = async (req, res, next) => {
    const userRole = req.user?.role || req.user?.tokenRole;
    if (!req.user || userRole !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }

    // Check if admin is accessing their own restaurant data
    const restaurantId = req.params.restaurantId || req.body.restaurantId;
    if (restaurantId && parseInt(restaurantId) !== req.user.restaurant_id) {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied - not your restaurant' 
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    authorizeRole,
    authorizeRestaurantAdmin
};