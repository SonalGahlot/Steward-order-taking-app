import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Outlet } from '../../types/types';

export type Screen = 'landing' | 'tables' | 'menu';

interface NavState {
  screen: Screen;
  selectedOutlet: Outlet | null;
  selectedTable: string | null;
}

const initialState: NavState = {
  screen: 'landing',
  selectedOutlet: null,
  selectedTable: null,
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
    resetNav(state) {
      state.screen = 'landing';
      state.selectedOutlet = null;
      state.selectedTable = null;
    },
  },
});

export const {
  setScreenState,
  setSelectedOutletState,
  setSelectedTableState,
  resetNav,
} = navSlice.actions;

export default navSlice.reducer;
