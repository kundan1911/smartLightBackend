import mongoose from "mongoose";
const dbConnect = async () => {
  try {
    const connect = await mongoose.connect("mongodb+srv://admin-kundan:Kundan%4019@cluster0.0qyqn.mongodb.net/smartLightDB?retryWrites=true&w=majority");
    console.log(
      "Database Connected:",
      connect.connection.host,
      connect.connection.name
    );
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

export default dbConnect;
