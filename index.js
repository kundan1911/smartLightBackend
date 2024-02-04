const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');


const port = 5002;
const devId='MASW0100001AA121'

const mqttBrokerUrl = 'mqtt://192.168.0.100:1883'; // Replace with your MQTT broker URL
const mqttTopic = '/device/MASW0100001AA121/status'; // Replace with your desired MQTT topic
const mqttClient = mqtt.connect(mqttBrokerUrl)

const app = express();
app.use(cors());
// app.use(express.json());
// Middleware to parse JSON in the request body
app.use(bodyParser.json());



mongoose.connect('mongodb+srv://admin-kundan:Kundan%4019@cluster0.0qyqn.mongodb.net/smartLightDB?retryWrites=true&w=majority');
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});

// Create an HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log(' WebSocket Client connected');

  // Handle messages from the WebSocket client if needed

  // Close the WebSocket connection when the client disconnects
  ws.on('close', () => {
    console.log('WebSocket Client disconnected');
  });
});

// MQTT subscription handler
mqttClient.on('connect', () => {
    const mqttTopi='/device/'+devId+'/bleDeviceInfo';
    mqttClient.subscribe(mqttTopi, (err) => {
      if (err) {
        console.error('Error subscribing to MQTT topic:', err);
      }
      console.log(`Subscribed to MQTT topic: ${mqttTopi}`);
    });
  });
  

  mqttClient.on('message', (topic, message) => {
    // When a new message is received on the subscribed topic
    const mqttTopi='/device/'+devId+'/bleDeviceInfo';
    if (topic === mqttTopi) {
      const data = JSON.parse(message.toString());
        console.log(data);
      // Broadcast the data to all connected WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
  
      // You can also handle the data in other ways, e.g., send a notification to the frontend
      // or update the state of your React components.
    }
  });

  


// Route to save post data
app.post('/setUpVal', async (req, res) => {
    try {
      // Extract data from the request body
      const { intensity, temperature } = req.body;
      console.log(req.body)
      
    //   console.log("intensity="+intensity,"tempeature="+tempeature)
    mqttClient.publish(mqttTopic, JSON.stringify({ intensity, temperature }), (err) => {
        if (err) {
          console.error('Error publishing to MQTT:', err);
          return res.status(500).send('Error publishing to MQTT');
        }
    
        console.log('Published to MQTT successfully');
       
      });  
      res.status(201).json({ message: 'Post data saved successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  
app.get("/", (req, res) => {
    res.send("I will be shown on the Browser");
    console.log("I will be shown on the Terminal");
});


// Close the MQTT connection when the server is shut down
process.on('SIGINT', () => {
  mqttClient.end();
  process.exit();
});

app.listen(port, () => {
    console.log(`Listening for API Calls`);
  });


