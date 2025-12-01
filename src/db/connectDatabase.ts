import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ichgram_db'; 

export const connectDatabase = async (): Promise<void> => {
    if (!MONGODB_URI) {
        console.error("Database connection failed: MONGODB_URI is not defined.");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Database connection successful to Atlas Cluster!");
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1); 
    }
};