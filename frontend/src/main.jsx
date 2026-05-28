import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App.jsx';
import { store } from './store/index.js';
import { api } from './store/api.js';
import './index.css';

/* ----- Boot-time prefetch -----------------------------------------------
   Kick off every page's primary endpoint right after the store is created
   so by the time the user navigates anywhere the data is already in the
   Redux cache. Failures are swallowed — individual pages still render
   their own loading / error UI if the prefetch hasn't resolved yet. */
const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const today = new Date();
const start = toIso(today);
const weekEnd = toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6));

const prefetch = (endpoint, arg) =>
  store.dispatch(api.endpoints[endpoint].initiate(arg, { forceRefetch: false }));

[
  ['getDateBlocking', { start_date: start, end_date: weekEnd }],
  ['getAvailabilityForDate', start],
  ['getTrainers', { limit: 500 }],
  ['getDeliveries', {}],
  ['getKpis', undefined],
  ['getConflicts', undefined],
  ['getPending', undefined],
  ['getWorkload', undefined],
  ['getClients', undefined],
  ['getCalendarMetrics', undefined],
  ['getCalendarData', { year: today.getFullYear(), month: today.getMonth() + 1 }],
  ['getRequestTrack', { limit: 200 }],
  ['getMasterData', undefined],
].forEach(([ep, arg]) => prefetch(ep, arg));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
