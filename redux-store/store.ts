import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
// import invoiceReducer from './slices/invoiceSlice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from './storage';
// import createSagaMiddleware from 'redux-saga';
// import { rootSaga } from './sagas/rootSaga';

const userPersistConfig = {
  key: 'user',
  storage,
  whitelist: ['user', 'token', 'isAuthenticated'],
};

// const invoicePersistConfig = {
//   key: 'invoice',
//   storage,
//   whitelist: ['invoices', 'currentInvoice'],
// };

const persistedUserReducer = persistReducer(userPersistConfig, userReducer);
// const persistedInvoiceReducer = persistReducer(
//   invoicePersistConfig,
//   invoiceReducer
// );

// const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    user: persistedUserReducer,
    // invoice: persistedInvoiceReducer,
  },
  // inside configureStore({...})
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
    },
  }),
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware({
  //     serializableCheck: {
  //       // Ignore these action types
  //       ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
  //       // Ignore these field paths in all actions
  //       ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
  //       // Ignore these paths in the state
  //       ignoredPaths: ['items.dates'],
  //     },
  //   }).concat(sagaMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// sagaMiddleware.run(rootSaga);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
