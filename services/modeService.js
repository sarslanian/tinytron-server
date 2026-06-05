// services/modeService.js
import fetch from 'node-fetch';  // Assuming you're using ESM
import { Mode } from '../mode.js'; // Adjust the path if needed

import { generateCTA } from '../gennies/cta.js';
import { dashboard } from '../applications/dashboard.js';
import { nfl } from '../applications/nfl.js';
import { stocks } from '../applications/stocks.js';
import { mlb } from '../applications/mlb.js';

const MODES = {
    NFL: 'mode1',
    DASHBOARD: 'mode2',
    CLOCK: 'mode3',
    STOCKS: 'mode4',
    MLB: 'mode5',
};

export { MODES };

export class ModeService {
    constructor(mqttService) {
        this.mqttService = mqttService; // Inject MQTT service into the ModeService constructor

        // Define modes with their respective frequencies and data generation logic
        this.modes = {
            [MODES.NFL]: new Mode(MODES.NFL, 2000, async () => {
                try {
                  return nfl(); // Return the generated NFL data
                } catch (error) {
                    console.error('Error fetching NFL data:', error);
                    return { type: "text", text: "Error", x: 10, y: 10, color: "0xFF0000" };
                }
            }),

            [MODES.DASHBOARD]: new Mode(MODES.DASHBOARD, 5000, async () => {
                try {
                    return dashboard(); // Return the generated dashboard data
                } catch (error) {
                    console.error('Error fetching dashboard data:', error);
                    return { type: "text", text: "Error", x: 10, y: 10, color: "0xFF0000" };
                }
            }),

            [MODES.CLOCK]: new Mode(MODES.CLOCK, 5000, () => {
                const now = new Date();
                const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS format
                return { type: "text", text: timeString, x: 10, y: 10, color: "0xFFCC00" };
            }),

            [MODES.STOCKS]: new Mode(MODES.STOCKS, 5000, async () => {
                try {
                    return stocks(['AAPL']); // Start with Apple stock
                } catch (error) {
                    console.error('Error fetching stock data:', error);
                    return [{ type: "text", text: "Error", x: 10, y: 10, color: "0xFF0000" }];
                }
            }),

            [MODES.MLB]: new Mode(MODES.MLB, 2000, async () => {
                try {
                    return mlb();
                } catch (error) {
                    console.error('Error fetching MLB data:', error);
                    return [{ type: "text", text: "Error", x: 10, y: 10, color: "0xFF0000" }];
                }
            }),
        };

        this.currentMode = null; // Default mode
        this.publishInterval = null;  // Interval for sending messages

        // Set the default mode on load
        this.switchMode(MODES.NFL);
    }

    // Switch modes and send an immediate message
    async switchMode(modeName) {
        if (this.modes[modeName]) {
            this.currentMode = this.modes[modeName];
            console.log(`Switched to mode: ${modeName}`);

            // Immediately publish a message after switching modes
            await this.publishMessage();

            // If there's an existing interval, clear it first
            if (this.publishInterval) {
                clearInterval(this.publishInterval);
            }

            // Start the new interval for sending messages at the frequency of the new mode
            this.publishInterval = setInterval(() => {
                // Wrap in promise handler to catch any unhandled rejections
                this.publishMessage().catch(error => {
                    console.error('Error in publishMessage interval:', error);
                });
            }, this.currentMode.frequency);
        } else {
            console.log(`Invalid mode: ${modeName}`);
        }
    }

    // Publish a message based on the current mode's data
    async publishMessage() {
        try {
            const data = await this.currentMode.getData();
            console.log(`Publishing data: ${JSON.stringify(data)}`);
            this.mqttService.publish("tinytron", JSON.stringify({ data: data }));
        } catch (error) {
            console.error('Error in publishMessage:', error);
            // Publish error message instead of crashing
            const errorPayload = [{ type: "text", text: "Error", x: 10, y: 10, color: "0xFF0000" }];
            this.mqttService.publish("tinytron", JSON.stringify({ data: errorPayload }));
        }
    }

    // Get the current mode
    getCurrentMode() {
        return this.currentMode;
    }
}
