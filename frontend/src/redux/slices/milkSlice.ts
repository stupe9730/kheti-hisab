import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MilkEntry } from '../../types';
import { storage } from '../../api/storage';

interface MilkState {
  entries: MilkEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: MilkState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchMilkEntries = createAsyncThunk('milk/fetchEntries', async () => {
  return await storage.getMilkEntries();
});

export const addMilkEntry = createAsyncThunk(
  'milk/addEntry',
  async (entry: any) => {
    return await storage.saveMilkEntry(entry);
  }
);

export const updateMilkEntry = createAsyncThunk(
  'milk/updateEntry',
  async ({ id, data }: { id: string; data: any }) => {
    return await storage.updateMilkEntry(id, data);
  }
);

export const deleteMilkEntry = createAsyncThunk(
  'milk/deleteEntry',
  async (id: string) => {
    await storage.deleteMilkEntry(id);
    return id;
  }
);

const milkSlice = createSlice({
  name: 'milk',
  initialState,
  reducers: {
    clearMilkEntries: (state) => {
      state.entries = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMilkEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMilkEntries.fulfilled, (state, action: PayloadAction<MilkEntry[]>) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchMilkEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch milk records';
      })
      .addCase(addMilkEntry.fulfilled, (state, action: PayloadAction<MilkEntry>) => {
        state.entries.unshift(action.payload);
      })
      .addCase(updateMilkEntry.fulfilled, (state, action: PayloadAction<MilkEntry>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(deleteMilkEntry.fulfilled, (state, action: PayloadAction<string>) => {
        state.entries = state.entries.filter(e => e.id !== action.payload);
      });
  },
});

export const { clearMilkEntries } = milkSlice.actions;
export default milkSlice.reducer;
