/*
  # Reset Sample Data

  1. Overview
    - Resets the database to a clean state
    - Removes all sample data
    - Preserves table structures and policies
  
  2. Changes
    - Removes all data from tables that contain sample data
    - Maintains referential integrity
    - Preserves system tables and configurations

  3. Important Notes
    - Does not modify table structures
    - Maintains all security policies
    - Safe to run multiple times
*/

-- Clear all sample data in reverse order of dependencies
-- NOSONAR: Intentional full table clears to reset sample data (plsql:DeleteOrUpdateWithoutWhereCheck)
DELETE FROM impact_metrics;
DELETE FROM charity_documents;
DELETE FROM withdrawal_requests;
DELETE FROM donations;
DELETE FROM charity_details;
DELETE FROM donor_profiles;
DELETE FROM profiles;

-- Reset sequences if any exist
ALTER SEQUENCE IF EXISTS impact_metrics_id_seq RESTART;
ALTER SEQUENCE IF EXISTS charity_documents_id_seq RESTART;
ALTER SEQUENCE IF EXISTS withdrawal_requests_id_seq RESTART;
ALTER SEQUENCE IF EXISTS donations_id_seq RESTART;
ALTER SEQUENCE IF EXISTS charity_details_id_seq RESTART;
ALTER SEQUENCE IF EXISTS donor_profiles_id_seq RESTART;
ALTER SEQUENCE IF EXISTS profiles_id_seq RESTART;