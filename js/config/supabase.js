import { createClient } from 'https://esm.sh/@supabase/supabase-js@2' // Supabase JS SDK

export const supabase = createClient (
    'https://bwchxuzhvmdjtkzexqiy.supabase.co', // Supabase URL
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Y2h4dXpodm1kanRremV4cWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzUzNzksImV4cCI6MjA3NjkxMTM3OX0.aTUMlJZRBML7CT671ouLL-eMLplY54UcSTRHcmZxwVo' // Supabase anon key
)