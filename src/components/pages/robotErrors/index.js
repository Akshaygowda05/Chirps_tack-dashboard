import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

const RobotErrors = () => {
  const [deviceErrors, setDeviceErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const faultCodes = {
    1: "Encoder Fault",
    2: "Peripheral Fault",
    3: "IO Expander Fault",
    4: "Low Battery Fault",
    5: "Limit Switch Fault",
    6: "Brush Motor Over Current Fault",
    7: "High Temperature Fault"
  };

  useEffect(() => {
    const fetchDeviceErrors = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/get-errors');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setDeviceErrors(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceErrors();
    const interval = setInterval(fetchDeviceErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredDevices = deviceErrors.filter(device => 
    device.fault !== 0 && 
    device.controlPannelName.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadCSV = () => {
    const headers = ['Robot ID', 'Fault', 'Last Update'];
    const csvData = filteredDevices.map(device => [
      device.controlPannelName,
      faultCodes[device.fault] || '',
      new Date(device.lastUpdate).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robot-errors.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Error loading robot data: {error}. Please check your connection and try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h6" component="h5" gutterBottom>
        Robot Fault Monitor
      </Typography>
      
      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <TextField
        size='small'
          fullWidth
          placeholder="Search robots..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ flexGrow: 1 }}
        />
        <Button
           variant="contained"
           startIcon={<DownloadIcon />}
           onClick={downloadCSV}
           sx={{ px: 2 }} 
        >
           export
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="robot errors table">
          <TableHead>
            <TableRow>
              <TableCell>Robot ID</TableCell>
              <TableCell>Fault</TableCell>
              <TableCell>Last Update</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDevices.length > 0 ? (
              filteredDevices.map((device) => (
                <TableRow
                  key={device.controlPannelName}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {device.controlPannelName}
                  </TableCell>
                  <TableCell>{faultCodes[device.fault] || 'Unknown Fault'}</TableCell>
                  <TableCell>
                    {new Date(device.lastUpdate).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">
                    No active faults found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default RobotErrors;