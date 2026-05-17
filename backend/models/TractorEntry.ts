import mongoose, { Schema, Document } from 'mongoose';

export interface ITractorEntry extends Document {
  farmId: mongoose.Types.ObjectId;
  season: string;
  workType: string;
  providerName: string;
  landSize: number;
  rate: number;
  totalAmount: number;
  paidAmountNow: number;
  totalPaidAmount: number;
  remainingAmount: number;
  paymentStatus: 'Paid' | 'Unpaid';
  paidDate: Date;
  description: string;
  createdAt: Date;
  // Revision history fields
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

const TractorEntrySchema: Schema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: true },
  season: { type: String, required: true, default: 'Rainy Season' },
  workType: { type: String, required: true },
  providerName: { type: String, default: "" },
  landSize: { type: Number, required: true },
  rate: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paidAmountNow: { type: Number, required: true },
  totalPaidAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
  paidDate: { type: Date, default: Date.now },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  // Revision history fields
  parentId: { type: Schema.Types.ObjectId, ref: 'TractorEntry', default: null },
  version: { type: Number, default: 1 },
  transactionHistory: [{
    paidNow: Number,
    totalPaid: Number,
    remaining: Number,
    date: { type: Date, default: Date.now },
    description: String
  }]
});

export default mongoose.model<ITractorEntry>('TractorEntry', TractorEntrySchema);
