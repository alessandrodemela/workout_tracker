// This file is fine, I will just add the plus button
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Search, ChevronRight, Activity, X, Plus } from 'lucide-react';
import { API_URL, fetcher, addExercise } from '../api';
import PrimaryButton from '../components/PrimaryButton';

const EQUIPMENT_COLORS = {
    'Barbell': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    'Dumbbells': 'text-green-500 bg-green-500/10 border-green-500/20',
    'Bodyweight': 'text-red-500 bg-red-500/10 border-red-500/20',
    'Cable': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    'Machine': 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    'Other': 'text-[#A3A3A3] bg-[#171717] border-[#262626]'
};

const MUSCLE_TO_AREA_MAP = {
    'Chest': 'Upper Body', 'Back': 'Upper Body', 'Shoulders': 'Upper Body',
    'Biceps': 'Upper Body', 'Triceps': 'Upper Body', 'Quadriceps': 'Lower Body',
    'Hamstrings': 'Lower Body', 'Calves': 'Lower Body', 'Glutes': 'Lower Body',
    'Core': 'Core', 'Full Body': 'Full Body', 'Other': 'Other'
};

export default function ExerciseDatabase() {
    const { data: exData, error: exError, mutate } = useSWR(`${API_URL}/exercises`, fetcher);
    const { data: histData, error: histError } = useSWR(`${API_URL}/workout-history`, fetcher);
    const exercises = exData?.full_list || [];
    const workouts = histData?.workouts || [];

    if (exError || histError) return (
        <div className="p-6 text-brand-500 font-bold text-center">
            <p>Database connection failed.</p>
            <p className="text-[10px] opacity-50 mt-2 font-mono uppercase">
                {exError?.message || histError?.message || 'Check your Supabase credentials'}
            </p>
        </div>
    );

    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        Exercise_Name: '', Target_Muscle: '', Target_Area: '', Equipment: '', Notes: ''
    });

    const categories = ['All', ...Array.from(new Set(exercises.map(e => e.Target_Muscle).filter(Boolean)))];

    const loggedExercises = useMemo(() => new Set(workouts.map(w => w.Exercise)), [workouts]);

    const grouped = useMemo(() => {
        let filtered = exercises;
        if (search) filtered = filtered.filter(e => e.Exercise_Name.toLowerCase().includes(search.toLowerCase()));
        if (selectedCategory !== 'All') filtered = filtered.filter(e => e.Target_Muscle === selectedCategory);

        const groups = {};
        filtered.forEach(ex => {
            const m = ex.Target_Muscle || 'Other';
            if (!groups[m]) groups[m] = [];
            groups[m].push(ex);
        });
        return groups;
    }, [exercises, search, selectedCategory]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };
        if (name === 'Target_Muscle' && value) newFormData.Target_Area = MUSCLE_TO_AREA_MAP[value] || '';
        setFormData(newFormData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.Exercise_Name) return alert('Exercise Name is required');

        setIsSaving(true);
        try {
            await addExercise(formData);
            setFormData({ Exercise_Name: '', Target_Muscle: '', Target_Area: '', Equipment: '', Notes: '' });
            setIsAdding(false);
            mutate();
        } catch (err) { alert('Error saving exercise'); }
        finally { setIsSaving(false); }
    };

    const { data: exerciseHistoryData } = useSWR(selectedExercise ? `${API_URL}/history/${encodeURIComponent(selectedExercise.Exercise_Name)}` : null, fetcher);

    return (
        <div className="flex flex-col gap-6 pb-32 animate-fade-in pt-6 relative">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-black tracking-tight text-white">Exercises</h1>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="p-2 bg-[#171717] rounded-full text-white hover:bg-[#262626] transition-colors">
                        <Plus className="w-5 h-5" />
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="card-glass flex flex-col gap-6 animate-slide-up border-brand-500/30">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold">New Exercise</h2>
                        <button onClick={() => setIsAdding(false)} className="text-[#A3A3A3] text-xs font-bold uppercase tracking-widest">Cancel</button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input className="input-field" name="Exercise_Name" value={formData.Exercise_Name} onChange={handleChange} required placeholder="Movement Name (e.g. Incline DB Press)" />
                        <div className="grid grid-cols-2 gap-3">
                            <select className="input-field appearance-none" name="Target_Muscle" value={formData.Target_Muscle} onChange={handleChange}>
                                <option value="">Select Muscle...</option>
                                {Object.keys(MUSCLE_TO_AREA_MAP).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <input className="input-field opacity-50 cursor-not-allowed" name="Target_Area" value={formData.Target_Area} readOnly placeholder="Area (Auto)" />
                        </div>
                        <select className="input-field appearance-none" name="Equipment" value={formData.Equipment} onChange={handleChange}>
                            <option value="">Equipment...</option>
                            <option value="Barbell">Barbell</option>
                            <option value="Dumbbells">Dumbbells</option>
                            <option value="Machine">Machine</option>
                            <option value="Cable">Cable</option>
                            <option value="Bodyweight">Bodyweight</option>
                            <option value="Other">Other</option>
                        </select>
                        <PrimaryButton type="submit" loading={isSaving}>Register Exercise</PrimaryButton>
                    </form>
                </div>
            )}


            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A3A3]" />
                <input
                    type="text"
                    placeholder="Search exercises..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input-field pl-12 py-3"
                />
            </div>

            <div className="flex overflow-x-auto gap-2 pb-2 -mx-6 px-6 snap-x" style={{ scrollbarWidth: 'none' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`snap-center flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all border ${selectedCategory === cat
                            ? 'bg-[#D4FF00] text-black border-[#D4FF00]'
                            : 'bg-transparent text-[#A3A3A3] border-[#262626] hover:text-white'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-8">
                {Object.keys(grouped).sort().map(muscle => (
                    <div key={muscle} className="flex flex-col gap-3">
                        <div className="flex items-center gap-4 text-[#A3A3A3]">
                            <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                            <h2 className="text-xs font-black uppercase tracking-[0.2em]">{muscle}</h2>
                            <div className="flex-1 h-[1px] bg-[#171717]"></div>
                            <span className="text-[10px] font-bold">{grouped[muscle].length}</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            {grouped[muscle].map((ex, i) => {
                                const isLogged = loggedExercises.has(ex.Exercise_Name);
                                const eqStyle = EQUIPMENT_COLORS[ex.Equipment] || EQUIPMENT_COLORS['Other'];

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedExercise(ex)}
                                        className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#171717] rounded-3xl hover:border-[#262626] active:scale-95 transition-all w-full text-left group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#171717] flex items-center justify-center text-xl">
                                                {ex.Equipment === 'Barbell' ? '🏋️' : ex.Equipment === 'Bodyweight' ? '💪' : '⚡'}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <h3 className="font-bold text-white group-hover:text-brand-500 transition-colors">{ex.Exercise_Name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${eqStyle}`}>
                                                        {ex.Equipment || 'Other'}
                                                    </span>
                                                    {isLogged && (
                                                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#D4FF00]">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#D4FF00]"></div>
                                                            logged
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-[#262626] group-hover:text-brand-500 transition-colors" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Sheet Modal */}
            {selectedExercise && (
                <div className="fixed inset-0 z-50 flex items-end justify-center transition-all">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setSelectedExercise(null)}></div>

                    <div className="relative bg-[#0A0A0A] border border-[#171717] rounded-t-[3rem] w-full max-w-xl h-[92vh] flex flex-col animate-slide-up shadow-2xl overflow-hidden">

                        {/* Static Header Section */}
                        <div className="px-8 pt-10 pb-6 flex flex-col gap-5 border-b border-[#171717]/50">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 px-3 py-1 rounded-full w-fit">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B6B] shadow-[0_0_8px_#FF6B6B]"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B6B]">{selectedExercise.Target_Muscle}</span>
                                    </div>
                                    <h2 className="text-4xl font-black text-white tracking-tight leading-none mt-1">{selectedExercise.Exercise_Name}</h2>
                                    <span className="text-sm font-bold text-[#A3A3A3] opacity-60 ml-0.5">{selectedExercise.Equipment || 'Barbell'}</span>
                                </div>
                                <button onClick={() => setSelectedExercise(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* PB Highlight Card */}
                            {exerciseHistoryData?.pb && (
                                <div className="relative overflow-hidden p-6 bg-gradient-to-br from-[#171717] to-[#0A0A0A] border border-[#262626] rounded-[2rem] group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[50px] rounded-full -mr-10 -mt-10 group-hover:bg-brand-500/20 transition-all duration-700"></div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3] mb-3">Personal Best</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-brand-500 tracking-tighter">{exerciseHistoryData.pb.Kg}kg</span>
                                        <span className="text-xl font-bold text-[#A3A3A3]/50 tracking-tight">×</span>
                                        <span className="text-2xl font-black text-white tracking-tight">
                                            {exerciseHistoryData.pb.Reps?.toString().split(',')[0] || '1'} <span className="text-sm font-bold text-[#404040]">reps</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Scrollable History Section */}
                        <div className="flex-1 overflow-y-auto px-8 pt-8 pb-32 flex flex-col gap-8" style={{ scrollbarWidth: 'none' }}>
                            {/* Charts Section */}
                            {exerciseHistoryData?.history?.length > 1 && (() => {
                                const logs = exerciseHistoryData.history.slice(-10);
                                const maxWeight = Math.max(...logs.map(l => l.Kg || 0));

                                return (
                                    <div className="flex flex-col gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#404040]">Weight Progression</span>
                                        <div className="flex items-end gap-1.5 h-32">
                                            {logs.map((log, i) => {
                                                const heightPct = maxWeight > 0 ? ((log.Kg || 0) / maxWeight) * 100 : 0;
                                                const isLatest = i === logs.length - 1;
                                                return (
                                                    <div key={i} className="flex flex-col items-center justify-end flex-1 h-full gap-1">
                                                        <span className={`text-[9px] font-black ${isLatest ? 'text-[#D4FF00]' : 'text-[#404040]'}`}>
                                                            {log.Kg}
                                                        </span>
                                                        <div
                                                            className="w-full rounded-t-lg transition-all duration-500"
                                                            style={{
                                                                height: `${heightPct}%`,
                                                                background: isLatest
                                                                    ? 'linear-gradient(to bottom, #D4FF00, rgba(212,255,0,0.3))'
                                                                    : 'linear-gradient(to bottom, #2a2a2a, #171717)',
                                                                boxShadow: isLatest ? '0 0 12px rgba(212,255,0,0.2)' : 'none',
                                                                borderRadius: '6px 6px 2px 2px',
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[9px] text-[#2a2a2a] font-bold uppercase">Oldest</span>
                                            <span className="text-[9px] text-[#D4FF00] font-bold uppercase">Latest</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex flex-col gap-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#404040] ml-1">Recent Sessions</h3>

                                {exerciseHistoryData?.history?.length > 0 ? (
                                    <div className="flex flex-col gap-6">
                                        {exerciseHistoryData.history.slice().reverse().map((log, i) => {
                                            const repsArr = (log.Reps || '').toString().split(',').filter(r => r.trim() !== '');
                                            return (
                                                <div key={i} className="flex flex-col gap-3 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-black text-[#606060] uppercase tracking-widest">
                                                            {new Date(log.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <div className="flex-1 h-[1px] bg-[#171717] group-hover:bg-[#262626] transition-colors"></div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {repsArr.map((rep, idx) => (
                                                            <div key={idx} className="bg-[#111111] border border-[#171717] hover:border-[#262626] py-2.5 px-5 rounded-2xl flex items-center gap-1.5 transition-all hover:scale-105">
                                                                <span className="text-sm font-black text-white">{log.Kg}</span>
                                                                <span className="text-[10px] font-bold text-[#404040]">kg</span>
                                                                <span className="text-[10px] font-black text-[#404040]">×</span>
                                                                <span className="text-sm font-black text-white">{rep.trim()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center gap-3 bg-[#0A0A0A] border border-[#171717] border-dashed rounded-[2rem]">
                                        <div className="w-16 h-16 rounded-3xl bg-[#171717] flex items-center justify-center mb-2">
                                            <Activity className="w-8 h-8 text-[#262626]" />
                                        </div>
                                        <h4 className="text-lg font-black text-[#A3A3A3]">No logged sessions</h4>
                                        <p className="text-xs font-bold text-[#404040]">Your progress for this exercise will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
