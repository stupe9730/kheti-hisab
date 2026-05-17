import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TractorEntry } from '../../types';
import { storage } from '../../api/storage';

interface TractorState {
  entries: TractorEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: TractorState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchEntries = createAsyncThunk('tractor/fetchEntries', async (farmId?: string) => {
  return await storage.getTractorEntries(farmId);
});

export const addEntry = createAsyncThunk(
  'tractor/addEntry',
  async (entry: any) => {
    return await storage.saveTractorEntry(entry);
  }
);

export const updateEntry = createAsyncThunk(
  'tractor/updateEntry',
  async ({ id, data }: { id: string; data: any }) => {
    return await storage.editTractorEntry(id, data);
  }
);

const tractorSlice = createSlice({
  name: 'tractor',
  initialState,
  reducers: {
    clearEntries: (state) => {
      state.entries = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEntries.fulfilled, (state, action: PayloadAction<TractorEntry[]>) => {
        state.loading = false;
        state.entries = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch entries';
      })
      .addCase(addEntry.fulfilled, (state, action: PayloadAction<TractorEntry>) => {
        state.entries.unshift(action.payload);
      })
      .addCase(updateEntry.fulfilled, (state, action: PayloadAction<TractorEntry>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        } else {
          state.entries.unshift(action.payload);
        }
      });
  },
});

export const { clearEntries } = tractorSlice.actions;
export default tractorSlice.reducer;
