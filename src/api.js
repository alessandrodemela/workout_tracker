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
    try {
        console.log('Fetching routines from workout_tracker schema...');
        
        // Triple join: routine_templates (workout_tracker) -> routine_exercises (workout_tracker) -> exercises (public)
        const { data: relational, error: relError } = await supabase
            .schema('workout_tracker')
            .from('routine_templates')
            .select(`
                *,
                routine_exercises (
                    *,
                    exercises:exercise_id (
                        name
                    )
                )
            `)
            .order('block_number', { ascending: true });

        if (relError) {
            // If the schema workout_tracker is NOT accessible, this will log 42501
            console.error('Error fetching relational templates (42501 CHECK):', relError);
            return { templates: [] };
        }

        if (!relational) return { templates: [] };

        const flattened = [];
        relational.forEach(head => {
            const sorted = (head.routine_exercises || []).sort((a,b) => (a.exercise_order || 0) - (b.exercise_order || 0));
            sorted.forEach(ex => {
                flattened.push({
                    ID: ex.id,
                    Routine_ID: head.id,
                    Block_Number: head.block_number,
                    Mesocycle: head.mesocycle,
                    Split: head.split,
                    Exercise_Name: toTitleCase(ex.exercises?.name || 'Unknown Movement'),
                    Sets: ex.sets,
                    Reps: ex.reps,
                    RPE: ex.rpe,
                    Notes: ex.notes,
                    Is_Active: head.is_active !== false
                });
            });
        });

        return { templates: flattened };
    } catch (err) {
        console.error('Relational fetch crash:', err);
        return { templates: [] };
    }
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
        Session_Type: log.session_type || 'Standard',
        Exercise: toTitleCase(log.exercise),
        Kg: log.kg,
        Sets: log.sets,
        Reps: log.reps,
        RPE: log.rpe,
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
    
    // Calculate block number (maps to new 'block' column)
    const dateObj = new Date(sessionDate);
    const blockNum = getWeekNumber(dateObj);

    const rows = Exercises.map(ex => ({
        date: sessionDate,
        block: blockNum,
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
    const blockNum = getWeekNumber(dateObj);

    const { error } = await supabase
        .from('functional_logs')
        .insert([{
            date: sessionDate,
            block: blockNum,
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

export const markRoutineInactive = async (routineId) => {
    const { error } = await supabase
        .schema('workout_tracker')
        .from('routine_templates')
        .update({ is_active: false })
        .eq('id', routineId);
    if (error) throw error;
    return { status: 'success' };
};

export const updateRoutineMeta = async (routineId, { split, mesocycle }) => {
    const { error } = await supabase
        .schema('workout_tracker')
        .from('routine_templates')
        .update({ split, mesocycle })
        .eq('id', routineId);
    if (error) throw error;
    return { status: 'success' };
};

export const deleteRoutine = async (routineId) => {
    // Delete child exercises first to avoid FK violations
    const { error: exErr } = await supabase
        .schema('workout_tracker')
        .from('routine_exercises')
        .delete()
        .eq('routine_id', routineId);
    if (exErr) throw exErr;

    const { error: tmplErr } = await supabase
        .schema('workout_tracker')
        .from('routine_templates')
        .delete()
        .eq('id', routineId);
    if (tmplErr) throw tmplErr;

    return { status: 'success' };
};

// Profile
export const getUserProfile = async (userId) => {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', userId).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // not found
        throw error;
    }
    return data;
};

export const saveUserProfile = async (userId, profile) => {
    const payload = { user_id: userId, ...profile };
    const { error } = await supabase.from('user_profiles').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    return { status: 'success' };
};

export const saveTemplatesFromAI = async (userId, aiData) => {
    // Handle multiple routines if available
    const routinesToProcess = aiData.routines || [aiData];
    
    console.log(`--- STARTING RELATIONAL IMPORT FOR ${routinesToProcess.length} ROUTINES ---`);

    try {
        // 1. Resolve Exercises (ID Mapping) - Do this once for all routines
        const { data: masterEx, error: masterError } = await supabase
            .schema('workout_tracker')
            .from('exercises')
            .select('id, name');
            
        if (masterError) {
            console.error('Error fetching master exercises:', masterError);
            throw masterError;
        }
        
        const exMap = {};
        (masterEx || []).forEach(e => exMap[e.name.toLowerCase()] = e.id);

        for (const routine of routinesToProcess) {
            const { routine_templates, routine_exercises } = routine || {};
            
            // Fallback/Legacy mapping support
            const template = routine_templates || {
                split: routine.session_type || routine.split,
                mesocycle: routine.mesocycle,
                block_number: routine.block_number || routine.week_number
            };
            const exercises = routine_exercises || routine.exercises || [];

            const { split, mesocycle, block_number } = template;
            console.log(`Processing routine: ${split} | ${mesocycle}`);

            const resolvedExercises = [];
            for (const ex of exercises) {
                let exId = exMap[ex.exercise_name.toLowerCase()];
                if (!exId) {
                    console.log(`Creating new master exercise: ${ex.exercise_name}`);
                    const { data: newEx, error: createError } = await supabase
                        .schema('workout_tracker')
                        .from('exercises')
                        .insert([{ name: ex.exercise_name, target_muscle: 'Other', target_area: 'Other', equipment: 'Other' }])
                        .select().maybeSingle();
                    
                    if (!createError && newEx) {
                        exId = newEx.id;
                        exMap[ex.exercise_name.toLowerCase()] = exId;
                    }
                }
                if (exId) resolvedExercises.push({ ...ex, exercise_id: exId });
            }

            // 2. Upsert Header
            const { data: header, error: headError } = await supabase
                .schema('workout_tracker')
                .from('routine_templates')
                .upsert({
                    user_id: userId,
                    mesocycle,
                    split: split,
                    block_number: block_number || 1,
                    is_active: true
                }, { onConflict: 'user_id,mesocycle,split,block_number' })
                .select().single();

            if (headError) throw headError;

            // 3. Clear old exercises
            await supabase
                .schema('workout_tracker')
                .from('routine_exercises')
                .delete()
                .eq('routine_id', header.id);

            // 4. Insert rows
            const rows = resolvedExercises.map((ex, idx) => ({
                routine_id: header.id,
                exercise_id: ex.exercise_id,
                sets: ex.sets,
                reps: ex.reps?.toString(),
                rpe: ex.rpe,
                notes: ex.notes,
                exercise_order: idx + 1
            }));

            const { error: rowsError } = await supabase
                .schema('workout_tracker')
                .from('routine_exercises')
                .insert(rows);
            
            if (rowsError) throw rowsError;
        }

        console.log('--- RELATIONAL IMPORT SUCCESSFUL ---');
        return { status: 'success' };
    } catch (error) {
        console.error('CRITICAL IMPORT ERROR:', error);
        throw error;
    }
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
    if (key.includes('/profile')) {
         const parts = key.split('/');
         const userId = parts[parts.length - 1];
         return getUserProfile(userId);
    }
    throw new Error(`Unsupported SWR key: ${key}`);
};
