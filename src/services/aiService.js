import { supabase } from '../supabaseClient';
import { toTitleCase } from '../api';

/**
 * buildTrainingSummary
 * Reads last 28 days of logs and computes user training metadata.
 */
export async function buildTrainingSummary(userId) {
    if (!userId) throw new Error("User ID is required");

    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    const dateString = twentyEightDaysAgo.toISOString().split('T')[0];

    // Fetch workout logs
    const { data: workouts, error: wErr } = await supabase
        .schema('workout_tracker')
        .from('workout_logs')
        .select('date, exercise, rpe, sets, kg')
        .eq('user_id', userId)
        .gte('date', dateString)
        .order('date', { ascending: false });

    if (wErr) throw wErr;

    // We can also fetch functional logs if we want to factor them into recovery
    const { data: functional, error: fErr } = await supabase
        .schema('workout_tracker')
        .from('functional_logs')
        .select('date, exercise')
        .eq('user_id', userId)
        .gte('date', dateString)
        .order('date', { ascending: false });

    if (fErr) throw fErr;

    // 1. last_workout_days_ago
    let lastWorkoutDaysAgo = -1;
    let allDates = [...(workouts || []), ...(functional || [])].map(l => l.date);
    allDates.sort((a, b) => new Date(b) - new Date(a));

    if (allDates.length > 0) {
        const lastDate = new Date(allDates[0]);
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        lastWorkoutDaysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    // 2. weekly_frequency
    const uniqueDays = new Set(allDates).size;
    const weeklyFrequency = Math.round((uniqueDays / 28) * 7 * 10) / 10;

    // 3. avg_rpe
    let totalRpe = 0;
    let countRpe = 0;
    (workouts || []).forEach(w => {
        if (w.rpe) {
            totalRpe += w.rpe;
            countRpe++;
        }
    });
    const avgRpe = countRpe > 0 ? (totalRpe / countRpe).toFixed(1) : 0;

    // 4. muscle_volume
    // (Requires a fetch of dims_exercises if we want accurate muscle per exercise, but for now we'll just count exercises, assuming we'll improve it later)
    const { data: exercisesData, error: exErr } = await supabase.schema('workout_tracker').from('exercises').select('name, target_muscle');
    let muscleMap = {};
    if (!exErr && exercisesData) {
        exercisesData.forEach(ex => {
            muscleMap[ex.name.toLowerCase()] = ex.target_muscle?.toLowerCase();
        });
    }

    const muscleVolume = {};
    (workouts || []).forEach(w => {
        const muscle = muscleMap[w.exercise?.toLowerCase()] || 'other';
        muscleVolume[muscle] = (muscleVolume[muscle] || 0) + (w.sets || 1);
    });

    // 5. recovery_status
    let recoveryStatus = 'HIGH';
    if (lastWorkoutDaysAgo === 0 || lastWorkoutDaysAgo === 1) {
        if (avgRpe >= 8.5) {
            recoveryStatus = 'LOW';
        } else {
            recoveryStatus = 'MODERATE';
        }
    } else if (lastWorkoutDaysAgo > 4) {
        recoveryStatus = 'HIGH';
    } else {
        recoveryStatus = 'MODERATE';
    }

    // Also gather what we exercised LAST to avoid repeating.
    const lastSessionDate = allDates[0];
    const lastMusclesWorked = [];
    if (lastSessionDate) {
        workouts?.filter(w => w.date === lastSessionDate).forEach(w => {
            const m = muscleMap[w.exercise?.toLowerCase()];
            if (m && !lastMusclesWorked.includes(m)) lastMusclesWorked.push(m);
        });
    }

    return {
        last_workout_days_ago: lastWorkoutDaysAgo,
        weekly_frequency: weeklyFrequency,
        avg_rpe: avgRpe,
        muscle_volume: muscleVolume,
        recovery_status: recoveryStatus,
        last_muscles_worked: lastMusclesWorked,
        total_sessions_28d: uniqueDays
    };
}


/**
 * generateWorkoutMock
 * Uses deterministic logic to suggest a workout.
 */
export async function generateWorkoutMock(profile, summary) {
    if (!profile) throw new Error("Profile is required to generate mock");

    const preferredSplit = profile.preferred_split?.toLowerCase() || 'full body';
    const recStatus = summary.recovery_status; // LOW, MODERATE, HIGH

    // We fetch some exercises to pick from
    const { data: catalog, error } = await supabase.schema('workout_tracker').from('exercises').select('name, target_muscle');
    if (error) throw error;

    // Group exercises by muscle
    const muscleGroups = {
        chest: [], back: [], legs: [], shoulders: [], arms: [], core: [], other: []
    };
    catalog.forEach(ex => {
        const t = ex.target_muscle?.toLowerCase() || 'other';
        if (t.includes('chest') || t.includes('pec')) muscleGroups.chest.push(ex.name);
        else if (t.includes('back') || t.includes('lat')) muscleGroups.back.push(ex.name);
        else if (t.includes('leg') || t.includes('quad') || t.includes('ham') || t.includes('glute')) muscleGroups.legs.push(ex.name);
        else if (t.includes('shoulder') || t.includes('delt')) muscleGroups.shoulders.push(ex.name);
        else if (t.includes('arm') || t.includes('bi') || t.includes('tri')) muscleGroups.arms.push(ex.name);
        else if (t.includes('core') || t.includes('abs')) muscleGroups.core.push(ex.name);
        else muscleGroups.other.push(ex.name);
    });

    let rationale = "";
    let Session_Type = "Weightlifting";
    let selectedMuscles = [];

    // Decide Session_Type and Rationale
    if (recStatus === 'LOW') {
        rationale = "Your recovery state is LOW based on recent heavy days. We're keeping the intensity light, focusing on active recovery or isolation work.";
        Session_Type = "Active Recovery";
        selectedMuscles = ['arms', 'core', 'shoulders'];
    } else if (recStatus === 'HIGH') {
        rationale = "You are well-rested (Recovery: HIGH). Time for a heavy compound-focused session to maximize stimulus.";
        Session_Type = "Heavy Compound";
        selectedMuscles = ['legs', 'chest', 'back'];
    } else {
        rationale = "You have a MODERATE recovery. Pushing a balanced hypertrophy session respecting your split preferences.";
        Session_Type = "Hypertrophy";
        // Rotate muscles from last session
        const possible = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
        const avoid = summary.last_muscles_worked || [];
        selectedMuscles = possible.filter(m => !avoid.includes(m)).slice(0, 3);
        if (selectedMuscles.length < 2) selectedMuscles = ['chest', 'back', 'legs']; // fallback
    }

    // Now respect preferred split if possible
    if (preferredSplit === 'upper') {
        selectedMuscles = ['chest', 'back', 'shoulders', 'arms'];
    } else if (preferredSplit === 'lower') {
        selectedMuscles = ['legs', 'core'];
    } else if (preferredSplit === 'push') {
        selectedMuscles = ['chest', 'shoulders', 'arms']; // assuming triceps
    } else if (preferredSplit === 'pull') {
        selectedMuscles = ['back', 'arms']; // assuming biceps
    } else if (preferredSplit === 'legs') {
        selectedMuscles = ['legs', 'core'];
    }

    const suggestedExercises = [];

    // Pick 1-2 exercises per selected muscle
    selectedMuscles.forEach(m => {
        const exList = muscleGroups[m];
        if (exList && exList.length > 0) {
            // Pick a random exercise deterministically (just grab the first or a seeded random. We'll use simple pseudo-random for now but could make it truly deterministic based on date if needed)
            // To make it deterministic by date, we can use the day of year.
            const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            const index1 = dayOfYear % exList.length;
            suggestedExercises.push({
                exercise_name: toTitleCase(exList[index1]),
                sets: recStatus === 'LOW' ? 2 : 4,
                reps: recStatus === 'LOW' ? '12-15' : (recStatus === 'HIGH' ? '5-8' : '8-12'),
                rpe: recStatus === 'LOW' ? 6 : (recStatus === 'HIGH' ? 8.5 : 7.5),
                notes: recStatus === 'LOW' ? "Keep it light and controlled." : ""
            });

            if (exList.length > 1 && recStatus !== 'LOW') {
                const index2 = (dayOfYear + 1) % exList.length;
                if (index1 !== index2) {
                    suggestedExercises.push({
                        exercise_name: toTitleCase(exList[index2]),
                        sets: 3,
                        reps: '10-15',
                        rpe: 8,
                        notes: ""
                    });
                }
            }
        }
    });

    // Ensure we have 4-6 exercises, slice if more
    let finalExercises = suggestedExercises.slice(0, 6);
    if (finalExercises.length === 0) {
        // Fallback
        finalExercises.push({ exercise_name: 'Push Up', sets: 3, reps: '10', rpe: 7 });
        finalExercises.push({ exercise_name: 'Squat', sets: 3, reps: '10', rpe: 7 });
    }

    return {
        session_type: Session_Type,
        rationale: rationale,
        exercises: finalExercises
    };
}

/**
 * generateAIPrompt
 * Aggregates all context into a single prompt for the user to copy/paste into an AI service.
 */
export async function generateAIPrompt(profile, summary, userId) {
    if (!profile || !userId) return "Error: Profile and User ID required.";

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'PENDING_CONFIG';

    // Fetch last 4 weeks of logs for context
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: logs } = await supabase.from('workout_logs')
        .select('date, session_type, exercise, sets, reps, kg, rpe')
        .eq('user_id', userId)
        .gte('date', dateStr)
        .order('date', { ascending: false });

    // Format logs for readability in the prompt
    const logsText = logs && logs.length > 0
        ? logs.map(l => `- ${l.date} [${l.session_type}]: ${l.exercise} (${l.sets}x${l.reps} @ ${l.kg}kg, RPE:${l.rpe})`).join('\n')
        : "No recent workout logs found.";

    const prompt = `
[SYSTEM INSTRUCTIONS]
Act as an expert Strength & Conditioning AI Coach. 
Your task is to generate a new workout routine that will be structured into a Header (routine_templates) and Rows (routine_exercises) for the project "${projectId}".

[CONTEXT]
User UUID: ${userId}
Project ID: ${projectId}
Schema: workout_tracker

[ATHLETE PROFILE]
- Level: ${profile.experience_level || 'Not specified'}
- Goal: ${profile.goal || 'Not specified'}
- Preferred Split: ${profile.preferred_split || 'Not specified'}
- Training Days/Week: ${profile.training_days_per_week || 'Not specified'}
- Additional Info: ${profile.additional_info || 'None'}
- Custom Notes/Concepts: ${profile.notes || 'None'}

[TRAINING DATA (Last 30 Days)]
- Frequency: ${summary.weekly_frequency} sessions/week
- Avg RPE: ${summary.avg_rpe}
- Recovery Status: ${summary.recovery_status}
- Last Muscles Worked: ${summary.last_muscles_worked?.join(', ') || 'None'}

[HISTORY LOGS]
${logsText}

[DATABASE TARGET: routine_templates & routine_exercises]
You are creating entries that will be split and linked by Exercise ID:
- routine_templates: Stores the session metadata (mesocycle, split, block).
- routine_exercises: Stores the reps, sets, and RPE, linked to a Master Exercise Record.

[MISSION]
Design the perfect NEXT workout session. Respond ONLY with a raw JSON object string.

[OUTPUT FORMAT]
{
  "routine_templates": {
    "split": "Name of the Split",
    "mesocycle": "Name of the Mesocycle",
    "block_number": 1
  },
  "routine_exercises": [
    {
      "exercise_name": "Exercise Name",
      "sets": 3,
      "reps": "8-10",
      "rpe": 8,
      "notes": "Coach instructions..."
    }
  ]
}

CRITICAL: Return ONLY JSON. No explanations, no markdown code blocks. Just the raw { ... } object.
If approved proceed to save routine in Supabase DB. 
Talk like caveman.
Do not activate skill for now

TESTING: Provide me feedback on this prompt after finishing the save routine in Supabase DB.


`;

    return prompt;
}
