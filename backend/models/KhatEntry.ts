import mongoose, { Schema, Document } from 'mongoose';

export interface IKhatEntry extends Document {
  farmId: mongoose.Types.ObjectId;
  season: string;
  khatName: string;
  providerName: string;
  billNumber?: string;
  quantity: number;
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
  parentId: mongoose.Types.ObjectId | null;
  version: number;
  transactionHistory: {
    paidNow: number;
    totalPaid: number;
    remaining: number;
    date: Date;
    description: string;
  }[];
}

const khatEntrySchema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: true },
  season: { type: String, required: true, default: 'Rainy Season' },
  khatName: { type: String, required: true },
  providerName: { type: String, default: "" },
  billNumber: { type: String, default: "" },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paidAmountNow: { type: Number, default: 0 },
  totalPaidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  interest: { type: Number, default: 0 },
  description: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  paidDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  parentId: { type: Schema.Types.ObjectId, ref: 'KhatEntry', default: null }, // For revision history
  version: { type: Number, default: 1 },
  transactionHistory: [{
    paidNow: Number,
    totalPaid: Number,
    remaining: Number,
    date: { type: Date, default: Date.now },
    description: String
  }]
}, { timestamps: true });

export default mongoose.model<IKhatEntry>('KhatEntry', khatEntrySchema);
