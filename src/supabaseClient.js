import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let client;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[WorkoutTracker] Missing Supabase environment variables! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  // Provide a dummy client that doesn't crash on 'from()' but returns errors safely
  client = {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: null, error: new Error('Missing Supabase Config') }) }),
      insert: () => Promise.resolve({ error: new Error('Missing Supabase Config') }),
      update: () => ({ eq: () => Promise.resolve({ error: new Error('Missing Supabase Config') }) }),
    })
  };
} else {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'workout_tracker' }
  });
}

export const supabase = client;
