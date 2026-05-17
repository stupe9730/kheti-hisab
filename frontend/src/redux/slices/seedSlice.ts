import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SeedEntry } from '../../types';
import { storage } from '../../api/storage';

interface SeedState {
  entries: SeedEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: SeedState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchSeedEntries = createAsyncThunk('seed/fetchEntries', async (farmId?: string) => {
  return await storage.getSeedEntries(farmId);
});

export const addSeedEntry = createAsyncThunk(
  'seed/addEntry',
  async (entry: any) => {
    return await storage.saveSeedEntry(entry);
  }
);

export const updateSeedEntry = createAsyncThunk(
  'seed/updateEntry',
  async ({ id, data }: { id: string, data: any }) => {
    return await storage.updateSeedEntry(id, data);
  }
);

export const deleteSeedEntry = createAsyncThunk(
  'seed/deleteEntry',
  async (id: string) => {
    const result = await storage.deleteSeedEntry(id);
    return id;
  }
);

const seedSlice = createSlice({
  name: 'seed',
  initialState,
  reducers: {
    clearSeedEntries: (state) => {
      state.entries = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeedEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSeedEntries.fulfilled, (state, action: PayloadAction<SeedEntry[]>) => {
        state.loading = false;
        state.entries = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSeedEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch entries';
      })
      .addCase(addSeedEntry.fulfilled, (state, action: PayloadAction<SeedEntry>) => {
        state.entries.unshift(action.payload);
      })
      .addCase(updateSeedEntry.fulfilled, (state, action: PayloadAction<SeedEntry>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        } else {
          state.entries.unshift(action.payload);
        }
      })
      .addCase(deleteSeedEntry.fulfilled, (state, action: PayloadAction<string>) => {
        state.entries = state.entries.filter(e => e.id !== action.payload);
      });
  },
});

export const { clearSeedEntries } = seedSlice.actions;
export default seedSlice.reducer;
