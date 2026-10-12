import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnhfrjjxtnknuitdgrhn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaGZyamp4dG5rbnVpdGRncmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NTcyODYsImV4cCI6MjEwNzMzMzI4Nn0.i-lR2i20XcdtIXUhhDl7AMkq0Wth7QN19pfkFRT0F5U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
