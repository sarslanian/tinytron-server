import express from 'express';
import { ModeService, MODES } from './services/modeService.js';  // Correct import path
import { MqttService } from './services/mqttService.js';  // Make sure this is imported correctly
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MLB_TEAMS_CONFIG = path.join(__dirname, 'config/mlb-teams.json');

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
const mqttService = new MqttService("mqtt://mosquitto:1883");  // Create the MQTT service instance

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

app.get('/mlb/teams', async (req, res) => {
    try {
        const raw = await readFile(MLB_TEAMS_CONFIG, 'utf8');
        res.json(JSON.parse(raw));
    } catch {
        res.json({ teams: [] });
    }
});

app.post('/mlb/teams', async (req, res) => {
    try {
        const { teams } = req.body;
        if (!Array.isArray(teams)) {
            return res.status(400).json({ error: 'teams must be an array' });
        }
        const payload = JSON.stringify({ teams });
        await writeFile(MLB_TEAMS_CONFIG, payload, 'utf8');
        res.json({ ok: true, teams });
    } catch (err) {
        console.error('Error saving MLB teams config:', err);
        res.status(500).json({ error: 'Failed to save config' });
    }
});

// Start the Express server
app.listen(3000, "0.0.0.0", () => {
    console.log('Server listening on port 3000');
});

// Example of switching to different modes
// You can use any logic to switch modes, like an HTTP request or MQTT message
// For example: `http://localhost:3000/switch-mode/mode2` would switch to mode2
