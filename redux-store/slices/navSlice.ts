import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Outlet } from '../../types/types';

export type Screen = 'landing' | 'tables' | 'menu' | 'cart';

interface NavState {
  screen: Screen;
  selectedOutlet: Outlet | null;
  selectedTable: string | null;
  selectedFoodSessionId: number | null;
}

const initialState: NavState = {
  screen: 'landing',
  selectedOutlet: null,
  selectedTable: null,
  selectedFoodSessionId: null,
};

const navSlice = createSlice({
  name: 'nav',
  initialState,
  reducers: {
    setScreenState(state, action: PayloadAction<Screen>) {
      state.screen = action.payload;
    },
    setSelectedOutletState(state, action: PayloadAction<Outlet | null>) {
      state.selectedOutlet = action.payload;
    },
    setSelectedTableState(state, action: PayloadAction<string | null>) {
      state.selectedTable = action.payload;
    },
    setSelectedFoodSessionState(state, action: PayloadAction<number | null>) {
      state.selectedFoodSessionId = action.payload;
    },
    resetNav(state) {
      state.screen = 'landing';
      state.selectedOutlet = null;
      state.selectedTable = null;
      state.selectedFoodSessionId = null;
    },
  },
});

export const {
  setScreenState,
  setSelectedOutletState,
  setSelectedTableState,
  setSelectedFoodSessionState,
  resetNav,
} = navSlice.actions;

export default navSlice.reducer;
