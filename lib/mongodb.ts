import mongoose from 'mongoose';

// Define the type for our cached connection
type MongooseCache = {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
};

// Extend the global namespace to include our mongoose cache
declare global {
    // eslint-disable-next-line no-var
    var mongoose: MongooseCache | undefined;
}

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Validate that the MongoDB URI is provided
if (!MONGODB_URI) {
    throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local'
    );
}

/**
 * Global cache to store the mongoose connection
 * In development, Next.js hot reloading can cause multiple connections
 * This cache ensures we reuse the existing connection
 */
let cached: MongooseCache = global.mongoose || {
    conn: null,
    promise: null,
};

// Store the cache globally in development to persist across hot reloads
if (!global.mongoose) {
    global.mongoose = cached;
}

/**
 * Establishes a connection to MongoDB using Mongoose
 * Implements connection caching to prevent multiple simultaneous connections
 * 
 * @returns Promise<typeof mongoose> - The mongoose instance
 */
async function connectDB(): Promise<typeof mongoose> {
    // Return existing connection if available
    if (cached.conn) {
        return cached.conn;
    }

    // Return existing connection promise if one is in progress
    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Disable command buffering for better error handling
        };

        // Create a new connection promise
        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            console.log('✅ MongoDB connected successfully');
            return mongoose;
        });
    }

    try {
        // Await the connection promise and cache the result
        cached.conn = await cached.promise;
    } catch (error) {
        // Reset promise on error to allow retry
        cached.promise = null;
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }

    return cached.conn;
}

export default connectDB;