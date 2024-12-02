import express from 'express';
import { ModeService } from './services/modeService.js';  // Correct import path
import { MqttService } from './services/mqttService.js';  // Make sure this is imported correctly

const app = express();
const mqttService = new MqttService();  // Create the MQTT service instance

// Create the ModeService instance
const modeService = new ModeService(mqttService);  

// Example route to switch modes (this could be done via any event, such as an HTTP request)
app.get('/switch_mode/:mode', (req, res) => {
    const modeName = req.params.mode;
    modeService.switchMode(modeName);  // Switch the mode using the method
    res.send(`Switched to mode: ${modeName}`);
});

// Start the Express server
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});

// Example of switching to different modes
// You can use any logic to switch modes, like an HTTP request or MQTT message
// For example: `http://localhost:3000/switch-mode/mode2` would switch to mode2
