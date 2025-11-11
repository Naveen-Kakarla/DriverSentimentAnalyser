import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const backgroundColor = type === 'success' ? '#28a745' : '#dc3545';

  return (
    <div style={{ ...styles.toast, backgroundColor }}>
      <span style={styles.message}>{message}</span>
      <button onClick={onClose} style={styles.closeButton}>
        ×
      </button>
    </div>
  );
};

const styles = {
  toast: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    borderRadius: '4px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out',
  },
  message: {
    fontSize: '1rem',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
};
