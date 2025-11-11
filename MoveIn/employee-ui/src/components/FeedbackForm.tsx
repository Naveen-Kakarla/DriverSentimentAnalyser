import React, { useState } from 'react';
import { FeedbackSection } from './FeedbackSection';
import { useAuth } from '../context/AuthContext';
import { Config, FeedbackRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http:

interface FeedbackFormProps {
  config: Config | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface FeedbackData {
  text: string;
  rating: number;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  config,
  onSuccess,
  onError,
}) => {
  const { token, logout } = useAuth();
  const [driverId, setDriverId] = useState('');
  const [feedbackData, setFeedbackData] = useState<Record<string, FeedbackData>>({});
  const [loading, setLoading] = useState(false);

  const enabledTargets = Object.entries(config?.feedback_targets || {}).filter(
    ([_, target]) => target.enabled
  );

  const handleTextChange = (entityType: string, text: string) => {
    setFeedbackData((prev) => ({
      ...prev,
      [entityType]: {
        ...prev[entityType],
        text,
        rating: prev[entityType]?.rating || 3,
      },
    }));
  };

  const handleRatingChange = (entityType: string, rating: number) => {
    setFeedbackData((prev) => ({
      ...prev,
      [entityType]: {
        ...prev[entityType],
        rating,
        text: prev[entityType]?.text || '',
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driverId) {
      onError('Please enter a driver ID');
      return;
    }

    const driverIdNum = parseInt(driverId, 10);
    if (isNaN(driverIdNum)) {
      onError('Driver ID must be a number');
      return;
    }

    setLoading(true);

    try {
      
      const submissions = enabledTargets
        .filter(([entityType]) => feedbackData[entityType]?.text?.trim())
        .map(async ([entityType]) => {
          const data = feedbackData[entityType];
          const feedbackRequest: FeedbackRequest = {
            feedback_id: crypto.randomUUID(),
            driver_id: driverIdNum,
            entity_type: entityType,
            text: data.text,
            timestamp: new Date().toISOString(),
          };

          const response = await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(feedbackRequest),
          });

          if (response.status === 401) {
            logout();
            throw new Error('Session expired. Please login again.');
          }

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit feedback');
          }

          return response;
        });

      if (submissions.length === 0) {
        onError('Please provide feedback for at least one category');
        setLoading(false);
        return;
      }

      await Promise.all(submissions);
      
      onSuccess('Feedback submitted successfully!');
      
      
      setDriverId('');
      setFeedbackData({});
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Submit Feedback</h2>
        <button onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="driverId" style={styles.label}>
            Driver ID
          </label>
          <input
            id="driverId"
            type="number"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            required
            style={styles.input}
            disabled={loading}
            placeholder="Enter driver ID"
          />
        </div>

        {enabledTargets.map(([entityType, target]) => (
          <FeedbackSection
            key={entityType}
            entityType={entityType}
            label={target.label}
            text={feedbackData[entityType]?.text || ''}
            rating={feedbackData[entityType]?.rating || 3}
            onTextChange={(text) => handleTextChange(entityType, text)}
            onRatingChange={(rating) => handleRatingChange(entityType, rating)}
          />
        ))}

        <button type="submit" style={styles.submitButton} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    margin: 0,
    color: '#333',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#555',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  submitButton: {
    padding: '1rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
};
