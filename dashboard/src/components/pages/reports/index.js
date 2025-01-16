import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download } from 'lucide-react'; // Adding download icon for better UX

const RobotPerformanceTable = () => {
  const [performanceData, setPerformanceData] = useState({
    individualDevices: [],
    overallSummary: null
  });
  const [timeframe, setTimeframe] = useState('weekly');
  const [isDownloading, setIsDownloading] = useState(false);

  // Create axios instance with proper base URL
  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    responseType: 'json'
  });

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const response = await api.get(`/${timeframe}-report`);
        setPerformanceData(response.data);
      } catch (error) {
        console.error('Error fetching performance data:', error);
        // You might want to show an error message to the user here
      }
    };

    fetchPerformanceData();
  }, [timeframe]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Make sure to use the correct endpoint
      const response = await axios({
        url: `http://localhost:5000/api/download-report/${timeframe}`,
        method: 'GET',
        responseType: 'blob', // Important for file downloads
      });

      // Create a blob from the response data
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] 
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${timeframe}_report.csv`);
      
      // Append to document, click, and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button 
            className={`px-4 py-2 rounded transition-colors duration-200 ${
              timeframe === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setTimeframe('weekly')}
          >
            Weekly
          </button>
          <button 
            className={`px-4 py-2 rounded transition-colors duration-200 ${
              timeframe === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setTimeframe('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`px-4 py-2 rounded transition-colors duration-200 ${
              timeframe === 'yearly' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setTimeframe('yearly')}
          >
            Yearly
          </button>
        </div>
        <button 
          className={`bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center space-x-2 transition-colors duration-200 ${
            isDownloading ? 'opacity-75 cursor-not-allowed' : ''
          }`}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download size={20} />
          <span>
            {isDownloading ? 'Downloading...' : `Download ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Report`}
          </span>
        </button>
      </div>

      {performanceData.overallSummary && (
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h2 className="text-xl font-bold mb-2">Overall Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="font-semibold">Total Robots</p>
              <p>{performanceData.overallSummary.total_robots}</p>
            </div>
            <div>
              <p className="font-semibold">Total Panels Cleaned</p>
              <p>{performanceData.overallSummary.overall_total_panels_cleaned}</p>
            </div>
            <div>
              <p className="font-semibold">Avg Battery Discharge Cycles</p>
              <p>{performanceData.overallSummary.overall_avg_battery_discharge}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full bg-white">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left font-semibold">Device ID</th>
              <th className="p-3 text-left font-semibold">Total Panels Cleaned</th>
              <th className="p-3 text-left font-semibold">Avg Battery Discharge Cycles</th>
              <th className="p-3 text-left font-semibold">
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Start
              </th>
            </tr>
          </thead>
          <tbody>
            {performanceData.individualDevices.map((device, index) => (
              <tr 
                key={device.device_id} 
                className={`border-b transition-colors duration-200 hover:bg-gray-50 ${
                  index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <td className="p-3">{device.device_id}</td>
                <td className="p-3">{device.total_panels_cleaned}</td>
                <td className="p-3">{device.avg_battery_discharge}%</td>
                <td className="p-3">
                  {new Date(device[`${timeframe.slice(0, -2)}_start`]).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RobotPerformanceTable;