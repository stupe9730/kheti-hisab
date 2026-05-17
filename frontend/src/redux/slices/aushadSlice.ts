import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AushadEntry } from '../../types';
import { storage } from '../../api/storage';

interface AushadState {
  entries: AushadEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: AushadState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchAushadEntries = createAsyncThunk('aushad/fetchEntries', async (farmId?: string) => {
  return await storage.getAushadEntries(farmId);
});

export const addAushadEntry = createAsyncThunk(
  'aushad/addEntry',
  async (entry: any) => {
    return await storage.saveAushadEntry(entry);
  }
);

export const updateAushadEntry = createAsyncThunk(
  'aushad/updateEntry',
  async ({ id, data }: { id: string, data: any }) => {
    return await storage.updateAushadEntry(id, data);
  }
);

export const deleteAushadEntry = createAsyncThunk(
  'aushad/deleteEntry',
  async (id: string) => {
    await storage.deleteAushadEntry(id);
    return id;
  }
);

const aushadSlice = createSlice({
  name: 'aushad',
  initialState,
  reducers: {
    clearAushadEntries: (state) => {
      state.entries = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAushadEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAushadEntries.fulfilled, (state, action: PayloadAction<AushadEntry[]>) => {
        state.loading = false;
        state.entries = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAushadEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch entries';
      })
      .addCase(addAushadEntry.fulfilled, (state, action: PayloadAction<AushadEntry>) => {
        state.entries.unshift(action.payload);
      })
      .addCase(updateAushadEntry.fulfilled, (state, action: PayloadAction<AushadEntry>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        } else {
          state.entries.unshift(action.payload);
        }
      })
      .addCase(deleteAushadEntry.fulfilled, (state, action: PayloadAction<string>) => {
        state.entries = state.entries.filter(e => e.id !== action.payload);
      });
  },
});

export const { clearAushadEntries } = aushadSlice.actions;
export default aushadSlice.reducer;
