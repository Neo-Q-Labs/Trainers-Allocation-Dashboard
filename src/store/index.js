import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from './api.js';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});

// Lets RTK Query react to events like network reconnects if we ever enable
// refetchOnReconnect at the endpoint level. Default behaviour: no-op.
setupListeners(store.dispatch);
