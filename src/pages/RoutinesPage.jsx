import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trophy, Calendar, Target, Activity, CheckCircle, TrendingUp, X, Flame, Library, Play, Dumbbell, Sparkles, Copy, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetcher, saveUserProfile, saveTemplatesFromAI } from '../api';
import { buildTrainingSummary, generateWorkoutMock, generateClaudePrompt } from '../services/aiService';
import { useNavigate } from 'react-router-dom';

const MOCK_AVATAR = (email) => email ? email.substring(0, 2).toUpperCase() : 'ST';

export default function RoutinesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data fetching
    const { data: profile, mutate: mutateProfile, isLoading: isProfileLoading } = useSWR(
        user ? `/profile/${user.id}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false
        }
    );
    const { data: summary, isLoading: isSummaryLoading } = useSWR(
        user ? ['training-summary', user.id] : null,
        ([, id]) => buildTrainingSummary(id),
        { revalidateOnFocus: false }
    );

    const { data: templatesResp } = useSWR(
        user ? '/templates' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: historyData } = useSWR(
        user ? '/workout-history' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [importJson, setImportJson] = useState('');
    const [isCopying, setIsCopying] = useState(false);

    const hasProfile = profile && profile.goal;

    const groupedTemplates = React.useMemo(() => {
        if (!templatesResp?.templates) return [];
        const groups = {};
        templatesResp.templates.forEach(t => {
            // Handle both legacy (flat) and new (joined) table structures
            const mName = t.mesocycle || t.Mesocycle || 'Unknown';
            const sName = t.split || t.Split || 'Routine';
            const wNum = t.block_number || t.Block_Number || 1;
            const rId = t.routine_id || t.Routine_ID;

            const key = `B${wNum}_${mName}_${sName}_${rId}`;
            if (!groups[key]) {
                // Check completion in history (e.g. done in the last 7 days)
                const isDone = historyData?.workouts?.some(h =>
                    h.session_type === sName &&
                    h.mesocycle === mName &&
                    (new Date() - new Date(h.date)) / (1000 * 60 * 60 * 24) < 7
                );

                groups[key] = {
                    id: key,
                    routineId: rId,
                    block: wNum,
                    mesocycle: mName,
                    split: sName,
                    exercises: [],
                    isCompleted: isDone
                };
            }
            groups[key].exercises.push(t);
        });

        // Find the first routine that is NOT completed to be the highlighted one
        const allRoutines = Object.values(groups).sort((a, b) => (a.block - b.block) || a.mesocycle.localeCompare(b.mesocycle));
        const firstPendingIdx = allRoutines.findIndex(r => !r.isCompleted);

        return allRoutines.map((r, i) => ({
            ...r,
            isRecommended: i === (firstPendingIdx === -1 ? 0 : firstPendingIdx)
        }));
    }, [templatesResp, historyData]);

    console.log('🔄 RoutinesPage render', { isProfileLoading, isSummaryLoading, hasProfile, templatesCount: groupedTemplates.length });

    const { data: mockWorkout, isLoading: isGeneratingMock } = useSWR(
        hasProfile && summary ? ['workout-mock', user.id] : null,
        () => generateWorkoutMock(profile, summary),
        { revalidateOnFocus: false, dedupingInterval: 300000 }
    );

    const isGenerating = isGeneratingMock;

    const handleStartStoredRoutine = (group) => {
        const prefillExercises = group.exercises.map(ex => ({
            name: ex.exercise_name || ex.Exercise_Name,
            sets: Array.from({ length: (ex.sets || ex.Sets) || 3 }, () => ({
                kg: '',
                reps: ex.reps || ex.Reps,
                rpe: ex.rpe || ex.RPE,
                completed: false
            }))
        }));

        navigate('/workout', {
            state: {
                routineId: group.routineId,
                sessionType: group.split,
                mesocycle: group.mesocycle,
                prefillExercises: prefillExercises,
                prefillNotes: `Meso: ${group.mesocycle} | Split: ${group.split}`
            }
        });
    };

    const handleProfileSubmit = async (formData) => {
        setIsModalOpen(false);
        await saveUserProfile(user.id, formData);
        mutateProfile();
    };

    const handleGeneratePrompt = async () => {
        const prompt = await generateClaudePrompt(profile, summary, user.id);
        setGeneratedPrompt(prompt);
        setIsPromptModalOpen(true);
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(generatedPrompt);
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 2000);
    };

    const handleImportRoutine = async () => {
        try {
            const data = JSON.parse(importJson);
            await saveTemplatesFromAI(user.id, data);
            
            // Immediate cache invalidation
            mutate('/templates');
            mutateProfile();
            
            setIsImportModalOpen(false);
            setImportJson('');
            
            // Brief timeout before reload to ensure SWR sees the change (optional but safe)
            setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            console.error('Import error:', err);
            alert('Invalid JSON format or database error. Please check Claude\'s output.');
        }
    };

    if (isProfileLoading || isSummaryLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Brain className="w-8 h-8 text-brand-500" />
                </motion.div>
            </div>
        );
    }



    return (
        <div className="flex-1 flex flex-col pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase">Routines</h1>
                    <span className="text-xs font-bold text-brand-500 uppercase tracking-widest">Adaptive Training</span>
                </div>
            </div>

            {!hasProfile ? (
                <NoProfileState onOpenModal={() => setIsModalOpen(true)} />
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-6"
                >
                    {/* Training Status
                    {summary && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#0A0A0A] border border-[#171717] rounded-3xl p-4 relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <Activity className="w-16 h-16 text-white" />
                                </div>
                                <span className="text-[10px] font-black text-[#A3A3A3] uppercase tracking-widest mb-2 z-10">Recovery</span>
                                <div className="flex items-center gap-2 z-10">
                                    <div className={`w-2 h-2 rounded-full ${summary.recovery_status === 'HIGH' ? 'bg-green-500' : summary.recovery_status === 'LOW' ? 'bg-red-500' : 'bg-yellow-500'} animate-pulse`} />
                                    <span className="text-lg font-black text-white uppercase tracking-wider">{summary.recovery_status}</span>
                                </div>
                                <span className="text-[10px] text-[#A3A3A3] mt-1 line-clamp-1 truncate z-10">
                                    {summary.last_workout_days_ago === 0 ? "Trained Today" : summary.last_workout_days_ago === 1 ? "1 Day Ago" : summary.last_workout_days_ago > 0 ? `${summary.last_workout_days_ago} Days Ago` : "No Recent Training"}
                                </span>
                            </div>

                            <div className="bg-[#0A0A0A] border border-[#171717] rounded-3xl p-4 relative overflow-hidden flex flex-col justify-between">
                                <span className="text-[10px] font-black text-[#A3A3A3] uppercase tracking-widest mb-2">Frequency</span>
                                <span className="text-2xl font-black text-white tracking-widest">{summary.weekly_frequency} <span className="text-sm font-bold text-[#A3A3A3]">/ wk</span></span>
                                <span className="text-[10px] text-[#A3A3A3] mt-1 border-t border-[#171717] pt-1">
                                    Avg RPE: <span className="text-brand-500">{summary.avg_rpe}</span>
                                </span>
                            </div>
                        </div>
                    )} */}

                    {/* Routine Hero Section (Horizontal Slider) */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <Play className="w-4 h-4 text-brand-500" />
                                <span className="text-sm font-bold text-[#A3A3A3] uppercase tracking-widest">Active Programs</span>
                            </div>
                        </div>

                        <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                            {groupedTemplates.map((group, idx) => (
                                <motion.button
                                    key={group.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleStartStoredRoutine(group)}
                                    className={`snap-center flex-shrink-0 w-72 h-44 rounded-[2.5rem] p-6 text-left flex flex-col justify-between relative overflow-hidden group transition-all shadow-xl ${group.isRecommended
                                            ? 'bg-brand-500 text-black shadow-brand-900/20'
                                            : 'bg-[#0A0A0A] border border-[#171717] text-white hover:border-brand-500/30'
                                        } ${group.isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                >
                                    {/* Background Icon */}
                                    <div className="absolute -top-4 -right-4 transition-transform group-hover:scale-110">
                                        {group.isRecommended ? (
                                            <Play className="w-32 h-32 text-black opacity-10 fill-black" />
                                        ) : (
                                            <Dumbbell className="w-32 h-32 text-white opacity-[0.03]" />
                                        )}
                                    </div>

                                    <div className="relative z-10 flex flex-col h-full justify-between">
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${group.isRecommended ? 'text-black/60' : 'text-brand-500'
                                                    }`}>
                                                    {group.mesocycle} • BLOCK {group.block}
                                                </span>
                                                {group.isCompleted && (
                                                    <CheckCircle className={`w-4 h-4 ${group.isRecommended ? 'text-black/60' : 'text-brand-500'}`} />
                                                )}
                                            </div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mt-1 group-hover:translate-x-1 transition-transform">
                                                {group.split}
                                            </h3>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold uppercase ${idx === 0 ? 'text-black/60' : 'text-[#525252]'
                                                    }`}>
                                                    {group.exercises.length} Movements
                                                </span>
                                            </div>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-black/10' : 'bg-brand-500/10'
                                                }`}>
                                                <Play className={`w-5 h-5 ${idx === 0 ? 'fill-black text-black' : 'fill-brand-500 text-brand-500'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}

                            {/* Add New Logic or Placeholder if needed */}
                            {groupedTemplates.length === 0 && (
                                <div className="w-full py-12 text-center text-[#525252] font-black uppercase tracking-widest text-[10px] bg-[#0A0A0A] border-2 border-dashed border-[#171717] rounded-3xl">
                                    No routines created yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Hub Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleGeneratePrompt}
                            className="bg-[#0A0A0A] border border-[#171717] rounded-3xl p-5 flex flex-col items-start gap-4 hover:border-brand-500/30 transition-all group active:scale-[0.98]"
                        >
                            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center transition-colors group-hover:bg-brand-500/20">
                                <Sparkles className="w-5 h-5 text-brand-500" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-black text-white uppercase tracking-tight">Get AI Prompt</span>
                                <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-widest mt-0.5">Context Generator</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="bg-[#0A0A0A] border border-[#171717] rounded-3xl p-5 flex flex-col items-start gap-4 hover:border-brand-500/30 transition-all group active:scale-[0.98]"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center transition-colors group-hover:bg-brand-500/20">
                                <ClipboardCheck className="w-5 h-5 text-[#A3A3A3] group-hover:text-brand-500" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-black text-white uppercase tracking-tight">Import Routine</span>
                                <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-widest mt-0.5">Paste Claude JSON</span>
                            </div>
                        </button>
                    </div>

                    {/* Saved Library (Vertical List if many, but we'll focus on the Hero) */}
                    {groupedTemplates.length > 3 && (
                        <div className="flex flex-col gap-4 mt-2">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <Library className="w-4 h-4 text-brand-500" />
                                    <span className="text-sm font-bold text-[#A3A3A3] uppercase tracking-widest">Library</span>
                                </div>
                                <span className="text-[10px] font-black text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    {groupedTemplates.length} Plans
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {groupedTemplates.map((group) => (
                                    <motion.div
                                        key={group.id}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleStartStoredRoutine(group)}
                                        className="bg-[#0A0A0A] border border-[#171717] rounded-3xl p-5 hover:border-brand-500/30 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                            <Trophy className="w-12 h-12 text-white" />
                                        </div>

                                        <div className="flex items-center justify-between mb-3 relative z-10">
                                            <div>
                                                <h4 className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-brand-500 transition-colors">
                                                    {group.split}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-[#525252] uppercase tracking-[0.2em]">{group.mesocycle}</span>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center group-hover:bg-brand-500 transition-colors">
                                                <Flame className="w-4 h-4 text-[#404040] group-hover:text-black" />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-x-2 gap-y-1 relative z-10">
                                            {group.exercises.slice(0, 5).map((ex, i) => (
                                                <span key={i} className="text-[10px] font-bold text-[#525252] flex items-center">
                                                    {ex.Exercise_Name}
                                                    {i < Math.min(group.exercises.length, 5) - 1 && <span className="ml-2 text-brand-500/30 opacity-50">•</span>}
                                                </span>
                                            ))}
                                            {group.exercises.length > 5 && (
                                                <span className="text-[10px] font-bold text-brand-500/50">+ {group.exercises.length - 5} more</span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Your Profile Settings */}
                    <div className="flex items-center justify-between px-2 pt-2">
                        <span className="text-sm font-bold text-[#A3A3A3]">Your Preferences</span>
                        <button onClick={() => setIsModalOpen(true)} className="text-[10px] font-black text-brand-500 uppercase tracking-widest hover:text-white transition-colors">
                            Edit
                        </button>
                    </div>
                </motion.div>
            )}

            <ProfileCreationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleProfileSubmit}
                initialData={profile}
            />

            <PromptDisplayModal
                isOpen={isPromptModalOpen}
                onClose={() => setIsPromptModalOpen(false)}
                prompt={generatedPrompt}
                onCopy={handleCopyPrompt}
                isCopying={isCopying}
            />

            <ImportRoutineModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                value={importJson}
                onChange={setImportJson}
                onImport={handleImportRoutine}
            />
        </div>
    );
}

// Subcomponents

function NoProfileState({ onOpenModal }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center mt-12"
        >
            <div className="w-24 h-24 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-brand-500/10 rounded-full blur-xl animate-pulse" />
                <Brain className="w-10 h-10 text-brand-500 opacity-80" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tighter mb-2">Build Your Routine</h2>
            <p className="text-sm text-[#A3A3A3] max-w-[240px] mb-8 leading-relaxed">
                Complete your profile to unlock an adaptive training system tailored to your goals and recovery.
            </p>

            <button
                onClick={onOpenModal}
                className="bg-white text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-500 shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
                Setup Profile
            </button>
        </motion.div>
    );
}

function ProfileCreationModal({ isOpen, onClose, onSubmit, initialData }) {
    const [formData, setFormData] = useState({
        goal: 'Hypertrophy',
        experience_level: 'Intermediate',
        training_days_per_week: 4,
        preferred_split: 'Upper/Lower',
        equipment: [],
        additional_info: '',
        notes: ''
    });

    useEffect(() => {
        if (initialData && initialData.goal) {
            setFormData({
                goal: initialData.goal,
                experience_level: initialData.experience_level,
                training_days_per_week: initialData.training_days_per_week,
                preferred_split: initialData.preferred_split,
                equipment: initialData.equipment || [],
                additional_info: initialData.additional_info || '',
                notes: initialData.notes || ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="w-full max-w-lg bg-[#0A0A0A] rounded-t-3xl sm:rounded-3xl border sm:border-y sm:border-x border-t border-[#171717] overflow-hidden flex flex-col relative z-10 max-h-[90vh]"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-[#171717]">
                            <div>
                                <h3 className="text-xl font-black tracking-tighter uppercase">Athlete Profile</h3>
                                <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mt-0.5">Configuration</p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                            {/* Goal */}
                            <div>
                                <label className="block text-xs font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">Primary Goal</label>
                                <select
                                    value={formData.goal}
                                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                                    className="w-full bg-[#171717] border border-[#262626] rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-brand-500 appearance-none"
                                >
                                    <option value="Hypertrophy">Hypertrophy (Muscle Gain)</option>
                                    <option value="Strength">Strength (Powerlifting)</option>
                                    <option value="Endurance">Endurance</option>
                                    <option value="General Fitness">General Fitness</option>
                                </select>
                            </div>

                            {/* Split */}
                            <div>
                                <label className="block text-xs font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">Preferred Split</label>
                                <select
                                    value={formData.preferred_split}
                                    onChange={(e) => setFormData({ ...formData, preferred_split: e.target.value })}
                                    className="w-full bg-[#171717] border border-[#262626] rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-brand-500 appearance-none"
                                >
                                    <option value="Upper/Lower">Upper / Lower</option>
                                    <option value="Push/Pull/Legs">Push / Pull / Legs</option>
                                    <option value="Full Body">Full Body</option>
                                    <option value="Bro Split">Body Part Focus (Bro Split)</option>
                                </select>
                            </div>

                            {/* Grid block */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">Days / Week</label>
                                    <input
                                        type="number"
                                        min="1" max="7"
                                        value={formData.training_days_per_week}
                                        onChange={(e) => setFormData({ ...formData, training_days_per_week: parseInt(e.target.value) || 4 })}
                                        className="w-full bg-[#171717] border border-[#262626] rounded-2xl px-4 py-3 text-white text-sm font-bold text-center focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">Level</label>
                                    <select
                                        value={formData.experience_level}
                                        onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                                        className="w-full bg-[#171717] border border-[#262626] rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-brand-500 appearance-none text-center"
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermed.</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div>
                                <label className="block text-xs font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">Anything Else? (e.g. Injury, Life Stress)</label>
                                <textarea
                                    value={formData.additional_info}
                                    onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                                    placeholder="I have a slight shoulder niggle..."
                                    className="w-full bg-[#171717] border border-[#262626] rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-brand-500 h-20 resize-none"
                                />
                            </div>

                            {/* Notes / Concepts */}
                            <div>
                                <label className="block text-xs font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">Training Concepts / Philsophy</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="I want to integrate cluster sets or heavy singles..."
                                    className="w-full bg-[#171717] border border-[#262626] rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-brand-500 h-24 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 h-14 bg-white text-black font-black uppercase tracking-[0.2em] text-sm rounded-2xl flex items-center justify-center hover:bg-brand-500 hover:text-black transition-colors"
                            >
                                Save Profile
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function PromptDisplayModal({ isOpen, onClose, prompt, onCopy, isCopying }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-2xl bg-[#0A0A0A] border border-[#171717] rounded-3xl overflow-hidden flex flex-col relative z-10 max-h-[80vh]"
                    >
                        <div className="p-6 border-b border-[#171717] flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Copy Prompt</h3>
                            <button onClick={onClose} className="text-[#A3A3A3] hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-black flex-1">
                            <pre className="text-[10px] text-[#A3A3A3] leading-relaxed whitespace-pre-wrap font-mono">
                                {prompt}
                            </pre>
                        </div>
                        <div className="p-6 border-t border-[#171717]">
                            <button
                                onClick={onCopy}
                                className="w-full h-14 bg-brand-500 text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
                            >
                                {isCopying ? <ClipboardCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {isCopying ? 'Copied!' : 'Copy for Claude'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function ImportRoutineModal({ isOpen, onClose, value, onChange, onImport }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-lg bg-[#0A0A0A] border border-[#171717] rounded-3xl overflow-hidden flex flex-col relative z-10"
                    >
                        <div className="p-6 border-b border-[#171717] flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Import Routine</h3>
                            <button onClick={onClose} className="text-[#A3A3A3] hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-[#A3A3A3] leading-relaxed">
                                Paste the raw JSON output from Claude here. Ensure it matches the requested format.
                            </p>
                            <textarea
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder='{ "session_type": "...", "exercises": [...] }'
                                className="w-full h-64 bg-black border border-[#171717] rounded-2xl p-4 text-xs font-mono text-brand-500 focus:outline-none focus:border-brand-500 resize-none"
                            />
                            <button
                                onClick={onImport}
                                disabled={!value}
                                className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center disabled:opacity-50"
                            >
                                Add to Library
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
