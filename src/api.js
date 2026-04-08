import { supabase } from './supabaseClient';

export const toTitleCase = (str) => {
    if (!str) return '';
    return str.split(' ')
        .map(word => (word.length > 1 && word === word.toUpperCase()) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Compatibility Layer (optional, but good for SWR keys)
export const API_URL = 'supabase';

export const checkHealth = async () => {
    try {
        const { error } = await supabase.from('exercises').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
             return false;
        }
        return true;
    } catch {
        return false;
    }
};

export const getExercises = async () => {
    const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        console.error('Error fetching exercises:', error);
        throw error;
    }
    
    return {
        exercises: data.map(ex => ex.name),
        full_list: data.map(ex => ({
            ID_Exercise: ex.id,
            Exercise_Name: toTitleCase(ex.name),
            Target_Muscle: toTitleCase(ex.target_muscle),
            Target_Area: toTitleCase(ex.target_area),
            Equipment: toTitleCase(ex.equipment),
            Notes: ex.notes
        }))
    };
};

export const getExerciseHistory = async (exerciseName) => {
    // 1. Get classical logs (Weightlifting)
    const { data: logs, error } = await supabase
        .from('workout_logs')
        .select('*')
        .ilike('exercise', exerciseName)
        .order('date', { ascending: false });
    
    if (error) throw error;

    // 2. Get functional logs (EMOM/AMRAP/Circuit)
    const { data: functional } = await supabase
        .from('functional_logs')
        .select('*')
        .order('date', { ascending: false });

    // Filter functional sessions that included this exercise in their splits
    const relatedFunctional = (functional || []).filter(f => 
        f.splits && Array.isArray(f.splits) && f.splits.some(s => s.title?.toLowerCase() === exerciseName.toLowerCase())
    );

    // Map functional participations to a compatible log format
    const functionalAsLogs = relatedFunctional.map(f => ({
        ...f,
        exercise: exerciseName,
        kg: 0, 
        sets: 1,
        reps: 'Done',
        is_functional_participation: true
    }));

    // 3. Merge and Sort
    const allData = [...logs, ...functionalAsLogs].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate PB from classical logs only (since functional has no weight)
    let pb = null;
    let currentMaxKg = -1;
    logs.forEach(log => {
        const kg = parseFloat(log.kg || 0);
        if (kg > currentMaxKg) {
            currentMaxKg = kg;
            pb = log;
        }
    });

    const formattedHistory = allData.map(log => ({
        ...log,
        Date: log.date,
        Exercise: toTitleCase(log.exercise),
        Kg: log.kg || 0,
        Sets: log.sets,
        Reps: log.reps,
        RPE: log.rpe || 8,
        Notes: log.notes,
        Type: log.is_functional_participation ? 'Functional' : 'Weight'
    }));

    const formattedPb = pb ? {
        Kg: pb.kg,
        Reps: pb.reps,
        Date: pb.date,
    } : null;

    return { history: formattedHistory, pb: formattedPb };
};

export const getTemplates = async () => {
    const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .order('id', { ascending: true });
    
    if (error) {
        if (error.code === 'PGRST116') return { templates: [] }; // Handle no data gracefully
        throw error;
    }
    
    const formattedTemplates = (data || []).map(t => ({
        ID: t.id,
        Week_Number: t.week_number,
        Mesocycle: t.mesocycle,
        Split: t.split,
        Exercise_Number: t.exercise_number,
        Exercise_Name: toTitleCase(t.exercise_name),
        Sets: t.sets,
        Reps: t.reps,
        RPE: t.rpe,
        Notes: t.notes
    }));
    
    return { templates: formattedTemplates };
};

export const getWorkoutHistory = async () => {
    const { data: logs, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .order('date', { ascending: false });

    const { data: functional, error: funcError } = await supabase
        .from('functional_logs')
        .select('*')
        .order('date', { ascending: false });

    if (logsError) throw logsError;
    if (funcError) throw funcError;

    // We also need dim_exercises to get Target_Muscle (joining in memory for simplicity or we could use Supabase joins)
    const { data: exercises } = await supabase.from('exercises').select('name, target_muscle');
    const muscleMap = (exercises || []).reduce((acc, curr) => {
        acc[curr.name.toUpperCase()] = curr.target_muscle;
        return acc;
    }, {});

    const enrichedWorkouts = (logs || []).map(log => ({
        ...log,
        Date: log.date,
        Session_Type: log.session_type,
        Exercise: toTitleCase(log.exercise),
        Kg: log.kg,
        Sets: log.sets,
        Reps: log.reps,
        Target_Muscle: toTitleCase((log.exercise && muscleMap[log.exercise.toUpperCase()]) || null)
    }));

    const enrichedFunctional = (functional || []).map(f => ({
        ...f,
        Date: f.date,
        Session_Type: f.session_type,
        Exercise: toTitleCase(f.exercise),
        Duration_Seconds: f.duration_seconds,
        Splits: f.splits
    }));

    return { 
        workouts: enrichedWorkouts, 
        functional: enrichedFunctional 
    };
};

export const saveWorkoutSession = async (session, userId) => {
    const { Date: sessionDate, Session_Type, Mesocycle, Notes, Exercises } = session;
    
    // Calculate week number (or use current logic)
    const dateObj = new Date(sessionDate);
    const weekNum = getWeekNumber(dateObj);

    const rows = Exercises.map(ex => ({
        date: sessionDate,
        week: weekNum,
        session_type: Session_Type,
        mesocycle: Mesocycle,
        exercise: ex.Exercise,
        kg: ex.Kg,
        sets: ex.Sets,
        reps: ex.Reps,
        rpe: ex.RPE,
        notes: (ex.Notes && Notes) ? `${ex.Notes}\n${Notes}` : (ex.Notes || Notes || ''),
        user_id: userId
    }));

    const { error } = await supabase
        .from('workout_logs')
        .insert(rows);

    if (error) throw error;
    return { status: 'success' };
};

export const saveFunctionalSession = async (session, userId) => {
    const { Date: sessionDate, Session_Type, Exercise, Notes, Duration_Seconds, Splits } = session || {};
    const dateObj = new Date(sessionDate);
    const weekNum = getWeekNumber(dateObj);

    const { error } = await supabase
        .from('functional_logs')
        .insert([{
            date: sessionDate,
            week: weekNum,
            session_type: Session_Type,
            exercise: (Exercise || 'Functional Circuit'),
            notes: Notes,
            user_id: userId,
            duration_seconds: Duration_Seconds || null,
            splits: Splits || null
        }]);

    if (error) throw error;
    return { status: 'success' };
};

export const mapTemplateExercises = async (mapping) => {
    // Current mapping is { "Old Name": "New Name" }
    // We iterate and update workout_templates
    for (const [oldName, newName] of Object.entries(mapping)) {
        const { error } = await supabase
            .from('workout_templates')
            .update({ exercise_name: newName.toLowerCase() })
            .ilike('exercise_name', oldName);
        if (error) throw error;
    }
    return { status: 'success' };
};

export const addExercise = async (ex) => {
    const { error } = await supabase
        .from('exercises')
        .insert([{
            name: ex.Exercise_Name,
            target_muscle: ex.Target_Muscle,
            target_area: ex.Target_Area,
            equipment: ex.Equipment,
            notes: ex.Notes || ''
        }]);

    if (error) throw error;
    return { status: 'success' };
};

export const bulkAddExercises = async (exercises) => {
    const rows = exercises.map(ex => ({
        name: ex.Exercise_Name,
        target_muscle: ex.Target_Muscle,
        target_area: ex.Target_Area,
        equipment: ex.Equipment,
        notes: ex.Notes || ''
    }));

    const { error } = await supabase
        .from('exercises')
        .insert(rows);

    if (error) throw error;
    return { status: 'success' };
};

// Helper
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// SWR Fetcher shim
export const fetcher = async (key) => {
    if (key.includes('/exercises')) return getExercises();
    if (key.includes('/templates')) return getTemplates();
    if (key.includes('/workout-history')) return getWorkoutHistory();
    if (key.includes('/history')) {
         const parts = key.split('/');
         const exName = parts[parts.length - 1]; 
         return getExerciseHistory(decodeURIComponent(exName));
    }
    throw new Error(`Unsupported SWR key: ${key}`);
};
