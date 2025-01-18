import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Box, 
  Paper,
  Accordion, 
  AccordionSummary, 
  AccordionDetails  
} from '@mui/material';
import { FixedSizeList as List } from 'react-window'
import { 
  DeviceHub as DeviceHubIcon,
  DevicesOther as DevicesIcon,
  CheckCircle as ActiveIcon,
  ErrorOutline as InactiveIcon
} from '@mui/icons-material';
import { Modal, Table } from 'antd';
const Dashboard = () => {
  // State for devices and modals
  const [inactiveDevices, setInactiveDevices] = useState([]);
  const [activeDevices, setActiveDevices] = useState([]);
  const [showInactiveDevices, setShowInactiveDevices] = useState(false);
  const [showAllDevices, setShowAllDevices] = useState(false);
  const [showActiveDevices, setShowActiveDevices] = useState(false);
  const [allDevices, setAllDevices] = useState([]);
  
  const [dashboardData, setDashboardData] = useState({
    multicastGroups: { totalCount: 0 },
    devices: { 
      totalCount: 0, 
      activeCount: 0, 
      inactiveCount: 0 
    },
    performanceData: [],
    energyStats: {
      totalEnergyGenerated: 0,
      totalPanelsCleaned: 0
    }
  });
  // Color Palette
  const colors = {
    primary: '#3f51b5',
    secondary: '#f50057',
    success: '#4caf50',
    info: '#2196f3',
    warning: '#ff9800',
    background: '#f4f6f8'
  };
  // Limit data points for better visualization
  const limitDataPoints = (data, maxPoints = 7) => {
    if (data.length <= maxPoints) return data;
    
    // Take last 7 data points
    return data.slice(-maxPoints);
  };
  // Styled Card Component
  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = colors.primary ,
    onClick
  }) => (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        borderRadius: 2,
        background: `linear-gradient(145deg, ${color}33, ${color}11)`
      }}
    onClick={onClick}  // Add this handler
    style={{ cursor: 'pointer' }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mr: 2 
      }}>
        <Icon 
          sx={{ 
            fontSize: 40, 
            color: color,
            opacity: 0.7 
          }} 
        />
      </Box>
      <Box>
        <Typography 
          variant="subtitle2" 
          color="text.secondary"
          sx={{ lineHeight: 1 }}
        >
          {title}
        </Typography>
        <Typography 
          variant="h5" 
          fontWeight="bold" 
          color="text.primary"
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
// Column definitions for the device tables
  const deviceColumns = [
    {
      title: 'Device Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Last Seen',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      render: (text) => new Date(text).toLocaleString(),
    },
   ];
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {

        const multicastResponse =await axios.get('http://localhost:5000/api/multicast-groups')
        const devicesResponse= await axios.get('http://localhost:5000/api/devices')
        const performanceResponse =await axios.get('http://localhost:5000/api/robot-performance/last-7-days')
        // // const [multicastResponse, devicesResponse, performanceResponse] = await Promise.all([
        //  // axios.get('http://192.168.0.239:5000/api/multicast-groups'),
        //   axios.get('http://192.168.0.239:5000/api/devices'),
        //   axios.get('http://192.168.0.239:5000/api/robot-performance/last-7-days')
        // ]);
        const devices = devicesResponse.data.result;
        // Filter active and inactive devices
        const now = new Date();
        const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
        const activeDevicesList = devices.filter(device => {
          const lastSeen = new Date(device.lastSeenAt);
          return (now - lastSeen) <= thirtyMinutes;
        });
        const inactiveDevicesList = devices.filter(device => {
          const lastSeen = new Date(device.lastSeenAt);
          return (now - lastSeen) > thirtyMinutes;
        });

        console.log(inactiveDevicesList)
        // Update state
        setAllDevices(devices);
        setActiveDevices(activeDevicesList);
        setInactiveDevices(inactiveDevicesList);

        setDashboardData({
          multicastGroups: {
            totalCount: multicastResponse.data.totalCount
          },
          devices: {
            totalCount: devices.length,
            activeCount: activeDevicesList.length,
            inactiveCount: inactiveDevicesList.length
          },
          performanceData: performanceResponse.data,
          energyStats: {
            totalEnergyGenerated: performanceResponse.data.reduce((sum, day) => 
              sum + (day.total_panels_cleaned * 10), 0),
            totalPanelsCleaned: performanceResponse.data.reduce((sum, day) => 
              sum + day.total_panels_cleaned, 0)
          }
        });
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
      }
    };

    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const renderCustomLabel = ({ name, percent }) => {
    return `${(percent * 100).toFixed(0)}%`;
  };
  const limitedPerformanceData = dashboardData.performanceData.slice(0, 7);
  const DeviceStatusPieChart = ({ data, colors }) => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} devices`, name]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Modal content for device status
  const DeviceStatusModal = ({ title, devices, showModal, handleClose }) => {
    const pieData = [
      { name: 'Selected Devices', value: devices.length },
      { name: 'Other Devices', value: dashboardData.devices.totalCount - devices.length }
    ];

   
    return (
      <Modal
        title={title}
        open={showModal}
        onCancel={handleClose}
        footer={null}
        width={800}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Device Distribution
            </Typography>
            <DeviceStatusPieChart 
              data={pieData}
              colors={[colors.success, colors.secondary]}
            />
            <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
              Total Devices: {dashboardData.devices.totalCount}
              <br />
              {title}: {devices.length}
            </Typography>
          </CardContent>
        </Card>
      </Modal>
    );
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      p: 3, 
      backgroundColor: colors.background 
    }}>
      {/* Statistics Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
  {[ 
    { 
      title: 'Blocks', 
      value: dashboardData.multicastGroups.totalCount,
      icon: DeviceHubIcon,
      color: colors.primary
    },
    { 
      title: 'Total Robots', 
      value: dashboardData.devices.totalCount,
      icon: DevicesIcon,
      color: colors.info,
      onClick: () => setShowAllDevices(true)  // This will work now
    },
    { 
      title: 'Active Robots', 
      value: dashboardData.devices.activeCount,
      icon: ActiveIcon,
      color: colors.success,
      onClick: () => setShowActiveDevices(true)  // This will work now
    },
    { 
      title: 'Inactive Robots', 
      value: dashboardData.devices.inactiveCount,
      icon: InactiveIcon,
      color: colors.secondary,
      onClick: () => setShowInactiveDevices(true)  // This will work now
    }
  ].map((cardData, index) => (
    <Grid item xs={12} sm={6} md={3} key={index}>
      <StatCard {...cardData} />
    </Grid>
  ))}
</Grid>


      {/* Performance Visualizations */}
      <Grid container spacing={3}>
        {/* Panels Cleaned Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Day-wise Total Panels Cleaned
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={limitedPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Panels Cleaned', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar 
                    dataKey="total_panels_cleaned" 
                    fill={colors.primary} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Battery Discharge Line Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Day-wise Average Battery Discharge Cycles
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={limitedPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Discharge Cycles', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avg_battery_discharge" 
                    stroke={colors.secondary}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Modal
  title="Inactive Devices"
  open={showInactiveDevices}
  onCancel={() => setShowInactiveDevices(false)}
  footer={null}
  width={800}
>
<Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
  {inactiveDevices && inactiveDevices.map((device) => {
    const deviceId = device?.id || device?.devEui; // Fallback to devEui if id is undefined

    if (!device || !deviceId) {
      // Handle the case where the device is missing or doesn't have a valid identifier
      return null;
    }

    return (
      <Accordion key={deviceId}>
        <AccordionSummary>
          <Typography variant="h6">{device.name}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary">
            Last Seen: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
          </Typography>
          <Typography variant="body2" color="text.primary">
            Status: <span style={{ color: 'red' }}>Inactive</span>
          </Typography>
        </AccordionDetails>
      </Accordion>
    );
  })}
</Box>

</Modal>


      <Modal
  title="All Robots"
  open={showAllDevices}
  onCancel={() => setShowAllDevices(false)}
  footer={null}
  width={800}
>
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Robots Status Distribution
      </Typography>
      {/* Render the Pie Chart here */}
      <DeviceStatusPieChart
        data={[
          { name: 'Active Robots', value: dashboardData.devices.activeCount },
          { name: 'Inactive Robots', value: dashboardData.devices.inactiveCount }
        ]}
        colors={[colors.success, colors.secondary]} // Green for Active, Red for Inactive
      />
      <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
        Total Robots: {dashboardData.devices.totalCount}
        <br />
        Active Robots: {dashboardData.devices.activeCount}
        <br />
        Inactive Robots: {dashboardData.devices.inactiveCount}
      </Typography>
    </CardContent>
  </Card>
</Modal>

<Modal
  title="Active Devices"
  open={showActiveDevices}
  onCancel={() => setShowActiveDevices(false)}
  footer={null}
  width={800}
>
  <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
    <List
      height={400}  // Set the height of the visible area
      itemCount={activeDevices.length}  // Number of items to render
      itemSize={80}  // Height of each item in the list
      width="100%"  // Full width
    >
      {({ index, style }) => {
        const device = activeDevices[index];
        return (
          <Accordion key={device.devEui} style={style}>
            <AccordionSummary>
              <Typography variant="h6">{device.name}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                Last Seen: {new Date(device.lastSeenAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.primary">
                Status: <span style={{ color: 'green' }}>Active</span>
              </Typography>
            </AccordionDetails>
          </Accordion>
        );
      }}
    </List>
  </Box>
</Modal>
    </Box>
  );
};

export default Dashboard;
