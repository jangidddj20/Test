import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Menu data
const mockMenuItems = {
  1: [
    {
      id: 1,
      name: "Wagyu Beef Tenderloin",
      category: "Mains",
      price: 89.99,
      description: "Premium wagyu beef with truffle sauce and seasonal vegetables",
      image: "https://images.pexels.com/photos/361184/asparagus-steak-veal-steak-veal-361184.jpeg",
      dietary: ["gluten-free"],
      chef_special: true,
      available: true
    },
    {
      id: 2,
      name: "Pan-Seared Salmon",
      category: "Mains",
      price: 32.99,
      description: "Fresh Atlantic salmon with lemon herb butter and quinoa",
      image: "https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg",
      dietary: ["gluten-free", "healthy"],
      available: true
    },
    {
      id: 3,
      name: "Truffle Arancini",
      category: "Starters",
      price: 18.99,
      description: "Crispy risotto balls with black truffle and parmesan",
      image: "https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg",
      dietary: ["vegetarian"],
      available: true
    },
    {
      id: 4,
      name: "Lobster Thermidor",
      category: "Mains",
      price: 65.99,
      description: "Fresh lobster with creamy cognac sauce and herbs",
      image: "https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg",
      dietary: ["gluten-free"],
      available: true
    },
    {
      id: 5,
      name: "Chocolate Soufflé",
      category: "Desserts",
      price: 16.99,
      description: "Warm chocolate soufflé with vanilla ice cream",
      image: "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
      dietary: ["vegetarian"],
      available: true
    }
  ],
  2: [
    {
      id: 6,
      name: "Sashimi Platter",
      category: "Sashimi",
      price: 45.99,
      description: "Fresh selection of tuna, salmon, and yellowtail",
      image: "https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg",
      dietary: ["gluten-free", "healthy"],
      available: true
    },
    {
      id: 7,
      name: "Dragon Roll",
      category: "Sushi",
      price: 18.99,
      description: "Eel and cucumber topped with avocado and eel sauce",
      image: "https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg",
      available: true
    },
    {
      id: 8,
      name: "Miso Soup",
      category: "Starters",
      price: 6.99,
      description: "Traditional soybean paste soup with tofu and seaweed",
      image: "https://images.pexels.com/photos/5409751/pexels-photo-5409751.jpeg",
      dietary: ["vegetarian", "healthy"],
      available: true
    }
  ],
  3: [
    {
      id: 9,
      name: "Margherita Pizza",
      category: "Pizza",
      price: 22.99,
      description: "Fresh mozzarella, tomato sauce, and basil",
      image: "https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg",
      dietary: ["vegetarian"],
      available: true
    },
    {
      id: 10,
      name: "Fettuccine Alfredo",
      category: "Pasta",
      price: 19.99,
      description: "Creamy parmesan sauce with fresh fettuccine",
      image: "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg",
      dietary: ["vegetarian"],
      available: true
    },
    {
      id: 11,
      name: "Tiramisu",
      category: "Desserts",
      price: 12.99,
      description: "Classic Italian dessert with coffee and mascarpone",
      image: "https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg",
      dietary: ["vegetarian"],
      available: true
    }
  ]
};

export const DataProvider = ({ children }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { apiCall } = useAuth();

  // Load restaurants from API
  const loadRestaurants = async () => {
    setIsLoading(true);
    try {
      const result = await apiCall('/restaurants');
      if (result.success) {
        setRestaurants(result.data);
      }
    } catch (error) {
      console.error('Failed to load restaurants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load restaurants on mount
  React.useEffect(() => {
    loadRestaurants();
    
    // Set up periodic refresh to keep data in sync
    const interval = setInterval(loadRestaurants, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures this only runs once on mount
  
  // Admin functionality
  const updateRestaurant = (restaurantId, updates) => {
    setRestaurants(prev => prev.map(restaurant => 
      restaurant.id === restaurantId ? { ...restaurant, ...updates } : restaurant
    ));
  };

  const addMenuItem = (restaurantId, menuItem) => {
    // Implementation for adding menu items
  };

  const updateMenuItem = (restaurantId, itemId, updates) => {
    // Implementation for updating menu items
  };

  const deleteMenuItem = (restaurantId, itemId) => {
    // Implementation for deleting menu items
  };

  const addToCart = (item, restaurantId) => {
    setCart(prev => [...prev, { ...item, restaurantId, id: Date.now() }]);
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const addBooking = (booking) => {
    setBookings(prev => [...prev, { ...booking, id: Date.now(), status: 'confirmed' }]);
  };

  const updateTableStatus = (restaurantId, tableId, status) => {
    setRestaurants(prev => prev.map(restaurant => {
      if (restaurant.id === restaurantId) {
        return {
          ...restaurant,
          tables: restaurant.tables.map(table => 
            table.id === tableId ? { ...table, status } : table
          )
        };
      }
      return restaurant;
    }));
  };

  const getMenuItems = (restaurantId) => {
    // This will be loaded from API when needed
    return mockMenuItems[restaurantId] || [];
  };

  const loadMenuItems = async (restaurantId) => {
    try {
      const result = await apiCall(`/restaurants/${restaurantId}/menu`);
      if (result.success) {
        return result.data;
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
      return mockMenuItems[restaurantId] || [];
    }
  };

  const loadUserOrders = async () => {
    try {
      const result = await apiCall('/orders');
      if (result.success) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const loadUserBookings = async () => {
    try {
      const result = await apiCall('/bookings');
      if (result.success) {
        setBookings(result.data);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const value = {
    restaurants,
    isLoading,
    loadRestaurants,
    orders,
    bookings,
    cart,
    updateRestaurant,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    addToCart,
    removeFromCart,
    clearCart,
    addBooking,
    updateTableStatus,
    getMenuItems,
    loadMenuItems,
    loadUserOrders,
    loadUserBookings
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};