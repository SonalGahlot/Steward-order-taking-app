import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  user: {
    userName: string;
    userId: number | null;
  };
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  user: {
    userName: '',
    userId: null,
  },
  token: null,
  isAuthenticated: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginSuccess(
      state,
      action: PayloadAction<{ user: UserState['user']; token: string }>,
    ) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },

    logout(state) {
      state.user = {
        userName: '',
        userId: null,
      };
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { loginSuccess, logout } = userSlice.actions;
export default userSlice.reducer;
