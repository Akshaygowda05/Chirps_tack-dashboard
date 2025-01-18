// src/components/PrivateRoute.js
import React from 'react';
import { Route, Navigate } from 'react-router-dom';

function PrivateRoute({ element, ...rest }) {
  // Check if the user is authenticated (this can be improved based on your app's logic)
  const isAuthenticated = localStorage.getItem('isLoggedIn');  // You can also use sessionStorage or a global state

  return (
    <Route
      {...rest}
      element={isAuthenticated ? element : <Navigate to="/login" replace />}
    />
  );
}

export default PrivateRoute;
