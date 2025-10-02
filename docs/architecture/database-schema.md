# Database Schema

PostgreSQL schema optimized for business workflows and performance:

```sql
-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'SALES', 'ACCOUNTS', 'MANAGER', 'ACCOUNTANT');

-- Document categories enum
CREATE TYPE document_category AS ENUM ('INVOICE', 'PURCHASE_ORDER', 'DELIVERY_ORDER', 'SALES_RECEIPT', 'OTHER');

-- Receivable status enum
CREATE TYPE receivable_status AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED');

-- Users table with role-based access
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table with payment tracking
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    payment_terms INTEGER DEFAULT 30, -- days
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table with automatic categorization
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_name VARCHAR(500) NOT NULL,
    stored_path VARCHAR(1000) NOT NULL,
    category document_category NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by_id UUID NOT NULL REFERENCES users(id),
    linked_to_customer_id UUID REFERENCES customers(id),
    linked_to_receivable_id UUID REFERENCES receivables(id),
    linked_to_sales_report_id UUID REFERENCES sales_reports(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Search optimization
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760) -- 10MB limit
);

-- Performance indexes for business queries
CREATE INDEX idx_customers_name_search ON customers USING gin(to_tsvector('english', name));
CREATE INDEX idx_customers_active ON customers(is_active) WHERE is_active = true;
CREATE INDEX idx_receivables_customer_status ON receivables(customer_id, status);
CREATE INDEX idx_receivables_due_date ON receivables(due_date) WHERE status IN ('PENDING', 'OVERDUE');
CREATE INDEX idx_documents_category_customer ON documents(category, linked_to_customer_id);

-- Additional tables for receivables, follow_ups, outlets, sales_reports, employees, 
-- attendance_records, notifications, and audit_logs follow similar patterns...
```
