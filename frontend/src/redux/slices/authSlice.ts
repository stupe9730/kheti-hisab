import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface User {
  id: string;
  fullName: string;
  username: string;
  mobileNumber?: string;
  profilePhoto?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem("user") || "null"),

  token: localStorage.getItem("token"),

  isAuthenticated: !!localStorage.getItem("token"),

  loading: false,

  error: null,
};

export const login = createAsyncThunk(
  "auth/login",

  async (credentials: any, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        credentials,
      );

      localStorage.setItem("token", response.data.token);

      localStorage.setItem("user", JSON.stringify(response.data.user));

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Login failed");
    }
  },
);

export const register = createAsyncThunk(
  "auth/register",

  async (userData: any, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/register`,
        userData,
      );

      localStorage.setItem("token", response.data.token);

      localStorage.setItem("user", JSON.stringify(response.data.user));

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Registration failed",
      );
    }
  },
);

export const fetchMe = createAsyncThunk(
  "auth/fetchMe",

  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as {
        auth: AuthState;
      };

      const config = {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      };

      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, config);

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch user",
      );
    }
  },
);

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");

      localStorage.removeItem("user");

      state.user = null;

      state.token = null;

      state.isAuthenticated = false;

      state.error = null;
    },

    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // LOGIN
      .addCase(login.pending, (state) => {
        state.loading = true;

        state.error = null;
      })

      .addCase(
        login.fulfilled,

        (state, action: PayloadAction<any>) => {
          state.loading = false;

          state.isAuthenticated = true;

          state.user = action.payload.user;

          state.token = action.payload.token;
        },
      )

      .addCase(
        login.rejected,

        (state, action) => {
          state.loading = false;

          state.error = action.payload as string;
        },
      )

      // REGISTER
      .addCase(register.pending, (state) => {
        state.loading = true;

        state.error = null;
      })

      .addCase(
        register.fulfilled,

        (state, action: PayloadAction<any>) => {
          state.loading = false;

          state.isAuthenticated = true;

          state.user = action.payload.user;

          state.token = action.payload.token;
        },
      )

      .addCase(
        register.rejected,

        (state, action) => {
          state.loading = false;

          state.error = action.payload as string;
        },
      )

      // FETCH ME
      .addCase(
        fetchMe.fulfilled,

        (state, action) => {
          state.user = action.payload;

          state.isAuthenticated = true;
        },
      )

      .addCase(
        fetchMe.rejected,

        (state) => {
          state.user = null;

          state.token = null;

          state.isAuthenticated = false;

          localStorage.removeItem("token");

          localStorage.removeItem("user");
        },
      );
  },
});

export const { logout, clearError } = authSlice.actions;

export default authSlice.reducer;
