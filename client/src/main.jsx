import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <SettingsProvider>
          <ToastProvider>
            <CartProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </CartProvider>
          </ToastProvider>
        </SettingsProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
