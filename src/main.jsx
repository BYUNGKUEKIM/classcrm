import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from '@/App';
import { AuthProvider } from '@/contexts/FirebaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <Router>
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
    </Router>
  </>
);