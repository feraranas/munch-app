-- Line items covered by a payment so split checks can pay a subset of the order.
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS item_ids TEXT NOT NULL DEFAULT '[]';
