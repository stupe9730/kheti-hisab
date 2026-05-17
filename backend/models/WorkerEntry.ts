import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkerEntry extends Document {
  farmId: mongoose.Types.ObjectId;
  season: string;
  workerName: string;
  workType: string;
  workingDays: number;
  ratePerDay: number;
  totalAmount: number;
  paidAmountNow: number;
  totalPaidAmount: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'unpaid';
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

const workerEntrySchema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: true },
  season: { type: String, required: true, default: 'Rainy Season' },
  workerName: { type: String, required: true },
  workType: { type: String, required: true },
  workingDays: { type: Number, required: true },
  ratePerDay: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paidAmountNow: { type: Number, required: true },
  totalPaidAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
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

export default mongoose.model<IWorkerEntry>('WorkerEntry', workerEntrySchema);
