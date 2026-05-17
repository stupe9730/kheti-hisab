import mongoose, { Schema, Document } from 'mongoose';

export interface IMilkEntry extends Document {
  farmId: mongoose.Types.ObjectId;
  cowName: string;
  morningMilk: number;
  eveningMilk: number;
  totalMilk: number;
  milkPrice: number;
  totalSale: number;
  entryType: string;
  totalDays: number;
  startDate: Date;
  endDate: Date;
  year: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MilkEntrySchema: Schema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm' },
  cowName: { type: String },
  morningMilk: { type: Number, default: 0 },
  eveningMilk: { type: Number, default: 0 },
  totalMilk: { type: Number, required: true },
  milkPrice: { type: Number, required: true },
  totalSale: { type: Number, required: true },
  entryType: { type: String, enum: ['daily', 'bulk'], default: 'daily' },
  totalDays: { type: Number, default: 1 },
  startDate: { type: Date },
  endDate: { type: Date },
  year: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IMilkEntry>('MilkEntry', MilkEntrySchema);
