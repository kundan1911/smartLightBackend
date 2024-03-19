import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

const connection = mongoose.createConnection(
  process.env.CONNECTION_STRING
);

const roomSchema = new mongoose.Schema({
  roomId: {
    type: Number,
    required: true,
    unique: true,
  },
  roomName: {
    type: String,
    required: true,
  },
  user: {
    email: {
      type: String,
      required: true,
    },
  },
});

const controlSchema = new mongoose.Schema({
  roomId: { type: Number },
  controlId: { type: Number },
});

const lightSchema = new mongoose.Schema({
  roomId: { type: Number },
  unicastAddr: { type: Number, required: true },
});

const roomModel = mongoose.model("Rooms", roomSchema);
const lightModel = mongoose.model("Lights", lightSchema);
const controlModel = mongoose.model("Controls", controlSchema);

export default { roomModel, lightModel, controlModel };

