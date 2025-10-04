# Notification System Fixes

## Overview
The notification system has been completely fixed and integrated with the database. All notification flows now work properly across customer, admin, and super admin roles.

## What Was Fixed

### 1. Customer Notifications
- **Booking Status Changes**: When an admin approves, cancels, or completes a table reservation, a notification is automatically sent to the customer
- **Order Status Changes**: When an admin updates an order status (confirmed, preparing, ready, completed, cancelled), a notification is sent to the customer
- **Notification Display**: Customers can view, read, and manage their notifications through the NotificationBell component in their dashboard

### 2. Admin Notifications
- **Database Integration**: Admin notifications now use the database instead of mock data
- **Super Admin Updates**: When a super admin updates restaurant information or changes restaurant status, the admin receives a notification
- **Notification Management**: Admins can view, mark as read, and delete their notifications in the Admin Notifications page

### 3. Super Admin Notifications
- **Send to Admins**: Super admins can send custom notifications to restaurant admins
- **System Notifications**: Super admins can view system-level notifications
- **Restaurant Management**: Automatic notifications are sent to admins when their restaurant is activated, deactivated, or updated

## Database Changes

### Updated `notifications` Table Schema
```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,                    -- For customer notifications
    admin_user_id INTEGER,              -- For admin notifications (NEW)
    restaurant_id INTEGER,
    booking_id INTEGER,
    order_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES login_users (id),
    FOREIGN KEY (admin_user_id) REFERENCES users (id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants (id),
    FOREIGN KEY (booking_id) REFERENCES bookings (id),
    FOREIGN KEY (order_id) REFERENCES orders (id)
)
```

## API Endpoints

### Customer Endpoints
- `GET /api/bookings/notifications` - Get customer notifications
- `GET /api/bookings/notifications/unread-count` - Get unread count
- `PUT /api/bookings/notifications/:id/read` - Mark as read
- `PUT /api/bookings/notifications/mark-all-read` - Mark all as read

### Admin Endpoints
- `GET /api/admin/notifications` - Get admin notifications
- `PUT /api/admin/notifications/:id/read` - Mark as read
- `DELETE /api/admin/notifications/:id` - Delete notification
- `PUT /api/admin/bookings/:id/status` - Update booking status (sends customer notification)
- `PUT /api/admin/orders/:id/status` - Update order status (sends customer notification)

### Super Admin Endpoints
- `GET /api/super-admin/notifications` - Get super admin notifications
- `POST /api/super-admin/notifications/send` - Send notification to admin
- `PUT /api/super-admin/notifications/:id/read` - Mark as read
- `DELETE /api/super-admin/notifications/:id` - Delete notification
- `PUT /api/super-admin/restaurants/:id/status` - Update restaurant status (sends admin notification)
- `PUT /api/super-admin/restaurants/:id` - Update restaurant info (sends admin notification)

## Notification Flow Examples

### Example 1: Admin Approves Booking
1. Admin changes booking status to "confirmed"
2. System creates notification in database with:
   - `user_id`: Customer's ID
   - `restaurant_id`: Restaurant ID
   - `booking_id`: Booking ID
   - `title`: "Booking Confirmed"
   - `message`: Details about the booking
   - `type`: "success"
3. Customer sees notification in their NotificationBell component
4. Customer can click to mark as read

### Example 2: Super Admin Deactivates Restaurant
1. Super admin changes restaurant status to inactive
2. System creates notification with:
   - `admin_user_id`: Admin's user ID
   - `restaurant_id`: Restaurant ID
   - `title`: "Restaurant Deactivated"
   - `message`: Explanation of deactivation
   - `type`: "alert"
3. Admin sees notification in their Admin Notifications page
4. Admin can mark as read or delete

### Example 3: Admin Updates Order Status
1. Admin changes order status to "ready"
2. System creates notification with:
   - `user_id`: Customer's ID
   - `restaurant_id`: Restaurant ID
   - `order_id`: Order ID
   - `title`: "Order Ready"
   - `message`: Details about pickup/delivery
   - `type`: "success"
3. Customer receives real-time notification

## Testing the System

### Test Customer Notifications
1. Log in as a customer
2. Create a booking
3. Log in as admin for that restaurant
4. Change booking status to "confirmed"
5. Log back in as customer
6. Check NotificationBell - you should see the notification

### Test Admin Notifications
1. Log in as super admin
2. Update a restaurant's status or information
3. Log in as admin for that restaurant
4. Go to Admin Notifications page
5. You should see the notification from super admin

### Test Order Notifications
1. Log in as customer and create an order
2. Log in as admin
3. Go to Orders page and update order status
4. Log back in as customer
5. Check notifications - you should see status update

## Migration Files
- `server/migrations/add-notifications.js` - Original migration
- `server/migrations/update-notifications.js` - Update to add admin_user_id field

## Key Benefits
1. **Real-time Communication**: All stakeholders stay informed
2. **Database Persistence**: Notifications are stored and can be retrieved later
3. **Role-based**: Different notification types for different user roles
4. **Comprehensive**: Covers all major actions (bookings, orders, restaurant management)
5. **User-friendly**: Clean UI for managing notifications

## Files Modified
- `server/routes/admin.js` - Added notification sending on booking/order updates
- `server/routes/superadmin.js` - Added notification endpoints and sending
- `server/migrations/add-notifications.js` - Updated schema
- `server/migrations/update-notifications.js` - New migration file
