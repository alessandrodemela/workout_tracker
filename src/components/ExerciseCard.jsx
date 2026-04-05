import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import SetRow from './SetRow';
import { useWorkout } from '../context/WorkoutContext';

export default function ExerciseCard({ exercise, index, onUpdate, onRemove }) {
    const [collapsed, setCollapsed] = useState(false);
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
                <div className="flex items-center gap-3 w-3/4">
                    <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-1 rounded-full">
                        {index + 1}
                    </span>
                    <h3 className="text-base font-bold text-white truncate">{exercise.name}</h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={onRemove} className="text-[#A3A3A3] hover:text-brand-500 text-[10px] font-bold uppercase tracking-widest">
                        Remove
                    </button>
                    <button onClick={() => setCollapsed(!collapsed)} className="p-1 text-[#A3A3A3] hover:text-white">
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
        </div>
    );
}
