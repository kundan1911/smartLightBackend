import express from "express";
import bodyParser from "body-parser";
import mqtt from "mqtt";
import http from "http";
import WebSocket from "ws";
import cors from "cors";
import dbConnect from "./db/connectDb.js";
import controlModel from "./models/schema.js";

const port = 5002;
const devId = "MASW0100001AA121";

const mqttBrokerUrl = "mqtt://192.168.216.191:1883"; // Replace with your MQTT broker URL
const mqttTopic = "/device/MASW0100001AA121/status"; // Replace with your desired MQTT topic
const mqttClient = mqtt.connect(mqttBrokerUrl);

const app = express();
app.use(cors());
// app.use(express.json());
// Middleware to parse JSON in the request body
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Maintain a set of connected WebSocket clients
const connectedClients = new Set();

dbConnect();

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Add the WebSocket connection to the set
  connectedClients.add(ws);

  // Handle WebSocket messages from the client if needed
//   ws.send(
//     JSON.stringify({
//       alertType: "promptNumber",
//       message: "Hello from the server!",
//     })
//   );
  // Close the WebSocket connection when the client disconnects
  ws.on("close", () => {
    console.log("Client disconnected");
    // Remove the WebSocket connection from the set
    connectedClients.delete(ws);
  });
});

// MQTT subscription handler
mqttClient.on("connect", () => {
  const mqttTopi = "/device/" + devId + "/bleDeviceInfo";
  mqttClient.subscribe(mqttTopi, (err) => {
    if (err) {
      console.error("Error subscribing to MQTT topic:", err);
    }
    console.log(`Subscribed to MQTT topic: ${mqttTopi}`);
  });

  const mqttTopist = "/device/" + devId + "/status";
  mqttClient.subscribe(mqttTopist, (err) => {
    if (err) {
      console.error("Error subscribing to MQTT topic:", err);
    }
    console.log(`Subscribed to MQTT topic: ${mqttTopist}`);
  });
});

var unprovDevData;
mqttClient.on("message", (topic, message) => {
  // When a new message is received on the subscribed topic
  const mqttTopi = "/device/" + devId + "/bleDeviceInfo";
  const mqttTopist = "/device/" + devId + "/status";
  if (topic === mqttTopi) {
    const data = JSON.parse(message.toString());
    if (!data.hasOwnProperty("unicastAddr") || data.unicastAddr === 0) {
      console.log(data);
      unprovDevData = data;

      // Send the notification to all connected WebSocket clients
      connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              alertType: "promptNumber",
              message: JSON.stringify(data),
            })
          );
        }
      });
    }
  } else if (topic === mqttTopist) {
    const data = message.toString().trim();
    console.log(data);
    // Send the notification to all connected WebSocket clients
    if(data==='online'){
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            alertType: "masterOnline",
            message:data,
          })
        );
      }
    });
  }else{
    connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              alertType: "masterOnline",
              message: data,
            })
          );
        }
      });
  }
}
});

app.get("/checkProvOnline", async (req, res) => {});

// var prevfirTemp=30;
var prevfirIntensity=30;
// var prevsecTemp=30;
var prevsecIntensity=30;
function mapValueToRange(value, inputMin, inputMax, outputMin, outputMax) {
    return ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
  }
// Route to save post data
app.post("/setUpVal", async (req, res) => {
  try {
    // Extract data from the request body
    const { intensity, temperature , controlType} = req.body;

    var cmdObj={type:1};
    if(controlType==0){cmdObj.port=22
        if(prevfirIntensity!=intensity){
            cmdObj.state=intensity;
        }
        else{
            cmdObj.colorTemperature=mapValueToRange(temperature, 0, 100, 0, 400);
        }
    
    
    }
    else if(controlType==1){cmdObj.port=18
        if(prevsecIntensity!=intensity){
            cmdObj.state=intensity;
        }
        else{
            cmdObj.colorTemperature=mapValueToRange(temperature, 0, 100, 0, 400);
        }
    }
    else{
        cmdObj.port=65535
        cmdObj.state=intensity;
    }
    console.log(req.body);
    
    console.log(cmdObj);
    //   console.log("intensity="+intensity,"tempeature="+tempeature)
    mqttClient.publish(
        "/device/MASW0100001AA121/command" ,
      JSON.stringify(cmdObj),
      (err) => {
        if (err) {
          console.error("Error publishing to MQTT:", err);
          return res.status(500).send("Error publishing to MQTT");
        }

        console.log("Published to MQTT successfully");

        if(controlType===0)
        prevfirIntensity =intensity;
    else 
    prevsecIntensity=intensity
        // prevTemp=temperature;
      }
    );
    res.status(201).json({ message: "Post data saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/setUnicast", async (req, res) => {
  try {
    // Extract data from the request body
    const { unicastAddr } = req.body;
    // Create a new object with the desired changes
    console.log(req.body);
    const modifiedObject = {
      type: 40,
      ...unprovDevData,
      unicastAddr: unicastAddr, // Replace with your desired integer value
    };

   
    // Remove the 'infotype' property from the new object
    delete modifiedObject.infoType;
    console.log(modifiedObject);
    const mqttTopic = "/device/MASW0100001AA121/command";
    mqttClient.publish(mqttTopic, JSON.stringify(modifiedObject), (err) => {
      if (err) {
        console.error("Error publishing to MQTT:", err);
        return res.status(500).send("Error publishing to MQTT");
      }
      console.log("Published to MQTT successfully");
    });


    const collectionSize = await controlModel.countDocuments();
    // Use the collection size as the index for the new document
    const newIndex = collectionSize;

    // Add the new document to the collection with the calculated index
    const result = new controlModel({unicastAddr:unicastAddr,roomId:0, controlId: newIndex });
    result.save();
    console.log(`Document inserted with index: ${newIndex}`);

    setTimeout(() => {
        console.log('This line will be processed after a delay of 8 seconds');
        // Place the code you want to execute after the delay here
      }, 8000);
    // Send the notification to all connected WebSocket clients
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            alertType: "success",
            message: "Unicast Address Assigned",
          })
        );
      }
    });
  } catch (error) {
    console.error(error);
  }
});

app.get("/getUnicast/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Model.findById(id);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/", (req, res) => {
  res.send("I will be shown on the Browser");
  console.log("I will be shown on the Terminal");
});

// Close the MQTT connection when the server is shut down
process.on("SIGINT", () => {
  mqttClient.end();
  process.exit();
});

server.listen(port, () => {
  console.log(`Listening for API Calls on ${port}`);
});
