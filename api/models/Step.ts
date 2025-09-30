import mongoose, { Document, Schema } from "mongoose";
export interface IStep extends Document {
  userId?: string;
  timestamp: Date;
  steps: number;
}

const stepSchema: Schema = new Schema({
  userId: { type: String, required: false },
  timestamp: { type: Date, required: true, default: Date.now },
  steps: { type: Number, required: true, default: 0 },
});

export default mongoose.model<IStep>("Step", stepSchema);
