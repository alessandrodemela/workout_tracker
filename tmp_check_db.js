import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to find .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function checkColumns() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.log("Supabase credentials not found in env");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("Checking workout_logs columns...");
    const { data, error } = await supabase.from('workout_logs').select('*').limit(1);
    
    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Columns found in workout_logs:", Object.keys(data[0]));
    } else {
        console.log("No data in workout_logs to check columns.");
        // Try getting column names via a rpc or just guessing common names
    }

    console.log("\nChecking functional_logs columns...");
    const { data: fData, error: fError } = await supabase.from('functional_logs').select('*').limit(1);
    if (fData && fData.length > 0) {
        console.log("Columns found in functional_logs:", Object.keys(fData[0]));
    }
}

checkColumns();
