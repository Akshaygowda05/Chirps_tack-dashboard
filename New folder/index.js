
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mqtt = require('mqtt'); 
const { Pool } = require('pg');
const reportRoutes = require('./routes/reportRoutes');
const cron = require('node-cron');  
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const app = express();

// PostgreSQL Client Configuration
const pgClient = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'robot_data',
    user: 'postgres',
    password: '123789'
});

// Connect to PostgreSQL
pgClient.connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Error connecting to PostgreSQL:', err));

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api', reportRoutes);

// API configuration
const API_URL = "http://localhost:8090";
const API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjaGlycHN0YWNrIiwiaXNzIjoiY2hpcnBzdGFjayIsInN1YiI6ImM4MmY1ODBlLWJkNGEtNGE2Yy1hMDgxLWEyY2Q3MjMwNmNmZiIsInR5cCI6ImtleSJ9.rX_ix6m9aXDFA71YXR2BfjDKy-Z3tBOyFmlQiirEl7Q";
const APPLICATION_ID ='0a5171af-5f2b-4e15-bd17-18f8d4baf716';
const GATEWAYS_ID='0016c001ff1e7a17';

// Store device data in memory

const deviceData = new Map(); // to store the device in the device data in the map  
const deviceErrorData=new Map();// this isfor only to store the error data

// MQTT Configuration
const mqttBrokerUrl = 'mqtt://localhost:1883';
const options = {
    clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
    username: 'YOUR_MQTT_USERNAME',
    password: 'YOUR_MQTT_PASSWORD',
    clean: true,
    reconnectPeriod: 5000
};

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 5000,
    headers: {
        'Grpc-Metadata-Authorization': `Bearer ${API_TOKEN}`,
        'accept': 'application/json',
    }
});

// Helper function to fetch devices
async function fetchDevices() {
    try {
        const response = await apiClient.get('/api/devices', {
            params: {
                limit: 100,
                applicationId: APPLICATION_ID
            }
        });
        return response.data.result || [];
    } catch (error) {
        console.error('Error fetching devices:', error);
        return [];
    }
}

// MQTT Client Setup
function setupMQTTClient() {
    const client = mqtt.connect(mqttBrokerUrl, options);

    client.on('connect', async () => {
        console.log('Connected to MQTT broker');
        try {
            const devices = await fetchDevices();
            const topic = `application/${APPLICATION_ID}/device/+/event/up`;
            client.subscribe(topic, (err) => {
                if (err) {
                    console.error('Error subscribing to topic:', err);
                } else {
                    console.log(`Subscribed to topic: ${topic}`);
                    console.log(`Monitoring ${devices.length} devices`);
                }
            });
        } catch (error) {
            console.error('Error setting up device monitoring:', error);
        }
    });

    client.on('message', async (topic, message) => {
        try {
            const deviceEUI = topic.split('/')[3];
            const data = JSON.parse(message.toString());
            
            // Store in memory
            deviceData.set(deviceEUI, {
                lastUpdate: new Date(),
                data: data.object
            });
            //store the error data in the memory
            deviceErrorData.set(deviceEUI,{
                lastUpdate:new Date(),
                fault:data.object.CH7,
                Name:data.object.CH1,
                deviceEUI:deviceEUI
            })
            console.log(deviceErrorData.Name)

            console.log(deviceData) 

            
            // Process and store in PostgreSQL
            await processAndStoreData(data.object);

            console.log(`Received data from device ${deviceEUI}:`, data.object);
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    client.on('error', (err) => {
        console.error('MQTT Client Error:', err);
    });

    client.on('close', () => {
        console.log('MQTT Client disconnected');
    });

    client.on('reconnect', () => {
        console.log('MQTT Client reconnecting...');
    });

    return client;
}

// Function to process and store MQTT data in PostgreSQL
async function processAndStoreData(dataObject) {
    try {
        // Extract relevant values from the MQTT message
        const deviceId = parseInt(dataObject.CH1);
        const currentPanelsCleaned = parseFloat(dataObject.CH10);
        const currentCh6 = parseFloat(dataObject.CH6);

        // Check if CH1 is zero, and reject the data if so
        if (deviceId === 0) {
            console.log('Data rejected because CH1 is 0 (deviceId is zero)');
            return; // Exit early, do not proceed with the database update
        }

        // Step 1: Fetch the previous panels_cleaned value for this device
        const query = `
            SELECT panels_cleaned
            FROM robot_data
            WHERE device_id = $1
            ORDER BY timestamp DESC
            LIMIT 1;
        `;
        const prevRes = await pgClient.query(query, [deviceId]);

        let panelsCleanedSinceLast = currentPanelsCleaned; // Default to current value if no previous data is found

        if (prevRes.rows.length > 0) {
            // If previous data exists, calculate the difference
            const previousPanelsCleaned = prevRes.rows[0].panels_cleaned;
            panelsCleanedSinceLast = currentPanelsCleaned - previousPanelsCleaned;

            // Ensure the calculated value is a valid number
            if (isNaN(panelsCleanedSinceLast)) {
                console.error('Calculated panels_cleaned is NaN');
                return;
            }

            console.log(`Panels cleaned since last reading: ${panelsCleanedSinceLast}`);
        } else {
            // If no previous data, insert the current value as the initial data
            console.log('No previous data found for this device, setting panels_cleaned to current value.');
        }

        // Step 2: Insert the new record into the database
        const insertQuery = `
            INSERT INTO robot_data (device_id, panels_cleaned, battery_discharge_cycle)
            VALUES ($1, $2, $3) RETURNING id;
        `;
        const values = [deviceId, panelsCleanedSinceLast, currentCh6];
        const insertRes = await pgClient.query(insertQuery, values);

        console.log('Data inserted with ID:', insertRes.rows[0].id);
    } catch (error) {
        console.error('Error processing message:', error);
    }
}

// Initialize MQTT client
const mqttClient = setupMQTTClient();
// In config.js or similar file


let weatherThresholds = {
    windSpeedThreshold: 0,
    humidityThreshold: 0,
    rainEnabled: false
};
// API Routes
let scheduledTasks = new Map();

// Scheduling endpoint
app.post('/api/schedule-downlink', async (req, res) => {
    const { groupIds, scheduleTime } = req.body;
    
    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
        return res.status(400).json({ error: 'Invalid groupIds provided' });
    }
    if (!scheduleTime) {
        return res.status(400).json({ error: 'Schedule time is required' });
    }

try {
    // Check weather conditions first
    const weather = await fetchWeatherData();
    const currentConfig = weatherThresholds;
      
    // If conditions are good, proceed with scheduling
    const scheduledMoment = moment(scheduleTime);
    if (scheduledMoment.isBefore(moment())) {
        scheduledMoment.add(1, 'day');
    }
    
    const taskId = uuidv4();
    const cronJob = cron.schedule(
        scheduledMoment.format('m H D M *'),
        async () => {
            try {
                 // If conditions aren't met, return error immediately
                 const updatedWeather = await fetchWeatherData();
                 const updatedWeatherCheck = checkWeatherConditions(
                     updatedWeather,
                     currentConfig.windSpeedThreshold,
                     currentConfig.humidityThreshold,
                     currentConfig.rainEnabled
                 );

                 // If the weather is no longer good, don't execute the task
                 if (!updatedWeatherCheck.valid) {
                     console.log(`Weather is not good at the scheduled time. Skipping downlink for task ${taskId}`);
                      const skipMessage = `Weather is not good at the scheduled time. Skipping downlink for task ${taskId}`

                      scheduledTasks.set(taskId, {
                    ...scheduledTasks.get(taskId),
                    status: 'skipped',
                    skipMessage: skipMessage
                });
                     return;
                 }

                await sendDataTOGroups(groupIds);
                console.log(`Downlink executed for task ${taskId} at ${moment()}`);
                scheduledTasks.delete(taskId);
            } catch (error) {
                console.error('Error executing scheduled downlink:', error);
            }
        }
    );
    
    scheduledTasks.set(taskId, {
        id: taskId,
        groupIds,
        scheduleTime: scheduledMoment.format(),
        status: 'scheduled',
        cronJob,
        createdAt: moment().format()
    });
    
    res.status(200).json({
        message: 'Downlink scheduled successfully',
        taskId,
        scheduledTime: scheduledMoment.format(),
        groupIds
    });
    
} catch (error) {
    console.error('Error in schedule-downlink:', error);
    res.status(500).json({ error: 'Failed to schedule downlink' });
}
});

// Add endpoint to get task status
app.get('/api/scheduled-tasks/:taskId', (req, res) => {
    const taskId = req.params.taskId;
    const task = scheduledTasks.get(taskId);
    
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({
        id: task.id,
        status: task.status,
        error: task.error,
        scheduleTime: task.scheduleTime
    });
});
app.post('/api/update-threshold', async (req, res) => {
    try {
        const { windSpeedThreshold, humidityThreshold, rainEnabled } = req.body;

        // Validate inputs
        if (typeof windSpeedThreshold !== 'number' || windSpeedThreshold < 0) {
            return res.status(400).json({ 
                error: 'Invalid wind speed threshold' 
            });
        }

        if (typeof humidityThreshold !== 'number' || 
            humidityThreshold < 0 || 
            humidityThreshold > 100) {
            return res.status(400).json({ 
                error: 'Invalid humidity threshold' 
            });
        }

        if (typeof rainEnabled !== 'boolean') {
            return res.status(400).json({ 
                error: 'Invalid rain enabled setting' 
            });
        }

        // Update thresholds
        weatherThresholds = {
            windSpeedThreshold,
            humidityThreshold,
            rainEnabled
        };

        // Log the update
        console.log('Updated weather thresholds:', weatherThresholds);

        res.status(200).json({
            message: 'Thresholds updated successfully',
            currentThresholds: weatherThresholds
        });

    } catch (error) {
        console.error('Error updating thresholds:', error);
        res.status(500).json({
            error: 'Failed to update thresholds',
            details: error.message
        });
    }
});


const fetchWeatherData = async () => {
    try {
        const response = await axios.get('http://localhost:5000/api/gateway');
        console.log(response.data.weather)
        return response.data.weather; // Assuming weather data is in this format
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        throw error;
    }
};

const checkWeatherConditions = (weather, windSpeedThreshold, humidityThreshold, rainEnabled) => {
    // First check for rain if rain detection is enabled
    if (rainEnabled && weather.rain > 0) {
        return { 
            valid: false, 
            message: `Operation disabled due to rain detection: ${weather.rain} mm` 
        };
    }
    
    // Check if the wind speed exceeds the threshold
    if (weather.windSpeed > windSpeedThreshold) {
        return { 
            valid: false, 
            message: `Wind speed exceeds the threshold: ${weather.windSpeed} m/s` 
        };
    }
    
    // Check if the humidity exceeds the threshold
    if (weather.humidity > humidityThreshold) {
        return { 
            valid: false, 
            message: `Humidity exceeds the threshold: ${weather.humidity}%` 
        };
    }

    return { valid: true };
};

// Get all scheduled tasks
app.get('/api/scheduled-tasks', (req, res) => {
    const tasks = Array.from(scheduledTasks.values()).map(task => ({
        id: task.id,
        groupIds: task.groupIds,
        scheduleTime: task.scheduleTime,
        status: task.status,
        createdAt: task.createdAt
    }));
    
    res.json({ tasks });
});

// Cancel a scheduled task
app.delete('/api/scheduled-Grouptasks/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = scheduledTasks.get(taskId);
    
    if (!task) {
        return res.status(404).json({ error: 'Scheduled task not found' });
    }

    // Stop the cron job
    task.cronJob.stop();
    // Remove from storage
    scheduledTasks.delete(taskId);

    res.json({
        message: 'Scheduled task cancelled successfully',
        taskId
    });
});

    
const sendDataTOGroups = async (groupIds) => {
    try {
        const promises = groupIds.map(groupId =>
            apiClient.post(`/api/multicast-groups/${groupId}/queue`, {
                queueItem: {
                    data: 'Ag==',
                    fCnt: 0,
                    fPort: 1,
                },
            })
        );
        await Promise.all(promises);
        console.log('Successfully sent downlink to the group:', groupIds);
    } catch (error) {
        console.error('Error sending downlink to groups:', error);
        throw error; // Add this line
    }
};
app.get('/api/get-errors', async (req, res) => {
    const errors = Array.from(deviceErrorData.values()).map(value => ({
        deviceEUI: value.deviceEUI,
        lastUpdate: value.lastUpdate,
        fault: value.fault,
        controlPannelName:value.Name
    }));
    console.log("this is the faulterror datatobedisplayed")
    console.log(errors)
    res.json(errors);
});

app.get('/api/devices/:deviceEUI/data', (req, res) => {
    const data = deviceData.get(req.params.deviceEUI);
    if (data) {
        res.json(data);
    } else {
        res.status(404).json({ error: 'No data found for device' });
    }
});

app.get('/api/multicast-groups', async (req, res) => {
    try {
        const response = await apiClient.get('/api/multicast-groups', {
            params: {
                limit: req.query.limit || 100,
                applicationId: APPLICATION_ID
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch multicast groups',
            details: error.response?.data
        });
    }
});

app.get('/api/devices', async (req, res) => {
    try {
        const devices = await fetchDevices();
        res.json({ result: devices });
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch devices',
            details: error.response?.data
        });
    }
});



app.post('/api/devices/:deviceId/queue', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const response = await apiClient.post(
            `/api/devices/${deviceId}/queue`,
            req.body
        );
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to toggle downlink for device',
            details: error.response?.data
        });
    }
});

app.post('/api/multicast-groups/:groupId/queue', async (req, res) => {
    try {
        const { groupId } = req.params;
        const response = await apiClient.post(
            `/api/multicast-groups/${groupId}/queue`,
            req.body
        );
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to toggle downlink',
            details: error.response?.data
        });
    }
});

app.get('/api/gateway', async (req, res) => {
    try {
        // Fetch gateway details
        const gatewayResponse = await apiClient.get(`/api/gateways/${GATEWAYS_ID}`);
        const gatewayData = gatewayResponse.data;

        // Extract latitude and longitude
        const { latitude, longitude } = gatewayData.gateway.location;

        if (latitude && longitude) {
            // Fetch weather details using a weather API (e.g., OpenWeatherMap)
            const weatherApiKey = '1b29179a8d70b1612449ed1bcddba70e'; // Hardcoded for testing
            const weatherResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
                params: {
                    lat: latitude,
                    lon: longitude,
                    appid: weatherApiKey,
                    units: 'metric'
                }
            });

            const weatherData = weatherResponse.data;
            // Add weather information to the response
            gatewayData.weather = {
                temperature: weatherData.main.temp,
                humidity: weatherData.main.humidity,
                windSpeed: weatherData.wind.speed,
                rain: weatherData.rain?.['1h'] || 0
            };
        } else {
            gatewayData.weather = { error: 'Invalid location data' };
        }
        res.json(gatewayData);
    } catch (error) {
        console.error("Detailed API Error:", {
            status: error.response?.status,
            details: error.response?.data || error.message
        });

        res.status(500).json({
            error: "Failed to fetch gateway or weather details",
            details: error.response?.data || error.message
        });
    }
});


app.get("/api/server",async(req,res)=>{
    try {
        const response=await apiClient.get('http://localhost:8080/')
        if (response.status === 200) {
            console.log("server is running successfully")
            res.status(200).json({
            message:"workingfine",
            time:Date.now()
            })
        }

      res.status(500).json({
            message:"Notworking"
      })
        
    } catch (error) {
        res.status(500).json({
            error:error.response.data||error.message
        })
    }

})

app.get('/api/allGateways',async(req,res)=>{
    try {
        const gatewayResponse = await apiClient.get(`api/gateways`,{
            params:{
                limit:20,
                tenantId:'52f14cd4-c6f1-4fbd-8f87-4025e1d49242'
            }
        });
        const gatewayData = gatewayResponse.data;

        res.status(200).json({
            message:"success",
            gatewayData
        })

    } catch (error) {
        res.status(500).json({
            error:"failed to fetch the gatways ",
            details:error.response?.data || error.message
        })
    }


})

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server, MQTT client, and PostgreSQL connection');
    mqttClient.end();
    pgClient.end(); // Close PostgreSQL connection
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

const PORT = 5000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    mqttClient.end();
    pgClient.end(); // Close PostgreSQL connection
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});