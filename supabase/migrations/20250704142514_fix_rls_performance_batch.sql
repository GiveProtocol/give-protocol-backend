-- Fix RLS performance issues by wrapping auth.uid() in subqueries
-- This prevents re-evaluation for each row

