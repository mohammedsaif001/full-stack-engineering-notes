import mongoose from "mongoose"

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Mongo DB Connected Successfully ✅")
    } catch (error) {
        console.error("Error while Connecting Mongo DB:", error);
        process.exit(1)
    }
}

export default connectDB