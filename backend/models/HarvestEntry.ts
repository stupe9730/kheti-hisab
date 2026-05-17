import mongoose, { Schema, Document } from 'mongoose';

export interface IHarvestEntry extends Document {
  farmId: mongoose.Types.ObjectId;
  season: string;
  cropName: string;
  quantity: number;
  unit: 'Quintal' | 'Kg' | 'Ton';
  marketPrice: number;
  totalSale: number;
  transportCost: number;
  marketExpense: number;
  otherExpense: number;
  totalExpense: number;
  profit: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HarvestEntrySchema: Schema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: true },
  season: { type: String, required: true, default: 'Rainy Season' },
  cropName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, enum: ['Quintal', 'Kg', 'Ton'], required: true },
  marketPrice: { type: Number, required: true },
  totalSale: { type: Number, required: true },
  transportCost: { type: Number, default: 0 },
  marketExpense: { type: Number, default: 0 },
  otherExpense: { type: Number, default: 0 },
  totalExpense: { type: Number, required: true },
  profit: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IHarvestEntry>('HarvestEntry', HarvestEntrySchema);
