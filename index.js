import express from 'express';
import { ModeService, MODES } from './services/modeService.js';  // Correct import path
import { MqttService } from './services/mqttService.js';  // Make sure this is imported correctly
import { getTeamFilter, setTeamFilter } from './services/mlbConfig.js';

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
app.use(express.json());
const mqttService = new MqttService(process.env.MQTT_URL || "mqtt://mosquitto:1883");

// Create the ModeService instance
const modeService = new ModeService(mqttService);  

// Route to get current mode
app.get('/current_mode', (req, res) => {
    const current = modeService.getCurrentMode();
    res.json({ mode: current ? current.name : null });
});

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

// ── MLB team filter routes ────────────────────────────────────────────────────

app.get('/mlb/teams', (req, res) => {
    res.json({ teams: getTeamFilter() });
});

app.post('/mlb/teams', (req, res) => {
    const { teams } = req.body;
    if (!Array.isArray(teams)) {
        return res.status(400).json({ error: 'teams must be an array' });
    }
    try {
        setTeamFilter(teams);
        res.json({ ok: true, teams });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Start the Express server
app.listen(3000, "0.0.0.0", () => {
    console.log('Server listening on port 3000');
});

// Example of switching to different modes
// You can use any logic to switch modes, like an HTTP request or MQTT message
// For example: `http://localhost:3000/switch-mode/mode2` would switch to mode2
