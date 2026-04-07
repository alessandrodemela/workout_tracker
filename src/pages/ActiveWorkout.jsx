import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { Plus, Check, ChevronLeft, AlertTriangle, Search, Save } from 'lucide-react';
import { API_URL, fetcher, mapTemplateExercises, bulkAddExercises, saveWorkoutSession, saveFunctionalSession } from '../api';
import ExerciseCard from '../components/ExerciseCard';
import PrimaryButton from '../components/PrimaryButton';
import RestTimer from '../components/RestTimer';
import ConfirmModal from '../components/ConfirmModal';
import { useWorkout } from '../context/WorkoutContext';
import { useAuth } from '../context/AuthContext';

export default function ActiveWorkout() {
    const navigate = useNavigate();
    const { data: exercisesData, mutate: mutateExercises } = useSWR(`${API_URL}/exercises`, fetcher);
    const masterExercises = exercisesData?.exercises || [];

    const { 
        isActive, date, setDate, sessionType, setSessionType, 
        exercises, setExercises, globalNotes, setGlobalNotes, 
        secondsElapsed, startWorkout, cancelWorkout, finishWorkout 
    } = useWorkout();
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
    const [hasInitialized, setHasInitialized] = useState(false);

    const formatDuration = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return [h, m, s]
            .map(v => v < 10 ? "0" + v : v)
            .filter((v, i) => v !== "00" || i > 0)
            .join(":");
    };

    // Resolution State
    const [rawTemplate, setRawTemplate] = useState(null);
    const [unresolvedItems, setUnresolvedItems] = useState([]);
    const [resolutions, setResolutions] = useState({}); // { oldName: { action: 'map'|'new', target: '...'|null } }

    // Add exercise dropdown state
    const [isAddingExercise, setIsAddingExercise] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState('');

    useEffect(() => {
        // 1. Critical: Handle uninitialized context — isActive === undefined means context not ready
        if (isActive === undefined) return;

        // 2. Critical: If already active, don't re-initialize
        if (isActive) return;

        // 3. Prevent double-initialization (StrictMode / remounts)
        if (hasInitialized) return;

        // 4. Check for template in sessionStorage
        let stored = null;
        try {
            stored = sessionStorage.getItem('templateExercises');
        } catch (err) {
            console.error('SessionStorage read error:', err);
        }

        const isTemplateFlow = stored && stored !== 'undefined' && stored !== 'null';

        // 5. Template path: wait until masterExercises are loaded before proceeding
        if (isTemplateFlow) {
            if (!exercisesData || masterExercises.length === 0) return; // Wait for SWR

            try {
                const parsed = JSON.parse(stored);
                setRawTemplate(parsed);
                const splitName = parsed[0]?.Split || 'Template';

                const missing = parsed
                    .map(t => t.Exercise_Name)
                    .filter(name => name && !masterExercises.includes(name));

                const uniqueMissing = [...new Set(missing)];

                setHasInitialized(true);

                if (uniqueMissing.length > 0) {
                    setSessionType(splitName);
                    setUnresolvedItems(uniqueMissing);
                    const initialRes = {};
                    uniqueMissing.forEach(m => {
                        initialRes[m] = { action: 'new', target: null };
                    });
                    setResolutions(initialRes);
                } else {
                    initializeWorkout(parsed, {}, splitName);
                }
            } catch (e) {
                console.error('Failed to parse template exercises:', e);
                setHasInitialized(true);
                startWorkout({ sessionType: 'Standard' });
            }
        } else {
            // 6. Plain custom workout — no master exercises needed
            setHasInitialized(true);
            startWorkout({ sessionType: 'Standard' });
        }
    }, [masterExercises, isActive, exercisesData, startWorkout, setSessionType, hasInitialized]);

    const initializeWorkout = (templateData, resMap = {}, splitName = null) => {
        const initialExercises = templateData
            .filter(te => te.Exercise_Name)
            .map(te => {
                let finalName = te.Exercise_Name;
                const res = resMap[te.Exercise_Name];
                if (res?.action === 'map') finalName = res.target;

                const numSets = parseInt(te.Sets) || 1;
                return {
                    name: finalName,
                    sets: Array.from({ length: numSets }, () => ({
                        kg: '', reps: te.Reps || '', rpe: te.RPE || 8, completed: false
                    }))
                };
            });
        
        startWorkout({ 
            sessionType: splitName || sessionType, 
            exercises: initialExercises 
        });
        setUnresolvedItems([]);
    };

    const handleApplyResolutions = async () => {
        setIsSaving(true);
        try {
            // 1. Persist Mappings to Templates DB (Persistent fix)
            const mappings = {};
            Object.entries(resolutions).forEach(([oldName, res]) => {
                if (res.action === 'map' && res.target) {
                    mappings[oldName] = res.target;
                }
            });

            if (Object.keys(mappings).length > 0) {
                await mapTemplateExercises(mappings);
            }

            // 2. Process 'new' exercises by registering them
            const newExercises = Object.entries(resolutions)
                .filter(([_, val]) => val.action === 'new')
                .map(([name]) => ({
                    Exercise_Name: name,
                    Target_Muscle: 'Other',
                    Target_Area: 'Other',
                    Equipment: 'Other'
                }));

            if (newExercises.length > 0) {
                await bulkAddExercises(newExercises);
                await mutateExercises();
            }

            initializeWorkout(rawTemplate, resolutions);
        } catch (err) {
            setAlertConfig({ isOpen: true, title: 'Error', message: 'Failed to resolve Exercises.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelWorkout = () => {
        setShowCancelModal(true);
    };

    const confirmCancelWorkout = () => {
        try {
            sessionStorage.removeItem('templateExercises');
        } catch (err) {
            console.error('SessionStorage remove error (cancel):', err);
        }
        cancelWorkout();
        navigate('/home');
    };

    const handleFinishWorkout = async () => {
        if (exercises.length === 0 && sessionType !== 'Functional') {
            return setAlertConfig({ 
                isOpen: true, 
                title: 'Empty Workout', 
                message: 'Add at least one exercise before completing the session.' 
            });
        }

        setIsSaving(true);
        const validRows = [];
        exercises.forEach(ex => {
            if (ex.sets?.length > 0) {
                const validSets = ex.sets.filter(s => s.reps);
                if (validSets.length > 0) {
                    const maxKg = Math.max(...validSets.map(s => parseFloat(s.kg) || 0));
                    const weights = validSets.map(s => s.kg || '0').join(',');
                    validRows.push({
                        Exercise: ex.name,
                        Kg: maxKg,
                        Sets: validSets.length.toString(),
                        Reps: validSets.map(s => s.reps).join(', '),
                        RPE: parseFloat(validSets[validSets.length - 1].rpe || 8),
                        // Store detailed weights in notes for better volume calculation in history
                        Notes: `[[W:${weights}]]`
                    });
                }
            }
        });

        if (validRows.length === 0 && sessionType !== 'Functional') {
            setIsSaving(false);
            return setAlertConfig({ 
                isOpen: true, 
                title: 'No Recorded Sets', 
                message: 'Fill at least one set with reps before finishing.' 
            });
        }

        try {
            if (sessionType === 'Functional') {
                await saveFunctionalSession({ Date: date, Session_Type: sessionType, Exercise: 'Functional Circuit', Notes: globalNotes }, user.id);
            } else {
                // Add duration to global notes to be parsed by History
                const durationNote = `[[D:${secondsElapsed}]]`;
                const finalNotes = globalNotes ? `${globalNotes}\n${durationNote}` : durationNote;
                await saveWorkoutSession({ Date: date, Session_Type: sessionType, Mesocycle: '', Notes: finalNotes, Exercises: validRows }, user.id);
            }
            
            // Critical UX Fix: Invalidate history cache and show success briefly
            setIsSaving(false);
            setIsSaved(true);
            await mutate(`${API_URL}/workout-history`);
            
            setTimeout(() => {
                try {
                    sessionStorage.removeItem('templateExercises');
                } catch (err) {
                    console.error('SessionStorage remove error (finish):', err);
                }
                finishWorkout();
                navigate('/history');
            }, 1500);
        } catch (err) { 
            console.error(err);
            setIsSaving(false);
            setAlertConfig({ 
                isOpen: true, 
                title: 'Save Error', 
                message: 'An error occurred while saving your session. Please check your connection and try again.' 
            });
        }
    };

    // Identify if we're starting from a template to determine loading needs
    const isTemplate = useMemo(() => {
        try {
            const s = sessionStorage.getItem('templateExercises');
            return s && s !== 'undefined' && s !== 'null';
        } catch (e) { return false; }
    }, []);

    // Determine if context is ready (isActive is a boolean, not undefined)
    const isContextReady = isActive !== undefined;

    // Show loading spinner:
    // - Context not ready yet, OR
    // - Template flow but masterExercises haven't loaded yet, OR
    // - Context ready but we haven't initialized the workout yet (isActive is still false and hasInitialized is false)
    const isLoading =
        !isContextReady ||
        (isTemplate && (!exercisesData || masterExercises.length === 0) && !isActive) ||
        (!isActive && !hasInitialized && unresolvedItems.length === 0);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-white font-bold text-lg">Initializing workout…</h2>
                <p className="text-[#A3A3A3] text-sm mt-2">Loading your session data</p>
            </div>
        );
    }

    // UI: Resolution Screen
    if (unresolvedItems.length > 0) {
        return (
            <div className="flex flex-col gap-6 py-8 animate-fade-in">
                <div className="p-5 bg-brand-500/10 border border-brand-500/20 rounded-3xl flex items-start gap-4">
                    <div className="p-2 bg-brand-500/20 rounded-xl text-brand-500">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-black text-white">Missing Movements</h2>
                        <p className="text-sm text-[#A3A3A3]">Some movements in this template aren't in your Master Database. Map them or create new ones.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {unresolvedItems.map(item => (
                        <div key={item} className="card-glass flex flex-col gap-4 border-[#262626]">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Template Name</span>
                                <h3 className="text-base font-bold text-white">{item}</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        const newRes = { ...resolutions };
                                        newRes[item] = { action: 'new', target: null };
                                        setResolutions(newRes);
                                    }}
                                    className={`py-3 rounded-xl text-xs font-bold border transition-all ${resolutions[item].action === 'new' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-transparent text-[#A3A3A3] border-[#171717]'}`}
                                >
                                    Register as New
                                </button>
                                <button
                                    onClick={() => {
                                        const newRes = { ...resolutions };
                                        newRes[item] = { action: 'map', target: resolutions[item].target || '' };
                                        setResolutions(newRes);
                                    }}
                                    className={`py-3 rounded-xl text-xs font-bold border transition-all ${resolutions[item].action === 'map' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-transparent text-[#A3A3A3] border-[#171717]'}`}
                                >
                                    Map to Existing
                                </button>
                            </div>

                            {resolutions[item].action === 'map' && (
                                <div className="flex flex-col gap-2 pt-2 animate-fade-in">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                                        <select
                                            className="input-field pl-10 text-sm py-3"
                                            value={resolutions[item].target || ''}
                                            onChange={(e) => {
                                                const newRes = { ...resolutions };
                                                newRes[item] = { ...newRes[item], target: e.target.value };
                                                setResolutions(newRes);
                                            }}
                                        >
                                            <option value="">Select exercise...</option>
                                            {masterExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="fixed bottom-10 left-6 right-6 z-50 max-w-lg mx-auto flex gap-3">
                    <button onClick={() => navigate('/home')} className="flex-1 py-4 bg-[#171717] rounded-2xl font-bold text-[#A3A3A3]">Cancel</button>
                    <PrimaryButton
                        onClick={handleApplyResolutions}
                        loading={isSaving}
                        disabled={Object.values(resolutions).some(r => r.action === 'map' && !r.target)}
                        className="flex-[2]"
                    >
                        Resolve & Start
                    </PrimaryButton>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-6 animate-fade-in pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tight text-white">{sessionType === 'Functional' ? 'Conditioning' : 'Workout'}</h1>
                        <p className="text-[#A3A3A3] text-sm">Log your session details</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-500">Duration</span>
                    <span className="text-xl font-black text-white tabular-nums">{formatDuration(secondsElapsed)}</span>
                </div>
            </div>

            <div className="flex gap-3">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field py-3 text-sm flex-1" />
                <select value={sessionType} onChange={e => setSessionType(e.target.value)} className="input-field py-3 text-sm flex-1 appearance-none">
                    <option value="Standard">Standard</option>
                    <option value="Functional">Functional</option>
                    {sessionType !== 'Standard' && sessionType !== 'Functional' && (
                        <option value={sessionType}>{sessionType.length > 1 ? sessionType : `Split ${sessionType}`}</option>
                    )}
                </select>
            </div>

            {sessionType === 'Functional' ? (
                <div className="flex flex-col gap-4">
                    <textarea className="input-field min-h-[200px]" placeholder="Circuit details..." value={globalNotes} onChange={e => setGlobalNotes(e.target.value)} />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {exercises.map((ex, idx) => (
                        <ExerciseCard key={`${idx}-${ex.name}`} index={idx} exercise={ex} onUpdate={(u) => {
                            const newExs = [...exercises];
                            newExs[idx] = u;
                            setExercises(newExs);
                        }} onRemove={() => setExercises(exercises.filter((_, i) => i !== idx))} />
                    ))}

                    {isAddingExercise ? (
                        <div className="card-glass flex flex-col gap-4 animate-slide-up">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold">Add Movement</h3>
                                <button onClick={() => setIsAddingExercise(false)} className="text-[#A3A3A3] text-xs">Cancel</button>
                            </div>
                            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} className="input-field appearance-none">
                                <option value="">Select exercise...</option>
                                {masterExercises.map((ex, i) => <option key={i} value={ex}>{ex}</option>)}
                            </select>
                            <PrimaryButton onClick={() => {
                                if (!selectedExercise) return;
                                setExercises([...exercises, { name: selectedExercise, sets: [{ kg: '', reps: '', rpe: 8, completed: false }] }]);
                                setIsAddingExercise(false);
                                setSelectedExercise('');
                            }} disabled={!selectedExercise}>Confirm</PrimaryButton>
                        </div>
                    ) : (
                        <button onClick={() => setIsAddingExercise(true)} className="w-full py-5 rounded-[2rem] border-2 border-dashed border-[#262626] text-[#A3A3A3] font-bold hover:border-[#A3A3A3] transition-all flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" /> Add Exercise
                        </button>
                    )}
                    <textarea className="input-field min-h-[100px]" placeholder="Session Notes..." value={globalNotes} onChange={e => setGlobalNotes(e.target.value)} />
                </div>
            )}

            {/* Action buttons — in document flow, always reachable by scrolling */}
            <div className="flex flex-col gap-3 mt-2">
                <PrimaryButton 
                    onClick={handleFinishWorkout} 
                    loading={isSaving} 
                    className={`py-5 transition-all duration-300 ${isSaved ? 'bg-green-500 text-white' : ''}`}
                    disabled={isSaved}
                >
                    {isSaved ? (
                        <><Check className="w-5 h-5 mr-1" /> Session Saved!</>
                    ) : (
                        <><Check className="w-5 h-5 mr-1" /> Complete Session</>
                    )}
                </PrimaryButton>
                <button 
                    onClick={handleCancelWorkout}
                    className="w-full py-4 rounded-2xl border border-[#262626] text-[#A3A3A3] text-xs font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                >
                    Discard Session
                </button>
            </div>

            <RestTimer />
            
            <ConfirmModal 
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={confirmCancelWorkout}
                title="Discard Session?"
                message="Are you sure you want to cancel this workout? All your progress in this session will be permanently lost."
                confirmText="Discard Session"
                cancelText="Keep Grinding"
                type="danger"
            />

            <ConfirmModal 
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                onConfirm={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                confirmText="Got it"
                cancelText={null}
                type="brand"
            />
        </div>
    );
}
