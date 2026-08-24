import mongoose from "mongoose";

const connectDB = async () => {
    // const conn = mongoose.connect(process.env.MONGO_URI);

    // console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);

    console.log("MongoDB Connected");
}

export default connectDB;