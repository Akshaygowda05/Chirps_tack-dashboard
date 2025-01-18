import React, { useState, useEffect } from "react";
import { 
    Card, 
    Button, 
    Checkbox, 
    TimePicker, 
    message, 
    Table, 
    Modal, 
    Badge, 
    notification 
} from "antd";
import { ClockCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import moment from "moment";

const API_BASE_URL = "http://localhost:5000/api";

const MulticastGroup = ({ humidityThreshold, rainThreshold, windSpeedThreshold }) => {
  // State declarations
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [scheduleTime, setScheduleTime] = useState(null);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weatherWarnings, setWeatherWarnings] = useState([]);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingStop, setIsLoadingStop] = useState(false);
  const [isLoadingHome, setIsLoadingHome] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // Initial data fetching
  useEffect(() => {
    fetchGroups();
    fetchScheduledTasks();
  }, []);

  
  // Weather monitoring effect
  useEffect(() => {
    async function fetchWeatherData() {
      try {
        const weatherResponse = await fetch(`${API_BASE_URL}/gateway`);
        if (weatherResponse.ok) {
          const data = await weatherResponse.json();
          const weatherData = data.weather;

          const warnings = [];
          if (weatherData.humidity > humidityThreshold) {
            warnings.push(`Humidity (${weatherData.humidity}%) exceeds threshold (${humidityThreshold}%)`);
          }
          if (weatherData.rain > rainThreshold) {
            warnings.push(`Rain detected (${weatherData.rain}mm)`);
          }
          if (weatherData.windSpeed > windSpeedThreshold) {
            warnings.push(`Wind speed (${weatherData.windSpeed}m/s) exceeds threshold (${windSpeedThreshold}m/s)`);
          }

          setWeatherWarnings(warnings);
          setButtonsDisabled(warnings.length > 0);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setWeatherWarnings(['Failed to fetch weather data']);
      } finally {
        setLoading(false);
      }
    }

    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 30000);
    return () => clearInterval(interval);
  }, [humidityThreshold, rainThreshold, windSpeedThreshold]);

  // API functions
  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/multicast-groups`);
      setGroups(response.data.result || []);
    } catch (error) {
      message.error("Error fetching multicast groups.");
    }
  };

  const fetchScheduledTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/scheduled-tasks`);
      console.log(response)
      setScheduledTasks(response.data.tasks || []);
    } catch (error) {
      message.error("Error fetching scheduled tasks.");
    }
  };

  // Handler functions
  const handleToggleDevice = (state) => {
    if (buttonsDisabled) {
      const warningMessage = weatherWarnings.join('\n');
      alert(`Cannot operate robot due to weather conditions:\n${warningMessage}`);
      return;
    }
  };

  const handleSelectAll = (checked) => {
    setSelectedGroups(checked ? groups.map(group => group.id) : []);
  };

  const handleCheckboxChange = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const sendDataToGroups = async (groupIds, action) => {
    let loadingState;
    switch (action) {
      case "start":
        loadingState = setIsLoadingStart;
        break;
      case "stop":
        loadingState = setIsLoadingStop;
        break;
      case "home":
        loadingState = setIsLoadingHome;
        break;
      default:
        message.error(`Unknown action: ${action}`);
        return;
    }

    loadingState(true);

    try {
      const actionData = {
        start: "Ag==",
        stop: "Aw==",
        home: "BA=="
      };

      const data = actionData[action];
      if (!data) throw new Error(`Unknown action: ${action}`);

      const promises = groupIds.map(groupId =>
        axios.post(`${API_BASE_URL}/multicast-groups/${groupId}/queue`, {
          queueItem: { data, fCnt: 0, fPort: 1 },
        })
      );

      await Promise.all(promises);
      message.success(`Action ${action} successfully sent to selected groups.`);
    } catch (error) {
      message.error(`Failed to send ${action} to selected groups.`);
    } finally {
      loadingState(false);
    }
  };

  const handleScheduleSubmit = async () => {
    if (selectedGroups.length === 0) {
      message.error("Please select at least one group.");
      return;
    }
    if (!scheduleTime) {
      message.error("Please set a schedule time.");
      return;
    }

    setIsLoadingSchedule(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/schedule-downlink`, {
        groupIds: selectedGroups,
        scheduleTime: scheduleTime.format("YYYY-MM-DDTHH:mm:ss")
      });
      
      message.success(`Downlink scheduled for ${response.data.scheduledTime}`);
      fetchScheduledTasks();
      setIsScheduleModalVisible(false);
} catch (error) {
    // Handle immediate scheduling errors
    if (error.response?.data?.error) {
        notification.error({
            message: 'Cannot Schedule Downlink',
            description: error.response.data.error,
            duration: 0,
            key: 'schedule-error'
        });
    } else {
        message.error("Failed to schedule downlink");
    }
} finally {
    setIsLoadingSchedule(false);
}
};

useEffect(() => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/scheduled-tasks`);
      const tasks = response.data.tasks;
      
      setScheduledTasks(tasks); // Update tasks in the state

      tasks.forEach(task => {
        if (task.status === 'skipped') {
          notification.info({
            message: `Task ${task.id} Skipped`,
            description: `Skipped due to: ${task.error}`, // Show error message
          });
        }
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, 5000); // Poll every 5 seconds

  return () => {
    clearInterval(pollInterval); // Cleanup the interval when the component unmounts
  };
}, []); // Empty dependency array means it will run once when the component mounts


const cancelScheduledTask = async (taskId) => {
  try {
    const response = await fetch(`http://localhost:5000/api/scheduled-tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.data) {
      message.success("Scheduled task cancelled successfully");
      // Remove the cancelled task from the table
      setScheduledTasks(prev => prev.filter(task => task.id !== taskId));
    }
  } catch (error) {
    console.error('Cancel task error:', error);
    message.error("Failed to cancel scheduled task");
  }
};

  // Table columns configuration
  const scheduledTaskColumns = [
    {
      title: 'Schedule Time',
      dataIndex: 'scheduleTime',
      render: time => moment(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status, record) => (
          <div>
              <Badge 
                  status={
                      status === 'scheduled' ? 'processing' :  //this thing i have changed still in progress
                      status === 'completed' ? 'success' :
                      status === 'failed' ? 'error' :
                      'default'
                  } 
                  text={status}
              />
              {record.error && (
                  <div className="mt-2 text-red-500 text-sm">
                      {record.error}
                  </div>
              )}
          </div>
      )
  },
    
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => cancelScheduledTask(record.id)
          }
        >
          Cancel
        </Button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
    <Card className="shadow-xl rounded-2xl border border-slate-200">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Block-wise / Plant Scheduling of Robots
          </h2>
          <Button
            onClick={() => setIsScheduleModalVisible(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-all"
          >
            <ClockCircleOutlined className="h-4 w-4" />
            View Scheduled Tasks
          </Button>
        </div>

        {/* Select All Checkbox */}
        <div className="flex items-center">
          <Checkbox
            onChange={(e) => handleSelectAll(e.target.checked)}
            checked={selectedGroups.length === groups.length}
            indeterminate={selectedGroups.length > 0 && selectedGroups.length < groups.length}
            className="text-slate-700 font-medium"
          >
            Select All Groups
          </Checkbox>
        </div>

        {/* Group Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card 
              key={group.id} 
              className={`
                relative overflow-hidden transition-all duration-300 rounded-xl
                ${selectedGroups.includes(group.id) 
                  ? 'border-2 border-blue-500 bg-blue-50 shadow-blue-100' 
                  : 'border border-slate-200 hover:border-blue-300 hover:shadow-lg'}
              `}
            >
              <div className="p-2 flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-800">{group.name}</h3>
                  <p className="text-slate-500 text-sm">{group.region}</p>
                </div>
                <Checkbox
                  checked={selectedGroups.includes(group.id)}
                  onChange={() => handleCheckboxChange(group.id)}
                  className="text-blue-500"
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 pt-4">
          <Button
            onClick={() => {
              sendDataToGroups(selectedGroups, "start");
              handleToggleDevice("start");
            }}
            disabled={selectedGroups.length === 0 || isLoadingStop || isLoadingHome || buttonsDisabled}
            className="w-full md:w-auto px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoadingStart ? "Starting..." : "Start Now"}
          </Button>

          <Button
            onClick={() => {
              sendDataToGroups(selectedGroups, "stop");
              handleToggleDevice("off");
            }}
            disabled={selectedGroups.length === 0 || isLoadingStart || isLoadingHome || buttonsDisabled}
            className="w-full md:w-auto px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoadingStop ? "Stopping..." : "Stop Now"}
          </Button>

          <Button
            onClick={() => {
              sendDataToGroups(selectedGroups, "home");
              handleToggleDevice("dock");
            }}
            disabled={selectedGroups.length === 0 || isLoadingStart || isLoadingStop || buttonsDisabled}
            className="w-full md:w-auto px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoadingHome ? "Returning..." : "Return to Dock"}
          </Button>

          <div className="flex items-center gap-4">
            <TimePicker
              format="HH:mm"
              value={scheduleTime}
              onChange={setScheduleTime}
              className="w-32 rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
            <Button
              onClick={handleScheduleSubmit}
              disabled={selectedGroups.length === 0}
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoadingSchedule ? "Scheduling..." : "Schedule Now"}
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <Modal
      title={
        <h3 className="text-xl font-bold text-slate-800">
          Scheduled Tasks
        </h3>
      }
      open={isScheduleModalVisible}
      onCancel={() => setIsScheduleModalVisible(false)}
      footer={null}
      width={800}
      className="rounded-xl overflow-hidden"
    >
      <Table
        dataSource={scheduledTasks}
        columns={scheduledTaskColumns}
        rowKey="id"
        pagination={true}
        className="border border-slate-200 rounded-lg overflow-hidden"
      />
    </Modal>
  </div>
);
};

export default MulticastGroup;