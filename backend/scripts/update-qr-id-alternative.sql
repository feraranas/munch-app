-- Alternative method: Create temporary record and update
-- This approach avoids foreign key constraint issues

BEGIN;

-- Step 1: Create a temporary QR session with the new ID
INSERT INTO qr_sessions (id, qr_image_data, table_number, created_at, updated_at)
SELECT '9adc70ea-5215-4792-b2a3-cb61bb022ca8', qr_image_data, table_number, created_at, updated_at
FROM qr_sessions 
WHERE id = 'qr-table-001';

-- Step 2: Update all orders to reference the new QR session ID
UPDATE orders 
SET qr_session = '9adc70ea-5215-4792-b2a3-cb61bb022ca8' 
WHERE qr_session = 'qr-table-001';

-- Step 3: Delete the old QR session
DELETE FROM qr_sessions 
WHERE id = 'qr-table-001';

COMMIT;

-- Verify the changes
SELECT 'Updated qr_sessions:' as info;
SELECT id, table_number, created_at FROM qr_sessions WHERE id = '9adc70ea-5215-4792-b2a3-cb61bb022ca8';

SELECT 'Updated orders:' as info;
SELECT id, qr_session, status, total FROM orders WHERE qr_session = '9adc70ea-5215-4792-b2a3-cb61bb022ca8';
