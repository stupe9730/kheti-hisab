import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { WorkerEntry } from '../../types';
import { storage } from '../../api/storage';

interface WorkerState {
  entries: WorkerEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: WorkerState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchWorkerEntries = createAsyncThunk('worker/fetchEntries', async (farmId?: string) => {
  return await storage.getWorkerEntries(farmId);
});

export const addWorkerEntry = createAsyncThunk(
  'worker/addEntry',
  async (entry: any) => {
    return await storage.saveWorkerEntry(entry);
  }
);

export const updateWorkerEntry = createAsyncThunk(
  'worker/updateEntry',
  async ({ id, data }: { id: string, data: any }) => {
    return await storage.updateWorkerEntry(id, data);
  }
);

export const deleteWorkerEntry = createAsyncThunk(
  'worker/deleteEntry',
  async (id: string) => {
    await storage.deleteWorkerEntry(id);
    return id;
  }
);

const workerSlice = createSlice({
  name: 'worker',
  initialState,
  reducers: {
    clearWorkerEntries: (state) => {
      state.entries = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkerEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkerEntries.fulfilled, (state, action: PayloadAction<WorkerEntry[]>) => {
        state.loading = false;
        state.entries = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchWorkerEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch entries';
      })
      .addCase(addWorkerEntry.fulfilled, (state, action: PayloadAction<WorkerEntry>) => {
        state.entries.unshift(action.payload);
      })
      .addCase(updateWorkerEntry.fulfilled, (state, action: PayloadAction<WorkerEntry>) => {
        const index = state.entries.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        } else {
          state.entries.unshift(action.payload);
        }
      })
      .addCase(deleteWorkerEntry.fulfilled, (state, action: PayloadAction<string>) => {
        state.entries = state.entries.filter(e => e.id !== action.payload);
      });
  },
});

export const { clearWorkerEntries } = workerSlice.actions;
export default workerSlice.reducer;
