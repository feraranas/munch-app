-- Initial schema for munch_app PostgreSQL database
-- This recreates the structure from the existing SQLite database

-- Create QR Sessions table
CREATE TABLE IF NOT EXISTS qr_sessions (
    id VARCHAR(255) PRIMARY KEY,
    qr_image_data TEXT NOT NULL,
    current_order VARCHAR(255),
    table_number VARCHAR(255),
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Create Orders table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    qr_session VARCHAR(255) NOT NULL,
    items TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    
    -- Add foreign key constraint
    CONSTRAINT fk_orders_qr_session 
        FOREIGN KEY (qr_session) 
        REFERENCES qr_sessions(id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_sessions_created_at ON qr_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_table_number ON qr_sessions(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_qr_session ON orders(qr_session);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = EXTRACT(EPOCH FROM NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for qr_sessions table
CREATE TRIGGER update_qr_sessions_updated_at 
    BEFORE UPDATE ON qr_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
