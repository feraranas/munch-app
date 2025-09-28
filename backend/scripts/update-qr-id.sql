-- Update QR table ID from qr-table-001 to 9adc70ea-5215-4792-b2a3-cb61bb022ca8
-- This script updates both the qr_sessions table and the orders table

-- Method 1: Use a transaction with constraint deferring
BEGIN;

-- Defer constraint checking until the end of the transaction
SET CONSTRAINTS ALL DEFERRED;

-- First, update the orders table to reference the new QR session ID
UPDATE orders 
SET qr_session = '9adc70ea-5215-4792-b2a3-cb61bb022ca8' 
WHERE qr_session = 'qr-table-001';

-- Then, update the qr_sessions table ID
UPDATE qr_sessions 
SET id = '9adc70ea-5215-4792-b2a3-cb61bb022ca8' 
WHERE id = 'qr-table-001';

COMMIT;

-- Verify the changes
SELECT 'Updated qr_sessions:' as info;
SELECT id, table_number, created_at FROM qr_sessions WHERE id = '9adc70ea-5215-4792-b2a3-cb61bb022ca8';

SELECT 'Updated orders:' as info;
SELECT id, qr_session, status, total FROM orders WHERE qr_session = '9adc70ea-5215-4792-b2a3-cb61bb022ca8';
