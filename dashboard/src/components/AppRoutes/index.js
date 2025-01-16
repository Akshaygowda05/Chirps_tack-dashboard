import { Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import Home from "../pages/Home";
import Devices from "../pages/devices";
import MulticastGroup from "../pages/MulticastGroup";
import DeviceDetails from "../pages/DeviceDetails";
import RobotStatus from "../pages/robotStatus";
import Reports from "../pages/reports";
import Configuration from "../pages/configuration";
import RobotErrors from "../pages/robotErrors"
import { Avalability } from "../pages/Avalability"; 

// Default threshold values
const THRESHOLD_DEFAULTS = {
  humidity: 85,
  rain: 1,
  windSpeed: 10
};

// Error handling component
const ErrorFallback = ({ error }) => {
  return (
    <div className="error-container">
      <h2>Something went wrong:</h2>  
      <pre>{error.message}</pre>
    </div>
  );
};

// Helper function to safely interact with localStorage
const getStorageValue = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    
    const parsed = JSON.parse(saved);
    return typeof parsed === typeof defaultValue ? parsed : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

function AppRoutes() {
  // Initialize state with safer localStorage handling
  const [humidityThreshold, setHumidityThreshold] = useState(() => 
    getStorageValue('humidityThreshold', THRESHOLD_DEFAULTS.humidity)
  );
  
  const [rainThreshold, setRainThreshold] = useState(() => 
    getStorageValue('rainThreshold', THRESHOLD_DEFAULTS.rain)
  );
  
  const [windSpeedThreshold, setWindSpeedThreshold] = useState(() => 
    getStorageValue('windSpeedThreshold', THRESHOLD_DEFAULTS.windSpeed)
  );

  // Save to localStorage whenever thresholds change
  useEffect(() => {
    try {
      localStorage.setItem('humidityThreshold', JSON.stringify(humidityThreshold));
      localStorage.setItem('rainThreshold', JSON.stringify(rainThreshold));
      localStorage.setItem('windSpeedThreshold', JSON.stringify(windSpeedThreshold));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [humidityThreshold, rainThreshold, windSpeedThreshold]);

  // Threshold props object for cleaner component passing
  const thresholdProps = {
    humidityThreshold,
    rainThreshold,
    windSpeedThreshold
  };

  console.log("this is for to get the localWind", localStorage.getItem('windSpeedThreshold'))

  // Configuration props object
  const configProps = {
    setHumidityThreshold,
    setRainThreshold,
    setWindSpeedThreshold
  };
  console.log("gotilla",setWindSpeedThreshold)

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/devices" 
          element={<Devices {...thresholdProps} />}
        />
        <Route 
          path="/device/:devEui" 
          element={<DeviceDetails />} 
        />
        <Route 
          path="/multicast" 
          element={<MulticastGroup {...thresholdProps} />}
        />
        <Route 
          path="/robotStatus" 
          element={<RobotStatus />}  // this is for the  robot status
        />
        <Route 
          path="/reports" 
          element={<Reports />} 
        />
         <Route 
          path="/robotErrors" 
          element={<RobotErrors />} 
        />
        <Route 
          path="/configuration"
          element={<Configuration {...configProps} />}
        />
        <Route 
          path="/avalability"
          element={<Avalability/>}
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default AppRoutes;