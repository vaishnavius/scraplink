// src/index.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';             // use extensionless import
import './index.css';
import { AuthProvider } from './hooks/useAuth'; // provider from useAuth.tsx

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
