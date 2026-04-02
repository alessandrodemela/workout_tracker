import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let client;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Strive] Missing Supabase environment variables! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  // Provide a dummy client that doesn't crash on 'from()' but returns errors safely
  // Provide a dummy client that doesn't crash on chaining but returns errors safely
  const handler = {
    get: (target, prop) => {
      if (['from', 'select', 'eq', 'order', 'limit', 'insert', 'update'].includes(prop)) {
        return () => new Proxy({}, handler);
      }
      if (prop === 'then') {
        return (resolve) => resolve({ data: null, error: new Error('Missing Supabase Config') });
      }
      return () => new Proxy({}, handler);
    }
  };
  client = new Proxy({}, handler);
} else {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'workout_tracker' }
  });
}

export const supabase = client;
