import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const globalForMongoose = globalThis as typeof globalThis & {
  __mongooseConn?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

export async function dbConnect() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI env var");
  }

  if (!globalForMongoose.__mongooseConn) {
    globalForMongoose.__mongooseConn = { conn: null, promise: null };
  }

  if (globalForMongoose.__mongooseConn.conn) return globalForMongoose.__mongooseConn.conn;

  if (!globalForMongoose.__mongooseConn.promise) {
    globalForMongoose.__mongooseConn.promise = mongoose.connect(mongoUri).then((m) => m);
  }

  globalForMongoose.__mongooseConn.conn = await globalForMongoose.__mongooseConn.promise;
  return globalForMongoose.__mongooseConn.conn;
}


