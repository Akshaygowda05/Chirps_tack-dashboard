const express = require('express');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Secure database connection using environment variables
const router = express.Router();
const pgPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'robot_data',
    user: 'postgres',
    password: '123789'
});

// Ensure downloads directory exists
const DOWNLOADS_DIR = path.join(__dirname, '../downloads');
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// Common function to generate reports
async function generateReport(reportType) {
    const periodMap = {
        'weekly': {
            trunc: 'week',
            interval: '1 week',
            startColumn: 'week_start'
        },
        'monthly': {
            trunc: 'month',
            interval: '1 month',
            startColumn: 'month_start'
        },
        'yearly': {
            trunc: 'year',
            interval: '1 year',
            startColumn: 'year_start'
        }
    };

    const period = periodMap[reportType];

    try {
        // Individual Devices Query
        const individualDevicesQuery = `
        WITH period_data AS (
            SELECT 
                device_id,
                SUM(panels_cleaned) AS total_panels_cleaned,
                AVG(battery_discharge_cycle) AS avg_battery_discharge,
                DATE_TRUNC('${period.trunc}', timestamp) AS ${period.startColumn}
            FROM 
                robot_data
            WHERE 
                timestamp >= DATE_TRUNC('${period.trunc}', CURRENT_DATE)
                AND timestamp < DATE_TRUNC('${period.trunc}', CURRENT_DATE + INTERVAL '${period.interval}')
            GROUP BY 
                device_id, ${period.startColumn}
        ) 
        SELECT 
            device_id,
            total_panels_cleaned,
            ROUND(avg_battery_discharge::numeric, 2) AS avg_battery_discharge,
            ${period.startColumn}
        FROM 
            period_data 
        ORDER BY 
            device_id;
        `;
        
        // Overall Summary Query
        const overallSummaryQuery = `
        WITH period_data AS (
            SELECT 
                device_id,
                SUM(panels_cleaned) AS total_panels_cleaned,
                AVG(battery_discharge_cycle) AS avg_battery_discharge,
                DATE_TRUNC('${period.trunc}', timestamp) AS ${period.startColumn}
            FROM 
                robot_data
            WHERE 
                timestamp >= DATE_TRUNC('${period.trunc}', CURRENT_DATE)
                AND timestamp < DATE_TRUNC('${period.trunc}', CURRENT_DATE + INTERVAL '${period.interval}')
            GROUP BY 
                device_id, ${period.startColumn}
        )
        SELECT 
            COUNT(DISTINCT device_id) AS total_robots,
            SUM(total_panels_cleaned) AS overall_total_panels_cleaned,
            ROUND(AVG(avg_battery_discharge)::numeric, 2) AS overall_avg_battery_discharge
        FROM 
            period_data;
        `;

        // Execute queries
        const [individualDevicesResult, overallSummaryResult] = await Promise.all([
            pgPool.query(individualDevicesQuery),
            pgPool.query(overallSummaryQuery)
        ]);

        // Prepare CSV for download
        const csvPath = path.join(DOWNLOADS_DIR, `${reportType}_report.csv`);
        const csvWriter = createCsvWriter({
            path: csvPath,
            header: [
                {id: 'device_id', title: 'Device ID'},
                {id: 'total_panels_cleaned', title: 'Total Panels Cleaned'},
                {id: 'avg_battery_discharge', title: 'Avg Battery Discharge'},
                {id: `${period.startColumn}`, title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Start`}
            ]
        });

        // Write individual device data to CSV
        await csvWriter.writeRecords(individualDevicesResult.rows);

        return {
            individualDevices: individualDevicesResult.rows,
            overallSummary: overallSummaryResult.rows[0],
            downloadPath: `/downloads/${reportType}_report.csv`
        };

    } catch (error) {
        console.error(`Error generating ${reportType} report:`, error);
        throw error;
    }
}

// Report Routes
router.get('/weekly-report', async (req, res) => {
    try {
        const reportData = await generateReport('weekly');
        res.json(reportData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate weekly report' });
    }
});

router.get('/monthly-report', async (req, res) => {
    try {
        const reportData = await generateReport('monthly');
        res.json(reportData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate monthly report' });
    }
});

router.get('/yearly-report', async (req, res) => {
    try {
        const reportData = await generateReport('yearly');
        res.json(reportData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate yearly report' });
    }
});

router.get('/robot-performance/last-7-days', async (req, res) => {
    try {
        const query = `
            WITH daily_performance AS (
                SELECT 
                    DATE_TRUNC('day', timestamp) AS performance_date,
                    SUM(panels_cleaned) AS total_panels_cleaned,
                    AVG(battery_discharge_cycle) AS avg_battery_discharge
                FROM 
                    robot_data
                WHERE 
                    timestamp >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY 
                    performance_date
                ORDER BY 
                    performance_date
            )
            SELECT 
                TO_CHAR(performance_date, 'YYYY-MM-DD') AS date,
                total_panels_cleaned,
                ROUND(avg_battery_discharge::numeric, 2) AS avg_battery_discharge
            FROM 
                daily_performance
            ORDER BY 
                performance_date;
        `;

        const result = await pgPool.query(query);

        // Transform the result into a format suitable for Recharts
        const chartData = result.rows.map(row => ({
            date: row.date,
            total_panels_cleaned: parseInt(row.total_panels_cleaned) || 0,
            avg_battery_discharge: parseFloat(row.avg_battery_discharge) || 0
        }));

        res.json(chartData);
    } catch (error) {
        console.error('Error fetching robot performance:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve performance data',
            details: error.message 
        });
    }
});

// Download Routes
router.get('/download-report/:type', (req, res) => {
    const reportType = req.params.type;
    const validTypes = ['weekly', 'monthly', 'yearly'];

    if (!validTypes.includes(reportType)) {
        return res.status(400).send('Invalid report type');
    }

    const csvPath = path.join(DOWNLOADS_DIR, `${reportType}_report.csv`);
    
    // Check if the file exists before attempting to download
    if (fs.existsSync(csvPath)) {
        res.download(csvPath, `${reportType}_report.csv`, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send('Could not download the file');
            }
        });
    } else {
        console.error('File not found:', csvPath);
        res.status(404).send('Report file not found');
    }
});

module.exports = router;
