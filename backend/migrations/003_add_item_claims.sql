-- Persist WebSocket item claims so diner selections survive backend restarts.
-- Scoped by QR session; one claimer per item within a session.

CREATE TABLE IF NOT EXISTS item_claims (
    id VARCHAR(255) PRIMARY KEY,
    qr_session VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    CONSTRAINT uq_item_claims_session_item UNIQUE (qr_session, item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_claims_qr_session ON item_claims(qr_session);
CREATE INDEX IF NOT EXISTS idx_item_claims_user_id ON item_claims(user_id);

CREATE TRIGGER update_item_claims_updated_at
    BEFORE UPDATE ON item_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
