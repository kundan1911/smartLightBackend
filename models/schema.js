import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

const connection = mongoose.createConnection(
  process.env.CONNECTION_STRING
);

const roomSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true ,
  },
  roomId: {
    type: Number,
    required: true,
    unique: true,
  },
  roomName: {
    type: String,
    required: true,
  },
});


const controlSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roomId: { type: Number },
  controlId: { type: Number },
});


const lightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roomId: { type: Number },
  unicastAddr: { type: Number, required: true },
});


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    auto: true
  }
});

const userModel = mongoose.model("User", userSchema);
const roomModel = mongoose.model("Rooms", roomSchema);
const lightModel = mongoose.model("Lights", lightSchema);
const controlModel = mongoose.model("Controls", controlSchema);

export { roomModel, lightModel, controlModel,userModel };
