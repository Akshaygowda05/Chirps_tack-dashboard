import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Checkbox, 
  Button, 
  FormControlLabel, 
  TextField, 
  Typography, 
  Snackbar, 
  CircularProgress, 
  Alert, 
  Box,
  Divider
} from '@mui/material';
import axios from 'axios';

const Configuration = ({ setHumidityThreshold, setRainThreshold, setWindSpeedThreshold }) => {
  // Convert m/s to mph (Inline conversion logic)
  const msToMph = (ms) => Math.round(ms * 2.237);

  // Retrieve the settings from localStorage if available
  const weatherConfig = JSON.parse(localStorage.getItem('weatherConfig')) || {};
  const [humidity, setHumidity] = useState(weatherConfig.humidityThreshold || 85);
  const [windSpeed, setWindSpeed] = useState(msToMph(weatherConfig.windSpeedThreshold) || 16); // Convert m/s to mph
  const [rainEnabled, setRainEnabled] = useState(weatherConfig.rainEnabled || false);

  // States for weather fetching
  const [currentWeather, setCurrentWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState('');

  // this is for the task maneger

  // Fetch current weather
  const fetchWeather = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/gateway');
      const data = await response.json();
      if (data && data.weather) {
        setCurrentWeather({
          ...data.weather,
          windSpeedMph: msToMph(data.weather.windSpeed),  // Convert windSpeed from m/s to mph
          dewPoint: calculateDewPoint(data.weather.temperature, data.weather.humidity),
        });
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch weather data');
      setLoading(false);
    }
  };

  // Calculate dew point
  const calculateDewPoint = (tempC, relativeHumidity) => {
    const a = 17.27;
    const b = 237.7;
    const gamma = ((a * tempC) / (b + tempC)) + Math.log(relativeHumidity / 100);
    return Math.round((b * gamma) / (a - gamma) * 10) / 10;
  };

  // Send the updated thresholds to the backend
  const sendThresholdToBackend = async () => {
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/update-threshold', {
        windSpeedThreshold: windSpeed,     // Send wind speed in mph
        humidityThreshold: humidity,       // Send humidity as percentage
        rainEnabled: rainEnabled,          // Just send boolean flag instead of threshold
      });
      
      console.log('Threshold updated successfully:', response.data);
      setNotification('Thresholds updated successfully!');
      return true;
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update thresholds';
      setError(errorMessage);
      console.error('Error updating thresholds:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle saving the configuration
  const handleSave = () => {
    const settings = {
      humidityThreshold: humidity,
      windSpeedThreshold: windSpeed,
      rainEnabled: rainEnabled,
    };

    // Save to localStorage
    localStorage.setItem('weatherConfig', JSON.stringify(settings));
    
    // Update the parent component state with new thresholds
    setHumidityThreshold(humidity);
    setWindSpeedThreshold(windSpeed);
    setRainThreshold(rainEnabled ? 0.1 : 999);

    setNotification('Configuration saved successfully!');
    
    // Send the thresholds to the backend
    sendThresholdToBackend();
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 3000);  // Update weather every 30 seconds
    return () => clearInterval(interval);  // Cleanup interval on component unmount
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentWeather) {
    return (
      <Box m={2}>
        <Typography variant="body1">No weather data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 4, md: 6 }, maxWidth: '100%', mx: 'auto' }}>
      <Snackbar 
        open={Boolean(notification)} 
        autoHideDuration={3000} 
        onClose={() => setNotification('')}
      >
        <Alert onClose={() => setNotification('')} severity="success">
          {notification}
        </Alert>
      </Snackbar>

      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5">Weather Configuration</Typography>
              {error && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AlertCircle sx={{ width: 20, height: 20, color: 'error.main' }} />
                  <Typography variant="body2" color="error">
                    {error}
                  </Typography>
                </Box>
              )}
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: 'grey.50', 
            borderRadius: 1,
            border: 1,
            borderColor: 'grey.200'
          }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Current Status
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: '1fr 1fr',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(5, 1fr)' 
              },
              gap: 2
            }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Humidity
                </Typography>
                <Typography 
                  variant="h6" 
                  color={currentWeather.humidity > humidity ? 'error' : 'success'}
                >
                  {currentWeather.humidity}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Wind Speed
                </Typography>
                <Typography 
                  variant="h6" 
                  color={currentWeather.windSpeedMph > windSpeed ? 'error' : 'success'}
                >
                  {currentWeather.windSpeedMph} mph
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Rain
                </Typography>
                <Typography 
                  variant="h6" 
                  color={currentWeather.rain > 0 && rainEnabled ? 'error' : 'success'}
                >
                  {currentWeather.rain} mm
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Dew Point
                </Typography>
                <Typography variant="h6">
                  {currentWeather.dewPoint}°C
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Stow Angle
                </Typography>
                <Typography variant="h6">
                  30°
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
              gap: 2 
            }}>
              <TextField
                label="Humidity Threshold (%)"
                type="number"
                value={humidity}
                onChange={(e) => setHumidity(Math.max(0, Math.min(100, e.target.value)))}
                fullWidth
                inputProps={{ min: 0, max: 100 }}
              />
              <TextField
                label="Wind Speed Threshold (mph)"
                type="number"
                value={windSpeed}
                onChange={(e) => setWindSpeed(Math.max(0, e.target.value))}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={rainEnabled}
                  onChange={(e) => setRainEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Disable robots when any rain is detected"
            />

            <Button 
              onClick={handleSave} 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
            >
              Save Configuration
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Configuration;
