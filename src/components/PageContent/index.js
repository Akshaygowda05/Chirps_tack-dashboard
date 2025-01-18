// components/PageContent.js
import React from 'react';
import AppRoutes from '../AppRoutes'; // This is where you define the routes for home, devices, etc.

function PageContent() {
  return (
    <div className="PageContent">
      <AppRoutes /> {/* Renders the routes for the app */}
    </div>
  );
}

export default PageContent;
