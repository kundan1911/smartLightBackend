import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const connection = mongoose.createConnection(
  "mongodb+srv://admin-kundan:Kundan%4019@cluster0.0qyqn.mongodb.net/smartLightDB?retryWrites=true&w=majority"
);
const AutoIncrement = AutoIncrementFactory(connection);

const schema = new mongoose.Schema({
  unicastAddr: {
    type: Number,
    required: true,
  },
});

schema.plugin(AutoIncrement, { inc_field: "id" });

const Model = mongoose.model("Model", schema);

export default Model;
