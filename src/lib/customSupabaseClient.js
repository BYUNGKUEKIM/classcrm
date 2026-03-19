import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://axrzrdnvhkhsnbvvutii.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cnpyZG52aGtoc25idnZ1dGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjMyMjYsImV4cCI6MjA3NzQ5OTIyNn0.gRCtBynCTF8IvJ7hRFFOkqs38vtsetL4TrLFtDrQW6M';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
