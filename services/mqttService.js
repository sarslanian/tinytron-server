// mqttService.js
import mqtt from 'mqtt';

export class MqttService {
    constructor(brokerUrl) {
        this.client = mqtt.connect(brokerUrl, { keepalive: 60 });
        this.isConnected = false;
        this.publishQueue = [];

        this.client.on('connect', () => {
            this.isConnected = true;
            console.log('MQTT connected, flushing queue:', this.publishQueue.length, 'messages');
            while (this.publishQueue.length > 0) {
                const [topic, message] = this.publishQueue.shift();
                this.client.publish(topic, message);
            }
        });

        this.client.on('error', (err) => {
            console.error('MQTT error:', err);
            this.isConnected = false;
        });

        this.client.on('close', () => {
            console.log('MQTT connection closed');
            this.isConnected = false;
        });

        this.client.on('reconnect', () => {
            console.log('MQTT reconnecting...');
        });
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) return resolve();

            this.client.once('connect', resolve);
            this.client.once('error', reject);
        });
    }

    subscribe(topic) {
        return new Promise((resolve, reject) => {
            this.client.subscribe(topic, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Subscribed to topic '${topic}'`);
                    resolve();
                }
            });
        });
    }

    publish(topic, message) {
        console.log(`Publishing to topic ${topic}: ${message}`);
        if (this.isConnected) {
            this.client.publish(topic, message, { qos: 1 }, (err) => {
                if (err) {
                    console.log("Error publishing message: ", err);
                } else {
                    console.log(`Message sent to topic ${topic}`);
                }
            });
        } else {
            console.warn('MQTT not connected, queuing message');
            this.publishQueue.push([topic, message]);
        }
    }

    publishError(context, error) {
        const payload = JSON.stringify({
            context,
            error: error.message || String(error),
            timestamp: new Date().toISOString(),
        });
        this.publish('tinytron/errors', payload);
        console.error(`[${context}]`, error);
    }

    onMessage(callback) {
        this.client.on("message", (topic, message) => {
            callback(topic, message.toString());
        });
    }
}
