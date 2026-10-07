// services/modeService.js
import fetch from 'node-fetch';  // Assuming you're using ESM
import { Mode } from '../mode.js'; // Adjust the path if needed

import { generateCTA } from '../gennies/cta.js';
import { clock } from '../gennies/clock.js';
import { dashboard } from '../applications/dashboard.js';
import { nfl } from '../applications/nfl.js';
import { stocks } from '../applications/stocks.js';
import { mlb } from '../applications/mlb.js';
import { textMode } from '../applications/text.js';
import { train } from '../applications/train.js';
import { cfb } from '../applications/cfb.js';

const MODES = {
    NFL: 'mode1',
    DASHBOARD: 'mode2',
    CLOCK: 'mode3',
    STOCKS: 'mode4',
    MLB: 'mode5',
    TEXT: 'mode6',
    TRAIN: 'mode7',
    CFB: 'mode8',
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
                    return { t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" };
                }
            }),

            [MODES.DASHBOARD]: new Mode(MODES.DASHBOARD, 5000, async () => {
                try {
                    return dashboard(); // Return the generated dashboard data
                } catch (error) {
                    console.error('Error fetching dashboard data:', error);
                    return { t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" };
                }
            }),

            [MODES.CLOCK]: new Mode(MODES.CLOCK, 1000, () => {
                try {
                    return clock(); // centered HH:MM + date (array of elements)
                } catch (error) {
                    console.error('Error generating clock:', error);
                    return [{ t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" }];
                }
            }),

            [MODES.STOCKS]: new Mode(MODES.STOCKS, 5000, async () => {
                try {
                    return stocks(['AAPL']); // Start with Apple stock
                } catch (error) {
                    console.error('Error fetching stock data:', error);
                    return [{ t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" }];
                }
            }),

            [MODES.MLB]: new Mode(MODES.MLB, 3500, async () => {
                try {
                    return mlb();
                } catch (error) {
                    console.error('Error fetching MLB data:', error);
                    return [{ t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" }];
                }
            }),

            [MODES.TEXT]: new Mode(MODES.TEXT, 3000, () => {
                try {
                    return textMode();
                } catch (error) {
                    console.error('Error in text mode:', error);
                    return [{ t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" }];
                }
            }),

            [MODES.TRAIN]: new Mode(MODES.TRAIN, 30000, async () => {
                try {
                    return train();
                } catch (error) {
                    console.error('Error in train mode:', error);
                    return [{ t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" }];
                }
            }),

            [MODES.CFB]: new Mode(MODES.CFB, 3500, async () => {
                try {
                    return cfb();
                } catch (error) {
                    console.error('Error fetching CFB data:', error);
                    return [{ t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" }];
                }
            }),
        };

        this.currentMode = null; // Default mode
        this.publishInterval = null;  // Interval for sending messages
        this.lastPublished = null;  // Last payload sent, for dedupe

        // Set the default mode on load
        this.switchMode(MODES.CLOCK);
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
            const message = JSON.stringify({ data: data });
            // Skip unchanged payloads — every byte over the ESP32SPI link is a
            // corruption opportunity; the retained message covers reconnects
            if (message === this.lastPublished) return;
            this.lastPublished = message;
            this.mqttService.publish("tinytron", message, true);
        } catch (error) {
            console.error('Error in publishMessage:', error);
            // Publish error message instead of crashing
            const errorMessage = JSON.stringify({ data: [{ t: 't', v: "Error", x: 10, y: 10, c: "0xFF0000" }] });
            if (errorMessage === this.lastPublished) return;
            this.lastPublished = errorMessage;
            this.mqttService.publish("tinytron", errorMessage, true);
        }
    }

    // Get the current mode
    getCurrentMode() {
        return this.currentMode;
    }
}
