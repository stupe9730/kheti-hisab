import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { KhatEntry } from '../../types';
import { storage } from '../../api/storage';

interface KhatState {
  entries: KhatEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: KhatState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchKhatEntries = createAsyncThunk('khat/fetchEntries', async (farmId?: string) => {
  return await storage.getKhatEntries(farmId);
});

export const addKhatEntry = createAsyncThunk(
  'khat/addEntry',
  async (entry: any) => {
    return await storage.saveKhatEntry(entry);
  }
);

export const updateKhatEntry = createAsyncThunk(
  'khat/updateEntry',
  async ({ id, data }: { id: string, data: any }) => {
    return await storage.updateKhatEntry(id, data);
  }
);

export const deleteKhatEntry = createAsyncThunk(
  'khat/deleteEntry',
  async (id: string) => {
    const result = await storage.deleteKhatEntry(id);
    return result.id;
  }
);

const khatSlice = createSlice({
  name: 'khat',
  initialState,
  reducers: {
    clearKhatEntries: (state) => {
      state.entries = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKhatEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchKhatEntries.fulfilled, (state, action: PayloadAction<KhatEntry[]>) => {
        state.loading = false;
        state.entries = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchKhatEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch entries';
      })
      .addCase(addKhatEntry.fulfilled, (state, action: PayloadAction<KhatEntry>) => {
        state.entries.unshift(action.payload);
      })
      .addCase(updateKhatEntry.fulfilled, (state, action: PayloadAction<KhatEntry>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        } else {
          state.entries.unshift(action.payload);
        }
      })
      .addCase(deleteKhatEntry.fulfilled, (state, action: PayloadAction<string>) => {
        state.entries = state.entries.filter(e => e.id !== action.payload);
      });
  },
});

export const { clearKhatEntries } = khatSlice.actions;
export default khatSlice.reducer;
