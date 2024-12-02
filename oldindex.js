const express = require('express');
const app = express();
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://192.168.86.31:1883", {
    keepalive: 60  // keeps the connection alive
});

client.on("connect", () => {
    console.log("Connected to MQTT broker");

    client.subscribe("tinytron", (err) => {
        if (err) {
            console.log("Subscription error: ", err);
        } else {
            console.log("Subscribed to topic 'tinytron'");
            client.publish("presence", "Hello mqtt");
        }
    });

    setInterval(() => {
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS format
        console.log(`Sending message at ${timeString}`);
        
        client.publish("tinytron", JSON.stringify({
            "data": [
                
            ]
        }), { qos: 1 }, (err) => {
            if (err) {
                console.log("Error publishing message: ", err);
            }
        });
    }, 10000);
});

client.on("message", (topic, message) => {
    // message is Buffer
    console.log(`Received message on topic ${topic}: ${message.toString()}`);
});

client.on('error', (err) => {
    console.log('MQTT Error: ', err);
});

client.on('close', () => {
    console.log('MQTT connection closed unexpectedly');
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
