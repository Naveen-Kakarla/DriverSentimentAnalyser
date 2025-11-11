import React from 'react';

interface FeedbackSectionProps {
  entityType: string;
  label: string;
  text: string;
  rating: number;
  onTextChange: (text: string) => void;
  onRatingChange: (rating: number) => void;
}

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({
  entityType,
  label,
  text,
  rating,
  onTextChange,
  onRatingChange,
}) => {
  return (
    <div style={styles.section}>
      <h3 style={styles.label}>{label}</h3>
      
      <div style={styles.ratingContainer}>
        <label style={styles.ratingLabel}>Rating:</label>
        <div style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              style={{
                ...styles.star,
                color: star <= rating ? '#ffc107' : '#ddd',
              }}
              aria-label={`Rate ${star} stars`}
            >
              ★
            </button>
          ))}
        </div>
        <span style={styles.ratingValue}>{rating}/5</span>
      </div>

      <div style={styles.textareaContainer}>
        <label htmlFor={`feedback-${entityType}`} style={styles.textareaLabel}>
          Comments:
        </label>
        <textarea
          id={`feedback-${entityType}`}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`Share your feedback about ${label.toLowerCase()}...`}
          style={styles.textarea}
          rows={4}
        />
      </div>
    </div>
  );
};

const styles = {
  section: {
    padding: '1.5rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  label: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#333',
    fontSize: '1.1rem',
  },
  ratingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  ratingLabel: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#555',
  },
  stars: {
    display: 'flex',
    gap: '0.25rem',
  },
  star: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  ratingValue: {
    fontSize: '0.9rem',
    color: '#666',
  },
  textareaContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  textareaLabel: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#555',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
};
