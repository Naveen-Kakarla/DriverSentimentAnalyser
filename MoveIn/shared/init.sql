-- Driver Sentiment Engine Database Initialization Script
-- This script creates all necessary tables, indexes, and seed data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create feedback_log table
CREATE TABLE feedback_log (
    id SERIAL PRIMARY KEY,
    feedback_id UUID UNIQUE NOT NULL,
    driver_id INTEGER NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    feedback_text TEXT NOT NULL,
    sentiment_score FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on feedback_log table
CREATE INDEX idx_feedback_driver_id ON feedback_log(driver_id);
CREATE INDEX idx_feedback_created_at ON feedback_log(created_at);
CREATE INDEX idx_feedback_driver_created ON feedback_log(driver_id, created_at DESC);

-- Create users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create drivers table for driver reference data
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed data: Insert initial drivers
INSERT INTO drivers (name) VALUES
    ('John Smith'),
    ('Maria Garcia'),
    ('Ahmed Hassan'),
    ('Li Wei'),
    ('Sarah Johnson'),
    ('Carlos Rodriguez'),
    ('Fatima Al-Sayed'),
    ('Raj Patel'),
    ('Emma Wilson'),
    ('Yuki Tanaka');

-- Seed data: Insert admin user
-- Password: admin123 (hashed with bcrypt)
-- Note: This is a placeholder hash. In production, generate proper bcrypt hash
INSERT INTO users (username, password_hash, role) VALUES
    ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/qvQu6', 'admin');

-- Seed data: Insert regular user for testing
-- Password: user123 (hashed with bcrypt)
INSERT INTO users (username, password_hash, role) VALUES
    ('employee', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee');

-- Seed data: Insert sample feedback for analytics demonstration
INSERT INTO feedback_log (feedback_id, driver_id, entity_type, feedback_text, sentiment_score, created_at) VALUES
    -- Positive feedback
    (uuid_generate_v4(), 1, 'driver', 'Excellent service! Very professional and courteous driver.', 4.2, NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), 1, 'driver', 'Great driving skills, felt very safe during the trip.', 4.5, NOW() - INTERVAL '2 days'),
    (uuid_generate_v4(), 2, 'driver', 'Maria was fantastic! On time and very friendly.', 4.8, NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), 3, 'driver', 'Ahmed provided excellent customer service throughout the journey.', 4.3, NOW() - INTERVAL '3 days'),
    (uuid_generate_v4(), 4, 'driver', 'Li Wei is a skilled driver, smooth ride and professional attitude.', 4.6, NOW() - INTERVAL '2 days'),
    
    -- Neutral feedback
    (uuid_generate_v4(), 5, 'driver', 'The ride was okay, nothing special but got me there.', 3.0, NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), 6, 'driver', 'Average service, driver was quiet but professional.', 3.2, NOW() - INTERVAL '4 days'),
    (uuid_generate_v4(), 7, 'driver', 'Standard ride, no complaints but nothing outstanding.', 3.1, NOW() - INTERVAL '2 days'),
    
    -- Negative feedback
    (uuid_generate_v4(), 8, 'driver', 'Driver was late and seemed unprofessional during the trip.', 1.8, NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), 9, 'driver', 'Poor driving skills, felt unsafe. Would not recommend.', 1.2, NOW() - INTERVAL '3 days'),
    (uuid_generate_v4(), 10, 'driver', 'Yuki was rude and the car was not clean.', 1.5, NOW() - INTERVAL '2 days'),
    
    -- More varied feedback over time
    (uuid_generate_v4(), 1, 'driver', 'John always provides great service!', 4.4, NOW() - INTERVAL '5 days'),
    (uuid_generate_v4(), 2, 'driver', 'Maria could improve her punctuality.', 2.8, NOW() - INTERVAL '6 days'),
    (uuid_generate_v4(), 3, 'driver', 'Ahmed was helpful with my luggage.', 4.1, NOW() - INTERVAL '7 days'),
    (uuid_generate_v4(), 4, 'driver', 'Li Wei drives too fast for my comfort.', 2.3, NOW() - INTERVAL '8 days'),
    (uuid_generate_v4(), 5, 'driver', 'Sarah provided excellent customer care.', 4.7, NOW() - INTERVAL '9 days'),
    (uuid_generate_v4(), 6, 'driver', 'Carlos was very professional and courteous.', 4.0, NOW() - INTERVAL '10 days'),
    (uuid_generate_v4(), 7, 'driver', 'Fatima needs to work on communication skills.', 2.5, NOW() - INTERVAL '11 days'),
    (uuid_generate_v4(), 8, 'driver', 'Raj provided a smooth and comfortable ride.', 4.3, NOW() - INTERVAL '12 days'),
    (uuid_generate_v4(), 9, 'driver', 'Emma was friendly but the car had issues.', 2.9, NOW() - INTERVAL '13 days'),
    (uuid_generate_v4(), 10, 'driver', 'Yuki improved significantly, great service today!', 4.2, NOW() - INTERVAL '14 days'),
    
    -- Recent feedback for trends
    (uuid_generate_v4(), 1, 'driver', 'Consistently excellent service from John.', 4.6, NOW() - INTERVAL '6 hours'),
    (uuid_generate_v4(), 2, 'driver', 'Maria was on time and very helpful.', 4.1, NOW() - INTERVAL '12 hours'),
    (uuid_generate_v4(), 3, 'driver', 'Ahmed needs to improve his attitude.', 2.1, NOW() - INTERVAL '18 hours'),
    (uuid_generate_v4(), 4, 'driver', 'Li Wei provided exceptional service today.', 4.8, NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), 5, 'driver', 'Sarah was professional and courteous.', 4.0, NOW() - INTERVAL '1 day');
