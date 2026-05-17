import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OtherExpense } from '../../types';
import { storage } from '../../api/storage';

interface OtherExpenseState {
  items: OtherExpense[];
  loading: boolean;
  error: string | null;
}

const initialState: OtherExpenseState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchOtherExpenses = createAsyncThunk('otherExpenses/fetch', async (farmId?: string) => {
  return await storage.getOtherExpenses(farmId);
});

export const addOtherExpense = createAsyncThunk('otherExpenses/add', async (expense: any) => {
  return await storage.saveOtherExpense(expense);
});

export const updateOtherExpense = createAsyncThunk('otherExpenses/update', async ({ id, data }: { id: string; data: any }) => {
  return await storage.updateOtherExpense(id, data);
});

export const deleteOtherExpense = createAsyncThunk('otherExpenses/delete', async (id: string) => {
  await storage.deleteOtherExpense(id);
  return id;
});

const otherExpenseSlice = createSlice({
  name: 'otherExpenses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOtherExpenses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOtherExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchOtherExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch other expenses';
      })
      .addCase(addOtherExpense.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateOtherExpense.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteOtherExpense.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      });
  },
});

export default otherExpenseSlice.reducer;
export type { OtherExpense };
