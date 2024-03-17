import mongoose from "mongoose";
// import AutoIncrementFactory from "mongoose-sequence";

const connection = mongoose.createConnection(
  "mongodb+srv://admin-kundan:Kundan%4019@cluster0.0qyqn.mongodb.net/smartLightDB?retryWrites=true&w=majority"
);
// const AutoIncrement = AutoIncrementFactory(connection);

const roomScheme = new mongoose.Schema({
  roomId:{type: Number},
  roomName: {
    type: String,
    required: true,
  },
  roomImage:{
    type: String,
  }
});
const controlSchema = new mongoose.Schema({
  roomId:{type: Number},
  controlId:{
    type: Number,
  },
});

const LightScheme = new mongoose.Schema({
  roomId:{type: Number},
  unicastAddr: {
    type: Number,
    required: true,
  },
});

const controlModel = mongoose.model("Controls", controlSchema);

export default controlModel;
