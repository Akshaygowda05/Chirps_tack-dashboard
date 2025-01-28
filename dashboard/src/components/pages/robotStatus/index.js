import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Grid, 
  Card, 
  CardContent,
  IconButton
} from "@mui/material";
import axios from "axios";
import moment from "moment";
import RefreshIcon from "@mui/icons-material/Refresh";

const API_BASE_URL = "http://localhost:5000/api";

// Simple color scheme
const COLORS = {
  running: "#4CAF50",  // Green
  notRunning: "#BDBDBD"
};

const RobotStatus = () => {
  const [robotData, setRobotData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pieData, setPieData] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

  useEffect(() => {
    fetchDevices();
    fetchMulticast();
  }, []);

  const fetchMulticast = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/multicast-groups`);
      const data = await response.json();
      setAllGroups(data.result || []);
    } catch (error) {
      console.error("Error fetching multicast groups:", error);
    }
  };
 const data="AQ=="
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all(
        allGroups.map(group => 
          axios.post(`${API_BASE_URL}/multicast-groups/${group.id}/queue`, {
            queueItem: { data, fCnt: 0, fPort: 1 },
          })
        )
      );
      await fetchDevices();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/devices`);
      const devices = await response.json();
      await updateRobotData(devices.result);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceData = async (devEui) => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${devEui}/data`);
      return response.json();
    } catch (error) {
      console.error("Error fetching device data:", error);
      return null;
    }
  };

  const updateRobotData = async (devices) => {
    const robotStatus = await Promise.all(
      devices.map(async (device) => {
        const deviceData = await fetchDeviceData(device.devEui);
        
        // Check CH2 value for running status
        const ch2Value = deviceData?.data?.CH2;
        const isRunning = ch2Value === 1;
        
        return {
          devEui: device.devEui,
          robotId: device.name || device.devEui,
          ch2Value: ch2Value,
          status: isRunning ? "Running" : "Not Running",
          lastUpdate: deviceData?.timestamp
        };
      })
    );

    const validRobots = robotStatus.filter(robot => robot !== null);
    setRobotData(validRobots);

    const running = validRobots.filter(robot => robot.status === "Running").length;
    const notRunning = validRobots.filter(robot => robot.status === "Not Running").length;

    setPieData([
      { name: "Running", value: running, color: COLORS.running },
      { name: "Not Running", value: notRunning, color: COLORS.notRunning }
    ]);
  };

  const LedIndicator = ({ isRunning }) => (
    <Box sx={{ textAlign: 'center', mt: 2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          margin: '0 auto',
          backgroundColor: isRunning ? COLORS.running : '#BDBDBD', // Grey color
          boxShadow: isRunning 
            ? '0 0 20px #4CAF50, inset 0 0 10px rgba(255,255,255,0.5)' 
            : '0 0 20px #BDBDBD, inset 0 0 10px rgba(255,255,255,0.5)', // Grey color
          transition: 'all 0.3s ease',
          border: '2px solid',
          borderColor: isRunning ? '#45a049' : '#9E9E9E' // Grey color
        }}
      />
      <Typography 
        variant="body2" 
        sx={{ 
          mt: 1,
          color: isRunning ? COLORS.running : '#BDBDBD', // Grey color
          fontWeight: 'bold'
        }}
      >
        {isRunning ? "RUNNING" : "NOT RUNNING"}
      </Typography>
    </Box>
  );

  // Custom Pie Chart label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const radian = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * radian);
    const y = cy + radius * Math.sin(-midAngle * radian);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${name}\n(${value})`}
      </text>
    );
  };

  const RobotCard = ({ robot }) => (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        '&:hover': {
          boxShadow: 3
        }
      }}
    >
      <CardContent sx={{ flex: 1, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          {robot.robotId}
        </Typography>
        
        <LedIndicator isRunning={robot.status === "Running"} />
        
      
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Robot Status Dashboard
        </Typography>
        <IconButton onClick={handleRefresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Status Overview */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom align="center">
          Status Overview
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center">
          <PieChart width={400} height={300}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderCustomizedLabel}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke={entry.color}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [`${name}: ${value} robots`, 'Status']}
            />
            <Legend
              formatter={(value) => `${value} Robots`}
              verticalAlign="bottom"
              height={36}
            />
          </PieChart>
        </Box>
      </Paper>

      {/* Robot Grid */}
      <Grid container spacing={3}>
        {loading ? (
          <Box display="flex" justifyContent="center" width="100%" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          robotData.map(robot => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={robot.devEui}>
              <RobotCard robot={robot} />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default RobotStatus;