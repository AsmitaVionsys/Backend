import mongoose from 'mongoose';
import {DB_NAME} from '../constant.js'


const connectDB = async () => {
    
    try {
        const connectionInstance = await mongoose.connect(`mongodb+srv://asmitadhole2000:oXFH2HtWJcrFEBYd@cluster0.tdlva6q.mongodb.net/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
        console.log(`MongoDB connected...`);
    } catch (error) {
        console.log("MongoDB connection error", error);
        process.exit(1);
    }
}

export default connectDB;