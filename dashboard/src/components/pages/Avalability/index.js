import React, { useEffect, useState } from 'react';
import { Activity, Server, Wifi } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import moment from 'moment';

const StatusPulse = ({ status, size = "normal" }) => {
  const sizeClasses = size === "small" ? "h-2 w-2" : "h-3 w-3";
  return (
    <div className="flex items-center gap-2">
      <div className={`relative flex ${sizeClasses}`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          status === 'online' ? 'bg-green-400' : 'bg-red-400'
        }`}></span>
        <span className={`relative inline-flex rounded-full h-full w-full ${
          status === 'online' ? 'bg-green-500' : 'bg-red-500'
        }`}></span>
      </div>
      <span className={`font-medium ${
        status === 'online' ? 'text-green-500' : 'text-red-500'
      }`}>
        {status === 'online' ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

const ServerStatusBadge = ({ status }) => (
  <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white rounded-full shadow-md px-6 py-3 border border-gray-100 hover:shadow-lg transition-shadow">
    <Server className={`h-5 w-5 ${status === 'online' ? 'text-green-500' : 'text-red-500'}`} />
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm font-semibold text-gray-700">Network Server</span>
      <span className="text-sm font-medium text-gray-600">is {status === 'online' ? "Online" : "Offline"}</span>
    </div>
  </div>
);

const BlockPieChart = ({ online, offline, blockName }) => {
  const data = [
    { name: 'Online', value: online },
    { name: 'Offline', value: offline }
  ];
  const COLORS = ['#10B981', '#EF4444'];

  return (
    <div className="w-1/4 min-w-[250px] bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{blockName}</h3>
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={40}
              outerRadius={60}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-sm mt-6 space-y-2">
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="text-gray-600">Total Devices:</span>
          <span className="font-semibold">{online + offline}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-600">Online:</span>
          <span className="font-semibold text-green-500">{online}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-600">Offline:</span>
          <span className="font-semibold text-red-500">{offline}</span>
        </div>
      </div>
    </div>
  );
};

export const Avalability=()=>{
  const [device, setDevice] = useState([]);
  const [gatewayCount, setGatewayCount] = useState(0);
  const [gatewayData, setGatewayData] = useState([]);
  const [serverStatus, setServerStatus] = useState("offline");
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [deviceOnlineCount, setDeviceOnlineCount] = useState(0);
  const [deviceOfflineCount, setDeviceOfflineCount] = useState(0);
  const [blockStatus, setBlockStatus] = useState({});

  const fetchData = async () => {
    try {
      const [gatewayResponse, serverResponse, deviceResponse] = await Promise.all([
        fetch('http://localhost:5000/api/allGateways'),
        fetch('http://localhost:5000/api/server'),
        fetch('http://localhost:5000/api/devices')
      ]);
      
      const deviceResult = await deviceResponse.json();
      const gatewayResult = await gatewayResponse.json();
      const serverResult = await serverResponse.json();

      // Gateway data
      const data = gatewayResult.gatewayData.result;
      setGatewayCount(data.length);
      setGatewayData(data);

      // Device data processing
      const device_data = deviceResult.result;
      setDevice(device_data);

      const BlockLastSeen = {};
      let totalOnline = 0;
      let totalOffline = 0;

      device_data.forEach(device => {
        const lastseen = moment(device.lastSeenAt);
        const isValidDate = lastseen.isValid();
        const isOnline = isValidDate && lastseen.isAfter(moment().subtract(30, "minutes"));
        
        const match = device.description?.match(/(Block \d+)/);
        if (match) {
          const blockKey = match[1];
          
          if (!BlockLastSeen[blockKey]) {
            BlockLastSeen[blockKey] = { online: 0, offline: 0 };
          }

          if (isOnline) {
            BlockLastSeen[blockKey].online += 1;
            totalOnline += 1;
          } else {
            BlockLastSeen[blockKey].offline += 1;
            totalOffline += 1;
          }
        }
      });

      console.log(BlockLastSeen)
    

      setBlockStatus(BlockLastSeen);
      setDeviceOnlineCount(totalOnline);
      setDeviceOfflineCount(totalOffline);

      // Gateway status
      const onlineGateways = data.filter(gateway => {
        if (gateway.lastSeenAt) {
          const lastSeenTime = moment(gateway.lastSeenAt);
          return moment().diff(lastSeenTime, 'minutes') <= 30;
        }
        return false;
      });

      setOnlineCount(onlineGateways.length);
      setOfflineCount(data.length - onlineGateways.length);
      setServerStatus(serverResult.message === "workingfine" ? "online" : "offline");
      setLastUpdated(moment());

    } catch (error) {
      console.error("Error fetching data:", error);
      setServerStatus("offline");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const pieData = [
    { name: 'Online', value: onlineCount },
    { name: 'Offline', value: offlineCount }
  ];

  const devicePieData = [
    { name: 'Online', value: deviceOnlineCount },
    { name: 'Offline', value: deviceOfflineCount }
  ];

  const COLORS = ['#10B981', '#EF4444'];


  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-6 bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              System Availability
            </h1>
            <p className="text-gray-500 mt-2">Real-time monitoring dashboard</p>
          </div>
          <ServerStatusBadge status={serverStatus} />
        </div>
        <div className="text-sm bg-gray-50 px-4 py-2 rounded-lg">
          <span className="text-gray-500">Last updated: </span>
          <span className="font-medium">{lastUpdated ? lastUpdated.format('HH:mm:ss') : 'Never'}</span>
        </div>
      </div>

      {/* Gateway Overview */}
      <div className="bg-white rounded-2xl shadow-md p-8">
        <div className="flex items-center justify-between pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gateway Overview</h2>
            <p className="text-gray-500 mt-1">Network gateway status and statistics</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 px-6 py-4 bg-gray-50 rounded-xl">
            <h4 className="text-xl font-semibold text-gray-800">Gateway Statistics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Total Gateways</span>
                <span className="font-semibold text-lg">{gatewayCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Online Gateways</span>
                <span className="font-semibold text-lg text-green-500">{onlineCount}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Offline Gateways</span>
                <span className="font-semibold text-lg text-red-500">{offlineCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Details */}
      <div className="bg-white rounded-2xl shadow-md p-8">
        <div className="flex items-center justify-between pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gateway Details</h2>
            <p className="text-gray-500 mt-1">Individual gateway status and information</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-600 rounded-l-lg">Name</th>
                <th className="text-left p-4 font-semibold text-gray-600">Status</th>
                <th className="text-left p-4 font-semibold text-gray-600">Last Seen</th>
                <th className="text-left p-4 font-semibold text-gray-600 rounded-r-lg">Location</th>
              </tr>
            </thead>
            <tbody>
              {gatewayData.map((gateway, index) => {
                const isOnline = gateway.lastSeenAt && 
                  moment().diff(moment(gateway.lastSeenAt), 'minutes') <= 30;
                return (
                  <tr key={gateway.gatewayId} 
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                      ${index === gatewayData.length - 1 ? '' : 'border-b border-gray-100'}`}>
                    <td className="p-4 font-medium text-gray-800">{gateway.name}</td>
                    <td className="p-4">
                      <StatusPulse status={isOnline ? 'online' : 'offline'} />
                    </td>
                    <td className="p-4 text-gray-600">
                      {gateway.lastSeenAt ? 
                        moment(gateway.lastSeenAt).fromNow() : 
                        'Never Seen'}
                    </td>
                    <td className="p-4 text-gray-700">{gateway.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block Overview */}
      <div className="bg-white rounded-2xl shadow-md p-8">
        <div className="flex items-center justify-between pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Block Overview</h2>
            <p className="text-gray-500 mt-1">Status distribution across different blocks</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(blockStatus).map(([blockName, data]) => (
            <div key={blockName} className="bg-gray-50 p-6 rounded-xl hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">{blockName}</h3>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Online', value: data.online },
                        { name: 'Offline', value: data.offline }
                      ]}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill={COLORS[0]} />
                      <Cell fill={COLORS[1]} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-gray-600">Total Robots</span>
                  <span className="font-semibold">{data.online + data.offline}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Online</span>
                  <span className="font-semibold text-green-500">{data.online}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Offline</span>
                  <span className="font-semibold text-red-500">{data.offline}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Avalability;