import express from 'express';
import { ModeService, MODES } from './services/modeService.js';  // Correct import path
import { MqttService } from './services/mqttService.js';  // Make sure this is imported correctly

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit, just log the error
});

const app = express();
const mqttService = new MqttService("mqtt://mosquitto:1883");  // Create the MQTT service instance

// Create the ModeService instance
const modeService = new ModeService(mqttService);  

// Route to switch modes
app.get('/switch_mode/:mode', (req, res) => {
    const modeName = req.params.mode;
    const validModes = Object.values(MODES);
    if (!validModes.includes(modeName)) {
        return res.status(400).json({ error: `Unknown mode: ${modeName}` });
    }
    modeService.switchMode(modeName);
    res.json({ mode: modeName });
});

// Start the Express server
app.listen(3000, "0.0.0.0", () => {
    console.log('Server listening on port 3000');
});

// Example of switching to different modes
// You can use any logic to switch modes, like an HTTP request or MQTT message
// For example: `http://localhost:3000/switch-mode/mode2` would switch to mode2
