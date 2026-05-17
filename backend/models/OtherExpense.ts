import mongoose, { Schema, Document } from 'mongoose';

export interface IOtherExpense extends Document {
  farmId: mongoose.Types.ObjectId;
  expenseName: string;
  category: string;
  date: Date;
  quantity: number;
  unit: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  sellerName: string;
  billNumber?: string;
  notes?: string;
  season: string;
  year: string;
  createdAt: Date;
  updatedAt: Date;
  transactionHistory?: {
    amount: number;
    date: Date;
    description: string;
  }[];
}

const OtherExpenseSchema: Schema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: true },
  expenseName: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: "" },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  sellerName: { type: String, default: "" },
  billNumber: { type: String, default: "" },
  notes: { type: String, default: "" },
  season: { type: String, required: true },
  year: { type: String, required: true },
  transactionHistory: [{
    amount: { type: Number },
    date: { type: Date, default: Date.now },
    description: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
    }
  }
});

export default mongoose.model<IOtherExpense>('OtherExpense', OtherExpenseSchema);
