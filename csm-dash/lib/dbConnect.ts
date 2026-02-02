import mongoose from "mongoose";

declare global {
  var mongoose: any;
}

const MONGO_URI = process.env.MONGO_DB_URI;

if (!MONGO_URI) {
  throw new Error("Please Define a MONGO_DB_URI environment variable.");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const dbConnect = async () => {
  //console.log("starting connection");
  if (cached.conn) {
    //console.log("using cached.conn");
    return cached.conn;
  }
  if (!cached.conn) {
    //console.log("setting up connection");
    const opts = {
      bufferCommands: false,
    };
    cached.promise = await mongoose.connect(MONGO_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    //console.log("connected to database");
  } catch (err) {
    //console.log("error connecting to database", err);
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

export default dbConnect;
