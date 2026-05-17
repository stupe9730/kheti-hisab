import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Farm } from '../../types';
import { storage } from '../../api/storage';

interface FarmState {
  farms: Farm[];
  loading: boolean;
  error: string | null;
}

const initialState: FarmState = {
  farms: [],
  loading: false,
  error: null,
};

export const fetchFarms = createAsyncThunk('farm/fetchFarms', async () => {
  return await storage.getFarms();
});

export const fetchGlobalSummary = createAsyncThunk('farm/fetchGlobalSummary', async () => {
  return await storage.getGlobalSummary();
});

export const addFarm = createAsyncThunk(
  'farm/addFarm',
  async ({ name, year }: { name: string; year: string }) => {
    return await storage.saveFarm(name, year);
  }
);

export const updateFarm = createAsyncThunk(
  'farm/updateFarm',
  async ({ id, name, year }: { id: string; name: string; year: string }) => {
    return await storage.updateFarm(id, name, year);
  }
);

export const deleteFarm = createAsyncThunk('farm/deleteFarm', async (id: string) => {
  const response = await storage.deleteFarm(id);
  return response.id;
});

const farmSlice = createSlice({
  name: 'farm',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchFarms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFarms.fulfilled, (state, action: PayloadAction<Farm[]>) => {
        state.loading = false;
        state.farms = action.payload;
      })
      .addCase(fetchGlobalSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGlobalSummary.fulfilled, (state, action: any) => {
        state.loading = false;
        state.farms = action.payload.farms;
        // Note: we're not storing tractorEntries here to avoid state duplication 
        // but the data is available for components that unwrap the result.
      })
      .addCase(fetchFarms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch farms';
      })
      // Add
      .addCase(addFarm.fulfilled, (state, action: PayloadAction<Farm>) => {
        state.farms.unshift(action.payload);
      })
      // Update
      .addCase(updateFarm.fulfilled, (state, action: PayloadAction<Farm>) => {
        const index = state.farms.findIndex((f) => f.id === action.payload.id);
        if (index !== -1) {
          state.farms[index] = action.payload;
        }
      })
      // Delete
      .addCase(deleteFarm.fulfilled, (state, action: PayloadAction<string>) => {
        state.farms = state.farms.filter((f) => f.id !== action.payload);
      });
  },
});

export default farmSlice.reducer;
