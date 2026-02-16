-- Add 'marketplace' to the message_channel enum for in-app inquiries
ALTER TYPE message_channel ADD VALUE IF NOT EXISTS 'marketplace';
