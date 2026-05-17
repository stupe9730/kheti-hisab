import { configureStore } from '@reduxjs/toolkit';
import farmReducer from './slices/farmSlice';
import tractorReducer from './slices/tractorSlice';
import khatReducer from './slices/khatSlice';
import seedReducer from './slices/seedSlice';
import aushadReducer from './slices/aushadSlice';
import workerReducer from './slices/workerSlice';
import harvestReducer from './slices/harvestSlice';
import milkReducer from './slices/milkSlice';
import dairyExpenseReducer from './slices/dairyExpenseSlice';
import otherExpenseReducer from './slices/otherExpenseSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    farm: farmReducer,
    tractor: tractorReducer,
    khat: khatReducer,
    seed: seedReducer,
    aushad: aushadReducer,
    worker: workerReducer,
    harvest: harvestReducer,
    milk: milkReducer,
    dairyExpense: dairyExpenseReducer,
    otherExpense: otherExpenseReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
