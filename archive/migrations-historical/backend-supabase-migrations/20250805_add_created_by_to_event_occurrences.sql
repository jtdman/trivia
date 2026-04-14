-- Add created_by fields to event_occurrences table for audit trail
-- created_by: 'system' when scheduler generates occurrences
-- created_by: 'manual' when user manually creates occurrences
ALTER TABLE event_occurrences 
ADD COLUMN created_by TEXT DEFAULT 'system' CHECK (created_by IN ('system', 'manual')),
ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id);

-- Add indexes for auditing queries
CREATE INDEX idx_event_occurrences_created_by ON event_occurrences (created_by);
CREATE INDEX idx_event_occurrences_created_by_user_id ON event_occurrences (created_by_user_id);

-- Update existing occurrences (if any) to have created_by = 'system'
UPDATE event_occurrences SET created_by = 'system' WHERE created_by IS NULL;