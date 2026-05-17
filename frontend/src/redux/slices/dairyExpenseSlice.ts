import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DairyExpense } from '../../types';
import { storage } from '../../api/storage';

interface DairyExpenseState {
  entries: DairyExpense[];
  loading: boolean;
  error: string | null;
}

const initialState: DairyExpenseState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchDairyExpenses = createAsyncThunk('dairyExpense/fetchEntries', async () => {
  return await storage.getDairyExpenses();
});

export const addDairyExpense = createAsyncThunk(
  'dairyExpense/addEntry',
  async (entry: any) => {
    return await storage.saveDairyExpense(entry);
  }
);

export const updateDairyExpense = createAsyncThunk(
  'dairyExpense/updateEntry',
  async ({ id, data }: { id: string; data: any }) => {
    return await storage.updateDairyExpense(id, data);
  }
);

export const updateDairyPayment = createAsyncThunk(
  'dairyExpense/updatePayment',
  async ({ id, paymentAmount, paidDate, description }: { id: string; paymentAmount: number; paidDate: string; description: string }) => {
    return await storage.updateDairyExpense(id, { type: 'payment', paymentAmount, paidDate, description });
  }
);

export const deleteDairyExpense = createAsyncThunk(
  'dairyExpense/deleteEntry',
  async (id: string) => {
    await storage.deleteDairyExpense(id);
    return id;
  }
);

const dairyExpenseSlice = createSlice({
  name: 'dairyExpense',
  initialState,
  reducers: {
    clearDairyExpenses: (state) => {
      state.entries = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDairyExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDairyExpenses.fulfilled, (state, action: PayloadAction<DairyExpense[]>) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchDairyExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dairy expenses';
      })
      .addCase(addDairyExpense.fulfilled, (state, action: PayloadAction<DairyExpense>) => {
        state.entries.unshift(action.payload);
      })
      .addCase(updateDairyExpense.fulfilled, (state, action: PayloadAction<DairyExpense>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(updateDairyPayment.fulfilled, (state, action: PayloadAction<DairyExpense>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(deleteDairyExpense.fulfilled, (state, action: PayloadAction<string>) => {
        state.entries = state.entries.filter(e => e.id !== action.payload);
      });
  },
});

export const { clearDairyExpenses } = dairyExpenseSlice.actions;
export default dairyExpenseSlice.reducer;
