import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useConfig } from './hooks/useConfig';
import { Login } from './components/Login';
import { FeedbackForm } from './components/FeedbackForm';
import { Toast } from './components/Toast';

const AppContent: React.FC = () => {
  const { token } = useAuth();
  const { config, loading, error } = useConfig();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>Error loading configuration: {error}</p>
      </div>
    );
  }

  if (!token) {
    return <Login />;
  }

  return (
    <>
      <FeedbackForm
        config={config}
        onSuccess={(msg) => showToast(msg, 'success')}
        onError={(msg) => showToast(msg, 'error')}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.2rem',
    color: '#666',
  },
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.2rem',
    color: '#dc3545',
  },
};

export default App;
