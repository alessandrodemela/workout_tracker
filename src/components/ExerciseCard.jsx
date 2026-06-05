import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, Info, X, MoreHorizontal, FileText, ArrowRightLeft, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SetRow from './SetRow';
import { useWorkout } from '../context/WorkoutContext';

export default function ExerciseCard({ exercise, index, onUpdate, onRemove, onSubstitute }) {
    const navigate = useNavigate();
    const collapsed = !!exercise.collapsed;
    const [showNotes, setShowNotes] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const { setIsRestTimerExpanded, restTimer, startRestTimer } = useWorkout();

    const handleAddSet = () => {
        const lastSet = exercise.sets[exercise.sets.length - 1];
        const newSet = lastSet
            ? { ...lastSet, completed: false }
            : { kg: '', reps: '', rpe: 8, completed: false };
        onUpdate({ ...exercise, sets: [...exercise.sets, newSet] });
    };

    const handleSetChange = (setIndex, field, value) => {
        const newSets = [...exercise.sets];
        newSets[setIndex][field] = value;
        onUpdate({ ...exercise, sets: newSets });
    };

    const handleRemoveSet = (setIndex) => {
        const newSets = exercise.sets.filter((_, i) => i !== setIndex);
        onUpdate({ ...exercise, sets: newSets });
    };

    const handleToggleComplete = (setIndex) => {
        const newSets = [...exercise.sets];
        const isNowCompleted = !newSets[setIndex].completed;
        newSets[setIndex].completed = isNowCompleted;
        onUpdate({ ...exercise, sets: newSets });

        if (isNowCompleted && !restTimer.isActive) {
            const defaultRestStr = localStorage.getItem('defaultRestTimer');
            if (defaultRestStr && parseInt(defaultRestStr) > 0) {
                startRestTimer(parseInt(defaultRestStr));
                setIsRestTimerExpanded(true);
            } else {
                setIsRestTimerExpanded(true);
            }
        }
    };

    return (
        <div className="card-glass flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div 
                    onClick={() => navigate('/exercises', { state: { viewExercise: exercise.name } })}
                    className="flex items-center gap-3 w-3/4 cursor-pointer group/title"
                >
                    <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-1 rounded-full group-hover/title:bg-brand-500 group-hover/title:text-black transition-colors">
                        {index + 1}
                    </span>
                    <h3 className="text-base font-bold text-white truncate max-w-[200px] group-hover/title:text-brand-500 transition-colors flex items-center gap-1">
                        {exercise.name}
                        <Info className="w-3.5 h-3.5 text-[#525252] group-hover/title:text-brand-500 transition-colors flex-shrink-0" />
                    </h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative">
                        <button onClick={() => setShowMenu(true)} className="p-1 text-[#A3A3A3] hover:text-white rounded-full">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                        
                        <AnimatePresence>
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-48 bg-[#171717] border border-[#262626] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden py-1"
                                    >
                                        {exercise.notes && (
                                            <button onClick={() => { setShowNotes(true); setShowMenu(false); }} className="px-4 py-3 text-sm text-left font-bold text-white hover:bg-[#262626] flex items-center gap-3 transition-colors">
                                                <FileText className="w-4 h-4 text-brand-500" />
                                                View Notes
                                            </button>
                                        )}
                                        {onSubstitute && (
                                            <button onClick={() => { onSubstitute(); setShowMenu(false); }} className="px-4 py-3 text-sm text-left font-bold text-white hover:bg-[#262626] flex items-center gap-3 transition-colors">
                                                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                                                Substitute
                                            </button>
                                        )}
                                        <button onClick={() => { onRemove(); setShowMenu(false); }} className="px-4 py-3 text-sm text-left font-bold text-red-500 hover:bg-[#262626] flex items-center gap-3 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                            Remove
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                    <button onClick={() => onUpdate({ ...exercise, collapsed: !collapsed })} className="p-1 text-[#A3A3A3] hover:text-white">
                        {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="flex flex-col gap-2">
                    <div className="flex px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">
                        <div className="w-6 text-center">Set</div>
                        <div className="flex-1 text-center font-bold">Reps</div>
                        <div className="flex-1 text-center font-bold">KG</div>
                        <div className="w-[4.5rem]"></div>
                    </div>

                    <div className="flex flex-col">
                        {exercise.sets.map((set, i) => (
                            <SetRow
                                key={i}
                                index={i}
                                row={set}
                                onRowChange={(field, value) => handleSetChange(i, field, value)}
                                onRemove={() => handleRemoveSet(i)}
                                onToggleComplete={() => handleToggleComplete(i)}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleAddSet}
                        className="mt-2 py-3 w-full rounded-xl text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Set
                    </button>
                </div>
            )}

            <AnimatePresence>
                {showNotes && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotes(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm bg-[#0A0A0A] border border-[#171717] rounded-3xl overflow-hidden flex flex-col relative z-10"
                        >
                            <div className="p-5 border-b border-[#171717] flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tighter text-white">Exercise Notes</h3>
                                    <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mt-0.5">{exercise.name}</p>
                                </div>
                                <button onClick={() => setShowNotes(false)} className="w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-5 bg-black">
                                <p className="text-sm font-medium text-[#A3A3A3] whitespace-pre-wrap leading-relaxed">
                                    {exercise.notes}
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
