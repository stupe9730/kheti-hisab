import mongoose, { Schema, Document } from 'mongoose';

export interface IDairyExpense extends Document {
  farmId: mongoose.Types.ObjectId;
  expenseType: string;
  quantity: number;
  price: number;
  totalAmount: number;
  paidAmountNow: number;
  totalPaidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
  description: string;
  year: number;
  date: Date;
  paidDate: Date;
  createdAt: Date;
  updatedAt: Date;
  transactionHistory: {
    amount: number;
    date: Date;
    description: string;
  }[];
}

const DairyExpenseSchema: Schema = new Schema({
  farmId: { type: Schema.Types.ObjectId, ref: 'Farm' },
  expenseType: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmountNow: { type: Number, default: 0 },
  totalPaidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  description: { type: String },
  year: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paidDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  transactionHistory: [
    {
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      description: { type: String }
    }
  ]
});

export default mongoose.model<IDairyExpense>('DairyExpense', DairyExpenseSchema);
