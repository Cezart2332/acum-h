-- Enhanced AI Restaurant Database Schema
-- Compatible with MySQL 8.0+

-- Create database
CREATE DATABASE IF NOT EXISTS restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_db;

-- Tags table (shared across all entities)
CREATE TABLE tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    category ENUM('cuisine', 'dietary', 'atmosphere', 'price', 'service', 'event_type') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants table
CREATE TABLE restaurants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    address TEXT,
    description TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    contact VARCHAR(255),
    image LONGTEXT, -- Base64 encoded image
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    opening_hours JSON,
    price_range ENUM('$', '$$', '$$$', '$$$$') DEFAULT '$$',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_rating (rating),
    INDEX idx_active (is_active),
    FULLTEXT idx_search (name, category, description, address)
);

-- Menu items table
CREATE TABLE menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    ingredients TEXT, -- Comma-separated list
    allergens TEXT, -- Comma-separated list
    calories INT,
    preparation_time INT, -- in minutes
    is_available BOOLEAN DEFAULT TRUE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_spicy BOOLEAN DEFAULT FALSE,
    spice_level ENUM('mild', 'medium', 'hot', 'very_hot'),
    image LONGTEXT, -- Base64 encoded image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_category (category),
    INDEX idx_price (price),
    INDEX idx_available (is_available),
    FULLTEXT idx_search (name, description, ingredients)
);

-- Events table
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATETIME NOT NULL,
    end_date DATETIME,
    location VARCHAR(255),
    venue_id INT, -- Reference to restaurants if event is at a restaurant
    category VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 0.00,
    max_capacity INT,
    current_attendees INT DEFAULT 0,
    image LONGTEXT, -- Base64 encoded image
    contact_info VARCHAR(255),
    ticket_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(100), -- e.g., 'weekly', 'monthly'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (venue_id) REFERENCES restaurants(id) ON DELETE SET NULL,
    INDEX idx_date (date),
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_venue (venue_id),
    FULLTEXT idx_search (title, description, location)
);

-- Restaurant tags junction table
CREATE TABLE restaurant_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_restaurant_tag (restaurant_id, tag_id)
);

-- Event tags junction table
CREATE TABLE event_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_tag (event_id, tag_id)
);

-- User reviews table (for future AI learning)
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT,
    event_id INT,
    user_id VARCHAR(255), -- Can be anonymous or user identifier
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    helpful_count INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_event (event_id),
    INDEX idx_rating (rating),
    FULLTEXT idx_review_text (review_text)
);

-- AI chat interactions table (for learning and analytics)
CREATE TABLE chat_interactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255),
    query_text TEXT NOT NULL,
    intent VARCHAR(100),
    response_text TEXT,
    search_results JSON,
    processing_time DECIMAL(8,3), -- in seconds
    user_rating INT CHECK (user_rating >= 1 AND user_rating <= 5),
    feedback_text TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_intent (intent),
    INDEX idx_session (session_id),
    INDEX idx_created (created_at),
    FULLTEXT idx_query (query_text)
);

-- Insert sample tags
INSERT INTO tags (name, category) VALUES
-- Cuisine types
('Italian', 'cuisine'),
('Romanian', 'cuisine'),
('Asian', 'cuisine'),
('Mediterranean', 'cuisine'),
('Mexican', 'cuisine'),
('Indian', 'cuisine'),
('French', 'cuisine'),
('American', 'cuisine'),
('Japanese', 'cuisine'),
('Chinese', 'cuisine'),

-- Dietary preferences
('Vegetarian', 'dietary'),
('Vegan', 'dietary'),
('Gluten-Free', 'dietary'),
('Halal', 'dietary'),
('Kosher', 'dietary'),
('Organic', 'dietary'),
('Low-Carb', 'dietary'),
('Keto', 'dietary'),

-- Atmosphere
('Casual', 'atmosphere'),
('Fine Dining', 'atmosphere'),
('Family Friendly', 'atmosphere'),
('Romantic', 'atmosphere'),
('Business', 'atmosphere'),
('Outdoor Seating', 'atmosphere'),
('Live Music', 'atmosphere'),
('Quiet', 'atmosphere'),
('Lively', 'atmosphere'),

-- Price ranges
('Budget Friendly', 'price'),
('Mid Range', 'price'),
('Expensive', 'price'),
('Luxury', 'price'),

-- Service types
('Delivery', 'service'),
('Takeout', 'service'),
('Dine In', 'service'),
('Buffet', 'service'),
('Fast Food', 'service'),
('Food Truck', 'service'),

-- Event types
('Concert', 'event_type'),
('Festival', 'event_type'),
('Workshop', 'event_type'),
('Tasting', 'event_type'),
('Party', 'event_type'),
('Exhibition', 'event_type'),
('Sports', 'event_type'),
('Cultural', 'event_type');

-- Sample restaurant data
INSERT INTO restaurants (name, category, address, description, rating, contact, price_range) VALUES
('La Mama', 'Romanian', 'Strada Episcopiei 9, București', 'Restaurantul tradițional cu preparate românești autentice și atmosferă caldă.', 4.5, '+40 21 312 9797', '$$'),
('Casa Doina', 'Romanian', 'Șoseaua Kiseleff 4, București', 'Emblematic restaurant cu specific românesc și grădină frumoasă.', 4.3, '+40 21 222 3179', '$$$'),
('Caru cu Bere', 'Romanian', 'Strada Stavropoleos 5, București', 'Restaurant istoric în Centrul Vechi cu arhitectură gotică și muzică live.', 4.2, '+40 21 313 7560', '$$'),
('Trattoria Il Calcio', 'Italian', 'Strada Francesa 62, București', 'Autentic restaurant italian cu paste făcute în casă și pizza la cuptor.', 4.4, '+40 21 211 4747', '$$'),
('Kane Restaurant', 'Mediterranean', 'Strada Arthur Verona 16, București', 'Restaurant modern cu bucătărie mediteraneană și atmosphere relaxată.', 4.6, '+40 21 650 5020', '$$$');

-- Sample menu items
INSERT INTO menu_items (restaurant_id, name, description, price, category, ingredients, is_vegetarian) VALUES
(1, 'Mici', 'Mici tradiționali din carne de porc și vită cu muștar și pâine', 18.50, 'Feluri principale', 'carne porc, carne vită, usturoi, condimente', FALSE),
(1, 'Ciorbă de burtă', 'Ciorbă tradițională cu burtă de vită și smântână', 16.00, 'Ciorbe', 'burtă vită, legume, smântână, oțet', FALSE),
(1, 'Papanași', 'Desert tradițional cu brânză dulce, smântână și dulceață', 14.00, 'Deserturi', 'brânză dulce, smântână, dulceață, făină', TRUE),
(2, 'Miel la proțap', 'Miel la grătar cu garnitură de legume', 45.00, 'Feluri principale', 'miel, rozmarin, usturoi, legume', FALSE),
(4, 'Pizza Margherita', 'Pizza clasică cu roșii, mozzarella și busuioc', 22.00, 'Pizza', 'blat pizza, roșii, mozzarella, busuioc', TRUE),
(4, 'Spaghetti Carbonara', 'Paste cu ou, bacon și parmezan', 26.00, 'Paste', 'spaghetti, ou, bacon, parmezan, piper', FALSE);

-- Sample events
INSERT INTO events (title, description, date, location, category, price) VALUES
('Festival Gastronomic București', 'Festival cu standuri de mâncare de la cele mai bune restaurante din oraș', '2024-06-15 18:00:00', 'Parcul Herăstrău', 'Festival', 25.00),
('Degustare de vinuri românești', 'Seară de degustare cu vinuri din toate regiunile României', '2024-06-20 19:00:00', 'Casa Doina', 'Tasting', 75.00),
('Concert jazz în Centrul Vechi', 'Concert de jazz în aer liber cu artiști locali', '2024-06-22 20:00:00', 'Piața Amzei', 'Concert', 0.00),
('Workshop gatit italian', 'Învață să faci pasta și pizza autentice cu chef italian', '2024-06-25 16:00:00', 'Trattoria Il Calcio', 'Workshop', 150.00);

-- Create indexes for better AI query performance
CREATE INDEX idx_restaurants_search ON restaurants(name, category, description(255));
CREATE INDEX idx_menu_search ON menu_items(name, description(255), ingredients(255));
CREATE INDEX idx_events_search ON events(title, description(255), location);

-- Create views for AI system
CREATE VIEW restaurant_summary AS
SELECT 
    r.id,
    r.name,
    r.category,
    r.address,
    r.description,
    r.rating,
    r.contact,
    r.image,
    r.price_range,
    GROUP_CONCAT(DISTINCT t.name) as tags,
    COUNT(DISTINCT m.id) as menu_items_count,
    AVG(rev.rating) as avg_review_rating,
    COUNT(DISTINCT rev.id) as review_count
FROM restaurants r
LEFT JOIN restaurant_tags rt ON r.id = rt.restaurant_id
LEFT JOIN tags t ON rt.tag_id = t.id
LEFT JOIN menu_items m ON r.id = m.restaurant_id
LEFT JOIN reviews rev ON r.id = rev.restaurant_id
WHERE r.is_active = TRUE
GROUP BY r.id;

CREATE VIEW event_summary AS
SELECT 
    e.id,
    e.title,
    e.description,
    e.date,
    e.location,
    e.category,
    e.price,
    r.name as venue_name,
    GROUP_CONCAT(DISTINCT t.name) as tags,
    COUNT(DISTINCT rev.id) as review_count
FROM events e
LEFT JOIN restaurants r ON e.venue_id = r.id
LEFT JOIN event_tags et ON e.id = et.event_id
LEFT JOIN tags t ON et.tag_id = t.id
LEFT JOIN reviews rev ON e.id = rev.event_id
WHERE e.is_active = TRUE
GROUP BY e.id;

-- Performance optimization
ANALYZE TABLE restaurants;
ANALYZE TABLE menu_items;
ANALYZE TABLE events;
ANALYZE TABLE tags;

-- Grant permissions (adjust as needed)
-- CREATE USER 'ai_user'@'localhost' IDENTIFIED BY 'secure_password';
-- GRANT SELECT, INSERT, UPDATE ON restaurant_db.* TO 'ai_user'@'localhost';
-- FLUSH PRIVILEGES;