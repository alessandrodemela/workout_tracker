import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { Plus, Check, ChevronLeft, AlertTriangle, Search, Save } from 'lucide-react';
import { API_URL, fetcher } from '../api';
import ExerciseCard from '../components/ExerciseCard';
import PrimaryButton from '../components/PrimaryButton';

export default function ActiveWorkout() {
    const navigate = useNavigate();
    const { data: exercisesData, mutate: mutateExercises } = useSWR(`${API_URL}/exercises`, fetcher);
    const masterExercises = exercisesData?.exercises || [];

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionType, setSessionType] = useState('Standard');
    const [exercises, setExercises] = useState([]);
    const [globalNotes, setGlobalNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsElapsed(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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
        const stored = sessionStorage.getItem('templateExercises');
        if (stored && masterExercises.length > 0) {
            try {
                const parsed = JSON.parse(stored);
                setRawTemplate(parsed);
                setSessionType(parsed[0]?.Split || 'Template');

                // Check for missing exercises
                const missing = parsed
                    .map(t => t.Exercise_Name)
                    .filter(name => name && !masterExercises.includes(name));

                const uniqueMissing = [...new Set(missing)];

                if (uniqueMissing.length > 0) {
                    setUnresolvedItems(uniqueMissing);
                    // Initialize resolutions
                    const initialRes = {};
                    uniqueMissing.forEach(m => {
                        initialRes[m] = { action: 'new', target: null };
                    });
                    setResolutions(initialRes);
                } else {
                    initializeWorkout(parsed);
                }
            } catch (e) { console.error(e); }
        } else if (!stored) {
            // New custom workout
            setSessionType('Standard');
        }
    }, [masterExercises]);

    const initializeWorkout = (templateData, resMap = {}) => {
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
        setExercises(initialExercises);
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
                await fetch(`${API_URL}/templates/map-exercises`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mappings)
                });
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
                await fetch(`${API_URL}/exercises/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newExercises)
                });
                await mutateExercises();
            }

            initializeWorkout(rawTemplate, resolutions);
        } catch (err) {
            alert('Failed to resolve exercises');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelWorkout = () => {
        if (window.confirm("Are you sure you want to cancel this workout? All progress will be lost.")) {
            sessionStorage.removeItem('templateExercises');
            navigate('/home');
        }
    };

    const handleFinishWorkout = async () => {
        if (exercises.length === 0 && sessionType !== 'Functional') return alert('Add at least one exercise');

        setIsSaving(true);
        const validRows = [];
        exercises.forEach(ex => {
            if (ex.sets?.length > 0) {
                const validSets = ex.sets.filter(s => s.reps);
                if (validSets.length > 0) {
                    const maxKg = Math.max(...validSets.map(s => parseFloat(s.kg) || 0));
                    validRows.push({
                        Exercise: ex.name,
                        Kg: maxKg,
                        Sets: validSets.length.toString(),
                        Reps: validSets.map(s => s.reps).join(', '),
                        RPE: parseFloat(validSets[validSets.length - 1].rpe || 8)
                    });
                }
            }
        });

        if (validRows.length === 0 && sessionType !== 'Functional') {
            setIsSaving(false);
            return alert('Fill at least one set with reps!');
        }

        try {
            const res = await fetch(`${API_URL}${sessionType === 'Functional' ? '/functional-session' : '/workout-session'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Date: date, Session_Type: sessionType, Exercises: validRows, Notes: globalNotes })
            });
            if (res.ok) {
                sessionStorage.removeItem('templateExercises');
                navigate('/history');
            } else alert('Failed to save');
        } catch (err) { alert('Error saving'); }
        finally { setIsSaving(false); }
    };

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
        <div className="flex flex-col gap-6 pb-32 animate-fade-in pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={handleCancelWorkout} className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors">
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
                <textarea className="input-field min-h-[200px]" placeholder="Circuit details..." value={globalNotes} onChange={e => setGlobalNotes(e.target.value)} />
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

            <div className="fixed bottom-24 left-6 right-6 z-40 max-w-lg mx-auto">
                <PrimaryButton onClick={handleFinishWorkout} loading={isSaving} className="py-5 shadow-2xl shadow-brand-900/20">
                    <Check className="w-5 h-5 mr-1" /> Complete Session
                </PrimaryButton>
            </div>
        </div>
    );
}
