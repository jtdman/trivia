-- Trivia Finder Database Backup
-- Generated: 2025-07-07
-- Database: trivia-finder
-- Tables: trivia_providers, venues, events, event_occurrences, api_usage_log

-- Backup of trivia_providers table
-- Contains: 1 record
-- Primary provider: Challenge Entertainment

-- Backup of venues table  
-- Contains: 722 records
-- Google Places validated venues with location data

-- Backup of events table
-- Contains: 2,888 records
-- Trivia events scraped from Challenge Entertainment

-- Backup of event_occurrences table
-- Contains: 0 records
-- Event occurrence tracking (empty)

-- Backup of api_usage_log table
-- Contains: 732 records
-- Google Places API usage logging

-- Note: This is a placeholder backup file. 
-- The actual data backup would be too large to generate via single queries.
-- Consider using pg_dump or Supabase's backup tools for complete data export.

-- Current database statistics:
-- Total venues: 722
-- Total events: 2,888
-- Total providers: 1
-- Total API calls logged: 732

-- Schema backup would include:
-- 1. Table definitions with PostGIS geometry columns
-- 2. Indexes and constraints
-- 3. RLS policies (if any)
-- 4. Functions and triggers