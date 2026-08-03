import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles/global.css';
import App from './App';
import WidgetApp from './components/WidgetApp';

// The same bundle serves both the main sidebar and detached mini-widgets;
// widget windows are loaded with ?widget=<section>.
const widgetSection = new URLSearchParams(window.location.search).get('widget');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {widgetSection ? <WidgetApp section={widgetSection} /> : <App />}
  </React.StrictMode>
);
