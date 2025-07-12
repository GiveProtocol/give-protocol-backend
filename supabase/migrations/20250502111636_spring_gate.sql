BEGIN;

-- Create sample charity details directly without relying on auth.users
-- We'll use the current user's profile IDs instead of hardcoded UUIDs

-- First, get the current user's ID
DO $$
DECLARE
  current_user_id uuid;
  charity_profile_id uuid;
  donor_profile_id uuid;
  opportunity_record record;
  donation_record record;
  skill_record record;
BEGIN
  -- Get the current user's ID (will be used for testing)
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NOT NULL THEN
    -- Create a charity profile for the current user if it doesn't exist
    INSERT INTO profiles (user_id, type)
    VALUES (current_user_id, 'charity')
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO charity_profile_id;
    
    -- If we couldn't create a charity profile, try to get an existing one
    IF charity_profile_id IS NULL THEN
      SELECT id INTO charity_profile_id FROM profiles WHERE user_id = current_user_id LIMIT 1;
    END IF;
    
    -- Create charity details for this profile
    IF charity_profile_id IS NOT NULL THEN
      INSERT INTO charity_details (profile_id, name, description, category, image_url, total_received, available_balance, updated_at)
      VALUES 
        (charity_profile_id, 'Global Water Foundation', 'Providing clean water solutions worldwide', 'Water & Sanitation', 'https://images.unsplash.com/photo-1538300342682-cf57afb97285?auto=format&fit=crop&w=800', 75000, 50000, now())
      ON CONFLICT (profile_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        image_url = EXCLUDED.image_url,
        total_received = EXCLUDED.total_received,
        available_balance = EXCLUDED.available_balance,
        updated_at = EXCLUDED.updated_at;
    END IF;
    
    -- Create a donor profile for testing donations
    INSERT INTO profiles (user_id, type)
    VALUES (current_user_id, 'donor')
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO donor_profile_id;
    
    -- If we couldn't create a donor profile, try to get an existing one
    IF donor_profile_id IS NULL THEN
      SELECT id INTO donor_profile_id FROM profiles WHERE user_id = current_user_id LIMIT 1;
    END IF;
    
    -- Create donor profile details
    IF donor_profile_id IS NOT NULL THEN
      INSERT INTO donor_profiles (profile_id, donation_frequency, total_donated, created_at, updated_at)
      VALUES 
        (donor_profile_id, 'monthly', 5000, now() - interval '15 days', now())
      ON CONFLICT (profile_id) DO UPDATE SET
        donation_frequency = EXCLUDED.donation_frequency,
        total_donated = EXCLUDED.total_donated,
        updated_at = EXCLUDED.updated_at;
    END IF;
    
    -- Create sample donations if both profiles exist
    IF charity_profile_id IS NOT NULL AND donor_profile_id IS NOT NULL THEN
      INSERT INTO donations (donor_id, charity_id, amount, created_at)
      VALUES 
        (donor_profile_id, charity_profile_id, 2000, now() - interval '14 days'),
        (donor_profile_id, charity_profile_id, 1500, now() - interval '10 days'),
        (donor_profile_id, charity_profile_id, 1500, now() - interval '7 days')
      ON CONFLICT DO NOTHING;
      
      -- Create sample volunteer opportunities
      INSERT INTO volunteer_opportunities (charity_id, title, description, skills, commitment, location, type, status, work_language, created_at, updated_at)
      VALUES 
        (charity_profile_id, 'Web Development for Water Projects', 'Help build our website for tracking water projects', ARRAY['Web Development', 'React', 'Node.js'], 'short-term', 'Remote', 'remote', 'active', 'english', now() - interval '13 days', now()),
        (charity_profile_id, 'Educational Content Creation', 'Create educational materials for underprivileged students', ARRAY['Content Creation', 'Teaching', 'Design'], 'long-term', 'Hybrid - New York', 'hybrid', 'active', 'english', now() - interval '11 days', now())
      ON CONFLICT DO NOTHING;
      
      -- Get the opportunity IDs
      FOR opportunity_record IN 
        SELECT id FROM volunteer_opportunities WHERE charity_id = charity_profile_id LIMIT 1
      LOOP
        -- Create sample volunteer applications
        INSERT INTO volunteer_applications (opportunity_id, applicant_id, full_name, phone_number, email, availability, commitment_type, experience, skills, status, created_at, updated_at)
        VALUES 
          (opportunity_record.id, donor_profile_id, 'John Donor', '+1234567890', 'john@example.com', '{"days": ["Monday", "Wednesday"], "times": ["Evening"]}', 'short-term', 'I have 5 years of web development experience', ARRAY['Web Development', 'React'], 'pending', now() - interval '12 days', now())
        ON CONFLICT DO NOTHING;
      END LOOP;
      
      -- Create sample volunteer hours
      INSERT INTO volunteer_hours (volunteer_id, charity_id, hours, description, date_performed, status, created_at)
      VALUES 
        (donor_profile_id, charity_profile_id, 8, 'Developed website homepage', '2025-04-15', 'pending', now() - interval '5 days'),
        (donor_profile_id, charity_profile_id, 4, 'Fixed website bugs', '2025-04-20', 'pending', now() - interval '1 day')
      ON CONFLICT DO NOTHING;
      
      -- Create sample user skills
      FOR skill_record IN 
        SELECT id FROM skills WHERE name IN ('Web Development', 'Project Management') LIMIT 2
      LOOP
        INSERT INTO user_skills (user_id, skill_id, proficiency_level, created_at)
        VALUES 
          (donor_profile_id, skill_record.id, 'expert', now() - interval '14 days')
        ON CONFLICT DO NOTHING;
      END LOOP;
      
      -- Create sample skill endorsements
      FOR skill_record IN 
        SELECT id FROM skills WHERE name = 'Web Development' LIMIT 1
      LOOP
        INSERT INTO skill_endorsements (endorser_id, recipient_id, skill_id, created_at)
        VALUES 
          (charity_profile_id, donor_profile_id, skill_record.id, now() - interval '4 days')
        ON CONFLICT DO NOTHING;
      END LOOP;
      
      -- Create sample user preferences
      INSERT INTO user_preferences (user_id, notification_preferences, privacy_settings, created_at, updated_at)
      VALUES 
        (donor_profile_id, '{"email": true, "push": false}', '{"showDonations": true, "showVolunteerHours": true}', now() - interval '14 days', now())
      ON CONFLICT DO NOTHING;
      
      -- Create sample wallet aliases
      INSERT INTO wallet_aliases (user_id, wallet_address, alias, created_at, updated_at)
      VALUES 
        (current_user_id, '0x1234567890123456789012345678901234567890', 'GenerousDonor', now() - interval '14 days', now())
      ON CONFLICT DO NOTHING;
      
      -- Create sample donation impacts
      FOR donation_record IN 
        SELECT id FROM donations WHERE charity_id = charity_profile_id LIMIT 1
      LOOP
        INSERT INTO donation_impacts (donation_id, metric_name, metric_value, impact_description, created_at)
        VALUES 
          (donation_record.id, 'People Helped', 100, 'Number of people who received clean water', now() - interval '1 day')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
END $$;

-- Insert sample data for charity categories if they don't exist
INSERT INTO charity_categories (name, description)
VALUES 
  ('Water & Sanitation', 'Clean water and sanitation projects'),
  ('Education', 'Educational programs and initiatives'),
  ('Healthcare', 'Medical services and health programs'),
  ('Environment', 'Environmental conservation efforts'),
  ('Poverty Relief', 'Programs addressing poverty and basic needs'),
  ('Animal Welfare', 'Animal protection and welfare programs')
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description;

-- Insert sample skills if they don't exist
INSERT INTO skills (name, category, description)
VALUES
  ('Web Development', 'Technology', 'Building and maintaining websites'),
  ('Project Management', 'Leadership', 'Managing projects and teams'),
  ('Event Planning', 'Organization', 'Planning and coordinating events'),
  ('Fundraising', 'Development', 'Raising funds for charitable causes'),
  ('Teaching', 'Education', 'Educational instruction and training'),
  ('Marketing', 'Communication', 'Promoting organizations and causes'),
  ('Data Analysis', 'Technology', 'Analyzing and interpreting data'),
  ('Community Building', 'Leadership', 'Building and engaging communities'),
  ('Social Media', 'Communication', 'Managing social media presence'),
  ('Research', 'Analysis', 'Conducting research and analysis')
ON CONFLICT (name) DO UPDATE 
SET 
  category = EXCLUDED.category,
  description = EXCLUDED.description;

COMMIT;