-- Generate 4 weeks of availability for all verified tutors (8am to 8pm EAT)
DO $$
DECLARE
  tutor_record RECORD;
  base_date TIMESTAMP WITH TIME ZONE;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  week_num INTEGER;
  day_num INTEGER;
  hour_num INTEGER;
BEGIN
  -- Get current time in EAT (UTC+3)
  base_date := NOW() AT TIME ZONE 'Africa/Nairobi';
  base_date := date_trunc('day', base_date);

  -- Loop through all verified tutors
  FOR tutor_record IN 
    SELECT user_id FROM tutor_profiles WHERE verified = true
  LOOP
    -- Generate slots for 4 weeks
    FOR week_num IN 0..3 LOOP
      FOR day_num IN 0..6 LOOP
        FOR hour_num IN 8..19 LOOP -- 8am to 7pm (8pm is end time)
          -- Calculate slot times in EAT, then convert to UTC
          slot_start := (base_date + (week_num * 7 + day_num) * INTERVAL '1 day' + hour_num * INTERVAL '1 hour') AT TIME ZONE 'Africa/Nairobi';
          slot_end := slot_start + INTERVAL '1 hour';

          -- Only insert if slot doesn't exist and is in the future
          IF slot_start > NOW() THEN
            INSERT INTO tutor_availability (tutor_id, start_time, end_time, is_booked, slot_type)
            VALUES (tutor_record.user_id, slot_start, slot_end, false, 'available')
            ON CONFLICT DO NOTHING;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated availability for tutor: %', tutor_record.user_id;
  END LOOP;
END $$;