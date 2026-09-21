-- Soft-archive flag so catalog rows referenced by orders are never hard-deleted.
ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
