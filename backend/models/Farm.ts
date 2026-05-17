import mongoose, { Schema, Document } from 'mongoose';

export interface IFarm extends Document {
  name: string;
  year: string;
  createdAt: Date;
}

const FarmSchema: Schema = new Schema({
  name: { type: String, required: true },
  year: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
    }
  }
});

export default mongoose.model<IFarm>('Farm', FarmSchema);
