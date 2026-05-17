import mongoose, { Schema, Document } from 'mongoose';

export interface IAushadEntry extends Document {
  farmId: mongoose.Types.ObjectId;
  season: string;
  medicineName: string;
  companyName: string;
  providerName: string;
  billNumber?: string;
  type: 'Insecticide' | 'Fungicide' | 'Herbicide';
  cropType: string;
  quantity: number;
  unit: 'ml' | 'liter' | 'gram' | 'kg' | 'packet';
  price: number;
  totalAmount: number;
  paidAmountNow: number;
  totalPaidAmount: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'unpaid';
  sprayPurpose: string;
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

const aushadEntrySchema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: true },
  season: { type: String, required: true, default: 'Rainy Season' },
  medicineName: { type: String, required: true },
  companyName: { type: String, default: "" },
  providerName: { type: String, default: "" },
  billNumber: { type: String, default: "" },
  type: { type: String, enum: ['Insecticide', 'Fungicide', 'Herbicide'], required: true },
  cropType: { type: String, default: "" },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true, enum: ['ml', 'liter', 'gram', 'kg', 'packet'] },
  price: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paidAmountNow: { type: Number, required: true },
  totalPaidAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  sprayPurpose: { type: String, default: "" },
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

export default mongoose.model<IAushadEntry>('AushadEntry', aushadEntrySchema);
