// services/modeService.js
import fetch from 'node-fetch';  // Assuming you're using ESM
import { Mode } from '../mode.js'; // Adjust the path if needed
import dotenv from 'dotenv';

import { generateCTA } from '../gennies/cta.js';
import {dashboard} from '../applications/dashboard.js';

export class ModeService {
    constructor(mqttService) {
        this.mqttService = mqttService; // Inject MQTT service into the ModeService constructor

        // Define modes with their respective frequencies and data generation logic
        this.modes = {
            mode1: new Mode("mode1", 50000, async () => {
                try {
                    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=41.89536&longitude=13.41&current=temperature_2m,apparent_temperature&temperature_unit=fahrenheit&wind_speed_unit=mph`);
                    const data = await response.json();

                    return { type: "text", text: `Temp: ${data.current.temperature_2m}°F`, x: 10, y: 10, color: "0x00FF00" };
                } catch (error) {
                    console.error('Error fetching weather data:', error);
                    return { type: "text", text: "Error", x: 10, y: 10, color: "0xFF0000" };
                }
            }),

            mode2: new Mode("mode2", 5000, async () => {
                try {
                    return dashboard(); // Return the generated CTA data
                } catch (error) {
                    console.error('Error fetching CTA data:', error);
                    return { type: "text", text: "Error", x: 10, y: 10, color: "0xFF0000" };
                }
            }),

            mode3: new Mode("mode3", 5000, () => {
                const now = new Date();
                const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS format
                return { type: "text", text: timeString, x: 10, y: 10, color: "0xFFCC00" };
            })
        };

        this.currentMode = null; // Default mode
        this.publishInterval = null;  // Interval for sending messages

        // Set the default mode on load
        this.switchMode('mode2');
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
                this.publishMessage();
            }, this.currentMode.frequency);
        } else {
            console.log(`Invalid mode: ${modeName}`);
        }
    }

    // Publish a message based on the current mode's data
    async publishMessage() {
        const data = await this.currentMode.getData();
        console.log(`Publishing data: ${JSON.stringify(data)}`);
        this.mqttService.publish("tinytron", JSON.stringify({ data: data }));
    }

    // Get the current mode
    getCurrentMode() {
        return this.currentMode;
    }
}
