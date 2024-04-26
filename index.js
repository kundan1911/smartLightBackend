import express from "express";
import bodyParser from "body-parser";
import mqtt from "mqtt";
import http from "http";
import WebSocket from "ws";
import cors from "cors";
import dbConnect from "./db/connectDb.js";
import {roomModel, lightModel, controlModel,userModel} from "./models/schema.js"
import dotenv from 'dotenv';
dotenv.config();

const port = 5002;
const devId = "MASW0100001AA121";

const mqttBrokerUrl = "mqtt://192.168.0.100:1883"; // Replace with your MQTT broker URL
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
var Type
mqttClient.on("message", (topic, message) => {
  // When a new message is received on the subscribed topic
  const mqttTopi = "/device/" + devId + "/bleDeviceInfo";
  const mqttTopist = "/device/" + devId + "/status";
  if (topic === mqttTopi) {
    const data = JSON.parse(message.toString());
    console.log(data.unicastAddr);
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

    if(data.hasOwnProperty("devKey") && data.hasOwnProperty("unicastAddr")){
      connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              alertType: "success",
              message: "Unicast Address Assigned",
              unicastAddr:data.unicastAddr,
              Type:Type
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
var prevfirIntensity=30;
var prevsecIntensity=30;
function mapValueToRange(value, inputMin, inputMax, outputMin, outputMax) {
    return ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
  }
// Route to save post data
app.post("/setUpVal", async (req, res) => {
  try {
    // Extract data from the request body
    // console.log(req.body);
    const { unicastAddr } = req.body;
    var cmdObj={type:1};
    if(req.body.temperature!=undefined){
      const {temperature}=req.body;
      cmdObj.port=parseInt(unicastAddr)
      cmdObj.colorTemperature=mapValueToRange(temperature, 0, 100, 0, 400);
    }

    else {
      const {intensity}=req.body;
      cmdObj.port=parseInt(unicastAddr)
      cmdObj.state=mapValueToRange(intensity, 0, 100, 0, 60);
    }
    // var cmdObj={type:1};
    // if(controlType==0){
    //     if(prevfirIntensity!=intensity){
    //         cmdObj.state=intensity;
    //     }
    //     else{
    //         cmdObj.colorTemperature=mapValueToRange(temperature, 0, 100, 0, 400);
    //     }
    
    
    // }
    // else if(controlType==1){
    //     if(prevsecIntensity!=intensity){
    //         cmdObj.state=intensity;
    //     }
    //     else{
    //         cmdObj.colorTemperature=mapValueToRange(temperature, 0, 100, 0, 400);
    //     }
    // }
    // else{
    //     cmdObj.port=65535
    //     cmdObj.state=intensity;
    // }
   
    
      console.log(cmdObj)
      mqttClient.publish(
        "/device/MASW0100001AA121/command" ,
      JSON.stringify(cmdObj),
      (err) => {
        if (err) {
          console.error("Error publishing to MQTT:", err);
          return res.status(500).send("Error publishing to MQTT");
        }

    //     console.log("Published to MQTT successfully");

    //     if(controlType===0)
    //     prevfirIntensity =intensity;
    // else 
    // prevsecIntensity=intensity
    //     // prevTemp=temperature;
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
    const {  roomId ,userEmail,type } = req.body;
    // Create a new object with the desired changes
    console.log(req.body);
    // Find the user by email
    let user = await userModel.findOne({ email: userEmail });

    // If user doesn't exist, create a new user
    if (!user) {
      user = new userModel({ email: userEmail });
      await user.save();
    }
    const lastLight = await lightModel.findOne({}).sort({ unicastAddr: -1 }).limit(1);
const lastControl = await controlModel.findOne({}).sort({ controlId: -1 }).limit(1);

let unicastAddr = 6;

if (lastLight && lastLight.unicastAddr) {
  unicastAddr = Math.max(unicastAddr, lastLight.unicastAddr);
}

if (lastControl && lastControl.controlId) {
  unicastAddr = Math.max(unicastAddr, lastControl.controlId);
}

unicastAddr += 4;

console.log("unicastaddr",unicastAddr)
    

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

    Type=type
if(type==='1'){
  
    // Add the new document to the collection with the calculated index
    const result = new lightModel({ userId: user._id , roomId:roomId,unicastAddr:unicastAddr });
    result.save();
}
else{
  const result = new controlModel({ userId: user._id , roomId:roomId,controlId:unicastAddr });
    result.save();
}
//     setTimeout(() => {
//         console.log('This line will be processed after a delay of 8 seconds');
//         // Place the code you want to execute after the delay here
// // Send the notification to all connected WebSocket clients

        
//       }, 8000);
    
  } catch (error) {
    console.error(error);
  }
});


app.post("/removeLightNode", async (req, res) => {
  try {
    const { lightId } = req.body;
    console.log("Received request to remove light with ID:", lightId);

    const result = await lightModel.findByIdAndDelete(lightId);
    if (result) {
      console.log("Deleted light:", result);
      res.status(200).json({ message: "Light node removed successfully" });
    } else {
      console.log("Light not found with ID:", lightId);
      res.status(404).json({ error: "Light not found" });
    }
  } catch (error) {
    console.error("Error removing light node:", error);
    res.status(500).json({ error: "Failed to remove light node" });
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

app.post('/addRoom', async (req, res) => {
  try {
    console.log("Received request to add room:", req.body);
    
    const { roomName, userEmail } = req.body;

    // Find the user by email
    let user = await userModel.findOne({ email: userEmail });

    // If user doesn't exist, create a new user
    if (!user) {
      user = new userModel({ email: userEmail });
      await user.save();
    }

    // Find the last room of the user
    const lastRoom = await roomModel.findOne({ userId: user._id }).sort({ _id: -1 }).limit(1);

    let newId;
    if (lastRoom) {
      // If user has existing rooms, increment room ID
      const lastRoomId = lastRoom.roomId;
      console.log("Last room ID with the specified email:", lastRoomId);
      newId = lastRoomId + 1;
    } else {
      // If user has no existing rooms, set room ID to 1
      console.log("No room found with the specified email.");
      newId = 1;
    }

    // Create a new room
    const room = new roomModel({
      roomId: newId,
      roomName,
      userId: user._id // Assign existing or newly created user's ID
    });

    await room.save();

    console.log("Room saved successfully:", room);
    res.status(201).json({ room });
  } catch (error) {
    console.error("Error while creating room:", error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.post('/updateControlLight', async (req, res) => {

try{
  const{controlUnicastAddr,lightUnicastAddr}=req.body
    console.log("Received request to update control:", req.body);
    if(controlUnicastAddr==undefined || lightUnicastAddr==undefined){
      return res.status(400).json({ error: 'Control or light unicast address is missing' });
    }
    const mqttTopic = "/device/MASW0100001AA121/command";
    const modifiedObject = {
      type: 46,
      light_addr:lightUnicastAddr,
      control_addr: controlUnicastAddr, // Replace with your desired integer value
    };
    mqttClient.publish(mqttTopic, JSON.stringify(modifiedObject), (err) => {
      if (err) {
        console.error("Error publishing to MQTT:", err);
        return res.status(500).send("Error publishing to MQTT");
      }
      console.log("Published to MQTT successfully");
    });
}
catch(err){
  console.error("Error while updating control:", error);
    res.status(500).json({ error: 'Failed to create room' });
}

})

// Function to map words to numbers
function wordToNumber(word) {
  const wordMap = {
    one: '1',
    two: '2',
    to:'2',
    too:'2',
    three:'3',
    four:'4'
    // Add more mappings as needed
  };
  return wordMap[word.toLowerCase()] || word; // Convert to lowercase for case-insensitivity
}


app.post('/voiceControl', async (req, res) => {
  try {
    console.log("Received request to process voice command:", req.body);

    const { text, roomId, userEmail } = req.body;

    // Find the user by email
    let user = await userModel.findOne({ email: userEmail });

    // Regular expressions to extract relevant information from the voice command
    const actionRegex = /\b(on|off)\b/i; // Adjusted regex to capture "on" or "off" as action
    const brightnessRegex = /(\d+)%\s*brightness/i; // Regex to capture brightness percentage
    const temperatureRegex = /(\d+)%\s*temperature/i; // Regex to capture temperature percentage
    const lightIndexRegex = /light\s*(\w+)/i;

    let action, brightness, temperature, lightIndex;

    // Find action (on/off)
    const actionMatch = text.match(actionRegex);
    if (actionMatch) {
      action = actionMatch[1].toLowerCase(); // Convert to lowercase for consistency
      console.log("action",action)
    }

    // Find brightness percentage
    const brightnessMatch = text.match(brightnessRegex);
    if (brightnessMatch) {
      brightness = parseInt(brightnessMatch[1]);
     
      brightness=mapValueToRange(brightness, 0, 100, 0, 60);
      console.log("brighness",brightness)
    }

    // Find temperature percentage
    const temperatureMatch = text.match(temperatureRegex);
    if (temperatureMatch) {
      temperature = parseInt(temperatureMatch[1]);
      temperature=mapValueToRange(temperature,0,100,0,400)
    }

    // Find light index
    const lightIndexMatch = text.match(lightIndexRegex);
    if (lightIndexMatch) {
      lightIndex = wordToNumber(lightIndexMatch[1]); // Convert word to number
    }

    // Find the corresponding light(s) based on the extracted information
    let query = { roomId, userId: user._id };

    console.log("Query:", query);

    const lights = await lightModel.find(query);
    let selectedLight;
    if (lightIndex !== 'all') {
      selectedLight = lights[lightIndex - 1]; // Adjusting index since it starts from 0
    } else {
      throw new Error("Invalid light index specified.");
    }

    console.log("Found light:", selectedLight);
    if(!selectedLight){
      connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              alertType: "failure",
              message: "Light not found , speak valid light number"
            })
          );
        }
      });
      // res.status(200).json({ message: 'light not found' });
    }const reqobj={
      index:lightIndex-'1',
      
    }
    if (selectedLight.unicastAddr) {
      const mqttTopic = "/device/MASW0100001AA121/command";

      let cmdObj = {
        type: 1,
        port: selectedLight.unicastAddr
      };
        console.log(action)
      if (actionMatch) {
        cmdObj.state = action === 'on' ? 60 : 0; // Set intensity based on action
        reqobj.state=cmdObj.state
      } else if (brightnessMatch) {
        cmdObj = {
          type: 1,
          port: selectedLight.unicastAddr,
          state: brightness // Set brightness
        };
        reqobj.state=cmdObj.state
      } else if (temperatureMatch) {
        cmdObj = {
          type: 1,
          port: selectedLight.unicastAddr,
          colorTemperature: temperature // Set color temperature
        };
        reqobj.colorTemperature=cmdObj.colorTemperature
      }

      console.log("Command Object:", cmdObj);

      mqttClient.publish(mqttTopic, JSON.stringify(cmdObj), (err) => {
        if (err) {
          console.error("Error publishing to MQTT:", err);
          return res.status(500).send("Error publishing to MQTT");
        }
        console.log("Published to MQTT successfully");
      });
    }
 // Now you have the lights, you can perform further actions, like sending commands to the lights
 
    res.status(200).json({ message: 'Voice command processed successfully', reqobj });

  } catch (error) {
    console.error("Error processing voice command:", error);
    res.status(500).json({ error: error.message || 'Failed to understand the voice command' });
  }
});


app.get('/getAllRooms', async (req, res) => {
  try {
    const userEmail = req.query.email;

    // Find the user by email
    const user = await userModel.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Query to get all rooms for the user's userId
    const rooms = await roomModel.find({ userId: user._id });
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error while fetching rooms:", error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});


app.get('/getAllLightControl', async (req, res) => {

  try {
    const { roomId, email } = req.query;

    console.log("Received request to getAllLightControl:", req.query);
   // Find the user by email
   const user = await userModel.findOne({ email: email });

   if (!user) {
     return res.status(404).json({ error: 'User not found' });
   }

    // Find all lights for the specified room and user
    const lights = await lightModel.find({ userId: user._id, roomId: roomId });

    res.status(200).json({ lights });
  } catch (error) {
    console.error("Error while finding lights:", error);
    res.status(500).json({ error: 'Failed to find lights' });
  }
})

app.get('/getAllControl', async (req, res) => {

  try {
    const { roomId, email } =req.query;

    // Find the user by email
    console.log("Received request to get all controllers:", req.query);
    const user = await userModel.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Find all lights for the specified room and user
    const lights = await controlModel.find({ userId: user._id, roomId: roomId });

    res.status(200).json({ lights });
  } catch (error) {
    console.error("Error while finding controls:", error);
    res.status(500).json({ error: 'Failed to find controls' });
  }
})