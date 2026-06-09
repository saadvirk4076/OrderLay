import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [restaurantToken, setRestaurantToken] = useState(localStorage.getItem('restaurantToken'));
  const [restaurantData, setRestaurantData] = useState(JSON.parse(localStorage.getItem('restaurantData')));

  const loginAdmin = (token) => {
    setAdminToken(token);
    localStorage.setItem('adminToken', token);
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    localStorage.removeItem('adminToken');
  };

  const loginRestaurant = (token, data) => {
    setRestaurantToken(token);
    setRestaurantData(data);
    localStorage.setItem('restaurantToken', token);
    localStorage.setItem('restaurantData', JSON.stringify(data));
  };

  const logoutRestaurant = () => {
    setRestaurantToken(null);
    setRestaurantData(null);
    localStorage.removeItem('restaurantToken');
    localStorage.removeItem('restaurantData');
  };

  return (
    <AuthContext.Provider value={{
      adminToken, loginAdmin, logoutAdmin,
      restaurantToken, restaurantData, loginRestaurant, logoutRestaurant
    }}>
      {children}
    </AuthContext.Provider>
  );
};
