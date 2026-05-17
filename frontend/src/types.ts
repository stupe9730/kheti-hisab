export interface Farm {
  id: string;
  name: string;
  year: string; // Hagam/Season
  createdAt: string;
}

export interface TractorEntry {
  id: string;
  farmId: string;
  season: string;
  landSize: number; // in gunta
  rate: number; // per gunta
  totalAmount: number;
  paidAmountNow: number; // The specific amount paid in this entry
  totalPaidAmount: number; // Cumulative paid amount
  remainingAmount: number;
  workType: string; // Type of work (e.g., नागरणी, फट्ट्या, etc.)
  providerName: string;
  paymentStatus: 'Paid' | 'Unpaid';
  parentId: string | null; // ID of the original entry
  isEdited: boolean;
  updatedAt: string;
  paidDate: string;
  description: string;
  createdAt: string;
}

export interface KhatEntry {
  id: string;
  farmId: string;
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
  date: string;
  paidDate: string;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  version: number;
}

export interface SeedEntry {
  id: string;
  farmId: string;
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
  date: string;
  paidDate: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AushadEntry {
  id: string;
  farmId: string;
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
  date: string;
  paidDate: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface WorkerEntry {
  id: string;
  farmId: string;
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
  date: string;
  paidDate: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface HarvestEntry {
  id: string;
  farmId: string;
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
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilkEntry {
  id: string;
  farmId: string;
  cowName: string;
  morningMilk: number;
  eveningMilk: number;
  totalMilk: number;
  milkPrice: number;
  totalSale: number;
  date: string;
  entryType: 'daily' | 'bulk';
  totalDays: number;
  startDate: string;
  endDate: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface DairyExpense {
  id: string;
  farmId: string;
  expenseType: 'Sugras Khadya' | 'Murghas' | 'Pend' | 'Bhusa' | 'Chara' | 'Medicine' | 'Worker' | 'Other';
  quantity: number;
  price: number;
  totalAmount: number;
  paidAmountNow: number;
  totalPaidAmount: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'unpaid';
  description: string;
  year: number;
  date: string;
  paidDate: string;
  createdAt: string;
  updatedAt: string;
  transactionHistory: {
    amount: number;
    date: string;
    description: string;
  }[];
}

export interface OtherExpense {
  id: string;
  farmId: string;
  expenseName: string;
  category: string;
  date: string;
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
  createdAt: string;
  updatedAt?: string;
  transactionHistory?: {
    amount: number;
    date: string;
    description: string;
  }[];
}
