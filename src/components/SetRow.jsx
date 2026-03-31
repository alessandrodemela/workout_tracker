import React from 'react';
import { Check, Trash2 } from 'lucide-react';

export default function SetRow({ index, row, onRowChange, onRemove, onToggleComplete }) {
    return (
        <div className={`flex items-center gap-2 py-2 border-b border-[#262626] last:border-0 relative transition-all ${row.completed ? 'opacity-50' : ''}`}>
            <div className="flex-shrink-0 w-6 text-[10px] font-black text-[#A3A3A3] text-center">
                {index + 1}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="relative">
                    <input
                        type="number"
                        step="0.5"
                        value={row.kg}
                        onChange={e => onRowChange('kg', e.target.value)}
                        className="set-input bg-[#171717] rounded-lg text-sm"
                        placeholder="kg"
                        disabled={row.completed}
                    />
                </div>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={row.reps}
                        onChange={e => onRowChange('reps', e.target.value)}
                        className="set-input bg-[#171717] rounded-lg text-sm"
                        placeholder="reps"
                        disabled={row.completed}
                    />
                </div>
            </div>

            <button
                onClick={onToggleComplete}
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${row.completed ? 'bg-green-500/20 text-green-500' : 'bg-[#171717] text-[#A3A3A3] hover:text-white'
                    }`}
            >
                <Check className="w-4 h-4" strokeWidth={3} />
            </button>
            <button
                onClick={onRemove}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#A3A3A3] hover:text-brand-500 transition-colors"
                aria-label="Remove set"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
