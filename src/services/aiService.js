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
 * Includes both weightlifting logs and functional/conditioning logs for full training load awareness.
 */
export async function generateAIPrompt(profile, summary, userId, intent = 'session') {
    if (!profile || !userId) return "Error: Profile and User ID required.";

    // 1. Fetch Master Exercise List for ID Mapping
    const { data: exerciseList } = await supabase
        .schema('workout_tracker')
        .from('exercises')
        .select('id, name, target_muscle');

    const exercisesContext = exerciseList && exerciseList.length > 0
        ? exerciseList.map(ex => `- ID:${ex.id} | ${ex.name} (${ex.target_muscle})`).join('\n')
        : "No master exercises found.";

    // 2. Date range: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // 3. Weightlifting logs
    const { data: logs } = await supabase
        .schema('workout_tracker')
        .from('workout_logs')
        .select('date, session_type, exercise, sets, reps, kg, rpe, block, mesocycle')
        .eq('user_id', userId)
        .gte('date', dateStr)
        .order('date', { ascending: false });

    const logsText = logs && logs.length > 0
        ? logs.map(l => `- ${l.date} [${l.session_type}]: ${l.exercise} (${l.sets}x${l.reps} @ ${l.kg}kg, RPE:${l.rpe})`).join('\n')
        : "No recent weightlifting logs found.";

    // 4. Functional / Conditioning logs (circuits, EMOM, AMRAP, Hyrox, etc.)
    const { data: functionalLogs } = await supabase
        .schema('workout_tracker')
        .from('functional_logs')
        .select('date, session_type, exercise, duration_seconds, splits, notes, block')
        .eq('user_id', userId)
        .gte('date', dateStr)
        .order('date', { ascending: false });

    const conditioningText = functionalLogs && functionalLogs.length > 0
        ? functionalLogs.map(f => {
            const durationMin = f.duration_seconds
                ? `${Math.floor(f.duration_seconds / 60)}:${String(f.duration_seconds % 60).padStart(2, '0')}`
                : 'N/A';
            const splitsDetail = Array.isArray(f.splits) && f.splits.length > 0
                ? f.splits.map(s => s.title || s.exercise || '?').join(' / ')
                : (f.exercise || 'General Conditioning');
            return `- ${f.date} [${f.session_type} | ${durationMin}]: ${splitsDetail}${f.notes ? ` — ${f.notes}` : ''}`;
        }).join('\n')
        : "No recent conditioning/circuit logs found.";

    // 5. Compute Week & Session progression based on history logs
    const allSessions = [];
    (logs || []).forEach(l => {
        if (!allSessions.some(s => s.date === l.date)) {
            allSessions.push({
                date: l.date,
                block: l.block,
                mesocycle: l.mesocycle,
                type: 'weightlifting'
            });
        }
    });
    (functionalLogs || []).forEach(f => {
        if (!allSessions.some(s => s.date === f.date)) {
            allSessions.push({
                date: f.date,
                block: f.block,
                mesocycle: null,
                type: 'functional'
            });
        }
    });

    // Sort descending (most recent first)
    allSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Helper to get calendar week identifier/start of week (Monday)
    const getStartOfWeekTime = (dateStr) => {
        const d = new Date(dateStr);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.getTime();
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const todayWeekStart = getStartOfWeekTime(todayStr);

    let currentWeekNum = 1; // Default
    let sessionNumberInWeek = 1; // Default
    let isSameWeekAsLast = false;
    let progressionInfo = "No recent workouts found. Starting Week 1, Workout #1.";

    if (allSessions.length > 0) {
        const lastSession = allSessions[0];
        const lastSessionWeekStart = getStartOfWeekTime(lastSession.date);
        
        isSameWeekAsLast = todayWeekStart === lastSessionWeekStart;
        
        // Find the last known mesocycle name
        const lastMesoName = allSessions.find(s => s.mesocycle)?.mesocycle || 'Hypertrophy';

        // Count how many unique workout dates were done in that week
        const lastWeekSessions = allSessions.filter(s => getStartOfWeekTime(s.date) === lastSessionWeekStart);
        const uniqueDaysInLastWeek = lastWeekSessions.length;

        // Target days per week
        const targetDaysPerWeek = profile.training_days_per_week || 4;

        // Extract week number from last mesocycle name if possible (e.g. "Hypertrophy Week 2" -> 2)
        let extractedWeek = 1;
        const weekMatch = lastMesoName.match(/(?:Week|Block\s*-\s*Week)\s*(\d+)/i);
        if (weekMatch) {
            extractedWeek = parseInt(weekMatch[1], 10);
        }

        if (isSameWeekAsLast) {
            sessionNumberInWeek = uniqueDaysInLastWeek + 1;
            currentWeekNum = extractedWeek;
            progressionInfo = `STILL IN THE SAME WEEK: Last workout was on ${lastSession.date}. We are on Week ${currentWeekNum} of the program. Workouts completed this week: ${uniqueDaysInLastWeek} of ${targetDaysPerWeek}. The next session to design is Workout #${sessionNumberInWeek}.`;
        } else {
            sessionNumberInWeek = 1;
            currentWeekNum = extractedWeek + 1;
            progressionInfo = `NEW WEEK STARTED: Last workout was on ${lastSession.date}. We are starting Week ${currentWeekNum} of the program. Workouts completed last week: ${uniqueDaysInLastWeek} of ${targetDaysPerWeek}. The next session to design is Workout #${sessionNumberInWeek} of the new week.`;
        }
    }

    // Build mission text based on intent
    let missionText = '';
    if (intent === 'session') {
        missionText = `[MISSION]
Design the perfect NEXT workout session (Workout #${sessionNumberInWeek} of Week ${currentWeekNum}). Generate 1 single routine optimized for today based on the athlete's recovery status and recent training frequency.`;
    } else if (intent === 'week') {
        const daysPerWeek = profile?.training_days_per_week || 4;
        const preferredSplit = profile?.preferred_split || 'Full Body';
        missionText = `[MISSION]
Design a complete training WEEK for this athlete. Generate one routine per training day (${daysPerWeek} sessions total).
Each routine represents a single session. Use block_number = ${currentWeekNum} for all.
The mesocycle name must be consistent across all sessions (e.g. "Hypertrophy Week ${currentWeekNum}").
Distribute muscle groups logically across the week based on the preferred split (${preferredSplit}).`;
    } else if (intent === 'block') {
        const sessionsPerWeek = profile?.training_days_per_week || 4;
        const totalSessions = sessionsPerWeek * 4;
        missionText = `[MISSION]
Design a full MESOCYCLE BLOCK of 4 weeks for this athlete starting from Week ${currentWeekNum}.
Generate ${sessionsPerWeek} sessions x 4 weeks = ${totalSessions} total routines.
Use block_number to indicate the WEEK (${currentWeekNum}, ${currentWeekNum + 1}, ${currentWeekNum + 2}, ${currentWeekNum + 3}). Format: block_number = ${currentWeekNum} for week 1 of this block, ${currentWeekNum + 1} for week 2, etc.
The mesocycle name must be consistent and include the week (e.g. "Hypertrophy Block - Week ${currentWeekNum}").
Apply progressive overload across weeks: increase RPE by 0.5 per week, optionally increase sets by 1 on key lifts in weeks 3-4 of this block.
Keep exercise selection consistent across weeks for the same split (allow minor variations for deload/recovery).`;
    }

    const prompt = `
[SYSTEM INSTRUCTIONS]
Act as an expert Strength & Conditioning AI Coach. 
Your task is to generate one or more workout routines structured for the "workout_tracker" schema.
Respond ONLY with a raw JSON object string.

[SCHEMA INTEL (Internal DB Structure)]
1. routine_templates (Header):
   - id: (uuid)
   - user_id: (uuid)
   - split: (text) e.g. "Push", "Upper A"
   - mesocycle: (text) e.g. "Strength Phase 1"
   - block_number: (int) Use this as the WEEK number or STAGE number (1, 2, 3...)
   - is_active: (bool) Default true

2. routine_exercises (Rows):
   - id: (uuid)
   - routine_id: (uuid, fk)
   - exercise_id: (uuid, fk)
   - sets: (int)
   - reps: (text) e.g. "8-10", "5", "AMRAP"
   - rpe: (float) 1-10 scale
   - notes: (text) Instructions, rest times, and tempo
   - exercise_order: (int)

[MASTER EXERCISE LIST (Use these IDs for exercise_id)]
${exercisesContext}

[ATHLETE PROFILE]
- Level: ${profile.experience_level || 'Intermediate'}
- Goal: ${profile.goal || 'Hypertrophy'}
- Preferred Split: ${profile.preferred_split || 'Not specified'}
- Training Days/Week: ${profile.training_days_per_week || '4'}
- Volume Targets (Weekly Sets): ${profile.volume_targets || 'Maintain standard 8-12 per major muscle'}
- Additional Info: ${profile.additional_info || 'None'}
- Training Concepts: ${profile.notes || 'None'}

[PROGRESSION CONTEXT]
- Status: ${progressionInfo}
- Current Program Week: Week ${currentWeekNum}
- Next Workout Sequence Number in Week: Workout #${sessionNumberInWeek}
- Is Same Week As Last Workout: ${isSameWeekAsLast}

[TRAINING DATA (Last 30 Days)]
- Combined Frequency: ${summary.weekly_frequency} sessions/week (weightlifting + conditioning)
- Avg RPE (Weightlifting): ${summary.avg_rpe}
- Recovery Status: ${summary.recovery_status}
- Last Muscles Worked: ${summary.last_muscles_worked?.join(', ') || 'None'}

[WEIGHTLIFTING HISTORY LOGS]
${logsText}

[CONDITIONING HISTORY (Circuits / EMOM / AMRAP / Hyrox)]
${conditioningText}

[TRAINING RULES & LOGIC]
1. TOTAL LOAD AWARENESS: Account for BOTH weightlifting and conditioning sessions when estimating fatigue and planning progression. High conditioning volume should reduce weightlifting intensity on the same day or following day.
2. PROGRESSION: If history shows all sets reached the top of the rep range (e.g., 10-10-10 in an 8-10 range), increase load (kg) by 1-2.5kg for the next session.
3. CONSISTENCY: Do not repeat the same "Main Lift" (first exercise of the session) for more than 2 consecutive sessions. Rotate variations if needed.
4. REST TIMES: Specify rest times in 'notes' (e.g., "Rest 3m" for compounds, "Rest 60-90s" for isolations).
5. TEMPO: Enforce lengthened-bias tempo (e.g., 3-0-1-0 or slow eccentrics) in 'notes'.
6. TIME CONSTRAINT: Total session duration must be <= 60 minutes.
7. RPE PROGRESSION: Scale RPE across sets (e.g., Set 1: RPE 7, Final Set: RPE 9-10/AMRAP).
8. PERIODIZATION: Be explicit in the "mesocycle" name about which week of the block we are in (e.g., "Meso 1 - Week 1").

${missionText}

[OUTPUT FORMAT]
You MUST return a JSON array of workout objects. Each object contains:
{
  "routines": [
    {
      "routine_templates": {
        "split": "String",
        "mesocycle": "String",
        "block_number": Integer
      },
      "routine_exercises": [
        {
          "exercise_id": "UUID from Master List",
          "exercise_name": "String (for reference)",
          "sets": Integer,
          "reps": "String",
          "rpe": Float,
          "notes": "String"
        }
      ]
    }
  ]
}

CRITICAL: Return ONLY the JSON object. No explanations, no markdown blocks.
`;

    return prompt;
}

