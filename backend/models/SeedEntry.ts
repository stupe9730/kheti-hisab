import mongoose, { Schema, Document } from 'mongoose';

export interface ISeedEntry extends Document {
  farmId: mongoose.Types.ObjectId;
  season: string;
  seedName: string;
  seedCompany: string;
  providerName: string;
  billNumber?: string;
  cropType: string;
  quantity: number;
  unit: string;
  price: number;
  totalAmount: number;
  paidAmountNow: number;
  totalPaidAmount: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'unpaid';
  interest: number;
  description: string;
  date: Date;
  paidDate: Date;
  createdAt: Date;
  version: number;
  transactionHistory: {
    paidNow: number;
    totalPaid: number;
    remaining: number;
    date: Date;
    description: string;
  }[];
}

const seedEntrySchema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: true },
  season: { type: String, required: true, default: 'Rainy Season' },
  seedName: { type: String, required: true },
  seedCompany: { type: String, default: "" },
  providerName: { type: String, default: "" },
  billNumber: { type: String, default: "" },
  cropType: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true, enum: ['kg', 'gram', 'packet'] },
  price: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paidAmountNow: { type: Number, required: true },
  totalPaidAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  interest: { type: Number, default: 0 },
  description: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  paidDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
  transactionHistory: [{
    paidNow: Number,
    totalPaid: Number,
    remaining: Number,
    date: { type: Date, default: Date.now },
    description: String
  }]
}, { timestamps: true });

export default mongoose.model<ISeedEntry>('SeedEntry', seedEntrySchema);
