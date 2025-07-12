/*
  # Add Work Language to Volunteer Opportunities

  1. Changes
    - Add work_language column to volunteer_opportunities table
    - Add default value and constraint
    - Update existing records
  
  2. Security
    - Maintains existing RLS policies
*/

-- Add work_language column to volunteer_opportunities table
ALTER TABLE volunteer_opportunities
ADD COLUMN IF NOT EXISTS work_language text DEFAULT 'english' NOT NULL;

-- Add constraint to ensure valid language values
ALTER TABLE volunteer_opportunities
ADD CONSTRAINT volunteer_opportunities_work_language_check
CHECK (work_language IN (
  'english', 
  'spanish', 
  'german', 
  'french', 
  'japanese', 
  'chinese_simplified', 
  'chinese_traditional', 
  'thai', 
  'vietnamese', 
  'korean', 
  'arabic', 
  'hindi',
  'multiple'
));

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_volunteer_opportunities_language
ON volunteer_opportunities(work_language);

-- Update existing records to have a valid language
UPDATE volunteer_opportunities
SET work_language = 'english'
WHERE work_language IS NULL OR work_language = '';