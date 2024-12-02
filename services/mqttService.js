// mqttService.js
import mqtt from 'mqtt';

export class MqttService {
    constructor(brokerUrl) {
        this.client = mqtt.connect(brokerUrl, { keepalive: 60 });
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.client.on("connect", () => {
                console.log("Connected to MQTT broker");
                resolve();
            });

            this.client.on('error', (err) => {
                console.log('MQTT Error: ', err);
                reject(err);
            });

            this.client.on('close', () => {
                console.log('MQTT connection closed unexpectedly');
            });
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
        this.client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) {
                console.log("Error publishing message: ", err);
            } else {
                console.log(`Message sent to topic ${topic}`);
            }
        });
    }

    onMessage(callback) {
        this.client.on("message", (topic, message) => {
            callback(topic, message.toString());
        });
    }
}

