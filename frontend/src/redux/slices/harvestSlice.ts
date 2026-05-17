import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { HarvestEntry } from '../../types';
import { storage } from '../../api/storage';

interface HarvestState {
  entries: HarvestEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: HarvestState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchHarvestEntries = createAsyncThunk('harvest/fetchEntries', async (farmId?: string) => {
  return await storage.getHarvestEntries(farmId);
});

export const addHarvestEntry = createAsyncThunk(
  'harvest/addEntry',
  async (entry: any) => {
    return await storage.saveHarvestEntry(entry);
  }
);

export const updateHarvestEntry = createAsyncThunk(
  'harvest/updateEntry',
  async ({ id, data }: { id: string; data: any }) => {
    return await storage.updateHarvestEntry(id, data);
  }
);

export const deleteHarvestEntry = createAsyncThunk(
  'harvest/deleteEntry',
  async (id: string) => {
    await storage.deleteHarvestEntry(id);
    return id;
  }
);

const harvestSlice = createSlice({
  name: 'harvest',
  initialState,
  reducers: {
    clearHarvestEntries: (state) => {
      state.entries = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHarvestEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHarvestEntries.fulfilled, (state, action: PayloadAction<HarvestEntry[]>) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchHarvestEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch entries';
      })
      .addCase(addHarvestEntry.fulfilled, (state, action: PayloadAction<HarvestEntry>) => {
        state.entries.unshift(action.payload);
      })
      .addCase(updateHarvestEntry.fulfilled, (state, action: PayloadAction<HarvestEntry>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(deleteHarvestEntry.fulfilled, (state, action: PayloadAction<string>) => {
        state.entries = state.entries.filter(e => e.id !== action.payload);
      });
  },
});

export const { clearHarvestEntries } = harvestSlice.actions;
export default harvestSlice.reducer;
