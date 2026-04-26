import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { X, Check, ChevronDown, ChevronUp, Search, Loader2 } from 'lucide-react';
import { API_URL, fetcher, createUserGym, updateUserGym, setGymEquipment, getGymEquipment } from '../api';

const EMOJI_OPTIONS = ['🏋️', '🏠', '🏃', '🧘', '⚡', '🔥', '💪', '🏔️', '🏊', '🚴', '🥊', '🤸'];

const CATEGORY_LABELS = {
    free_weights: 'Free Weights',
    benches: 'Benches',
    racks: 'Racks',
    cables: 'Cables',
    machines: 'Machines',
    cardio_machines: 'Cardio Machines',
    suspension: 'Suspension',
    bodyweight_stations: 'Bodyweight Stations',
    functional: 'Functional',
    other: 'Other',
};

export default function GymEditorModal({ isOpen, onClose, onSaved, userId, gymToEdit }) {
    const isEdit = !!gymToEdit;

    const [name, setName] = useState('');
    const [icon, setIcon] = useState('🏋️');
    const [selectedUuids, setSelectedUuids] = useState(new Set());
    const [openCategories, setOpenCategories] = useState({});
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const { data: allEquipment, isLoading: equipmentLoading } = useSWR(
        isOpen ? `${API_URL}/equipment` : null,
        fetcher
    );

    // Pre-fill form when editing
    useEffect(() => {
        if (!isOpen) return;
        if (isEdit) {
            setName(gymToEdit.name || '');
            setIcon(gymToEdit.icon || '🏋️');
        } else {
            setName('');
            setIcon('🏋️');
        }
        setSearch('');
        setError(null);
        setSelectedUuids(new Set());
    }, [isOpen, gymToEdit, isEdit]);

    // Load existing equipment selection when editing
    useEffect(() => {
        if (!isOpen || !isEdit || !gymToEdit?.id) return;
        getGymEquipment(gymToEdit.id).then(uuids => {
            setSelectedUuids(new Set(uuids));
        }).catch(() => {});
    }, [isOpen, isEdit, gymToEdit]);

    const grouped = useMemo(() => {
        if (!allEquipment) return {};
        const filtered = search
            ? allEquipment.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
            : allEquipment;
        return filtered.reduce((acc, eq) => {
            const cat = eq.category || 'other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(eq);
            return acc;
        }, {});
    }, [allEquipment, search]);

    const toggleCategory = (cat) => {
        setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const toggleEquipment = (uuid) => {
        setSelectedUuids(prev => {
            const next = new Set(prev);
            if (next.has(uuid)) next.delete(uuid);
            else next.add(uuid);
            return next;
        });
    };

    const toggleAllInCategory = (catItems) => {
        const allSelected = catItems.every(e => selectedUuids.has(e.uuid));
        setSelectedUuids(prev => {
            const next = new Set(prev);
            if (allSelected) {
                catItems.forEach(e => next.delete(e.uuid));
            } else {
                catItems.forEach(e => next.add(e.uuid));
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!name.trim()) { setError('Gym name is required.'); return; }
        setSaving(true);
        setError(null);
        try {
            let gymId;
            if (isEdit) {
                await updateUserGym(gymToEdit.id, { name: name.trim(), icon });
                gymId = gymToEdit.id;
            } else {
                const newGym = await createUserGym(userId, { name: name.trim(), icon });
                gymId = newGym.id;
            }
            await setGymEquipment(gymId, Array.from(selectedUuids));
            onSaved();
            onClose();
        } catch (e) {
            setError(e?.message || 'Failed to save gym.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center px-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-[#0A0A0A] border border-[#1A1A1A] rounded-t-[2.5rem] flex flex-col animate-slide-up shadow-2xl"
                style={{ maxHeight: '92dvh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-white">{isEdit ? 'Edit Gym' : 'New Gym'}</h2>
                        <p className="text-xs text-[#A3A3A3] font-bold mt-0.5">Configure name, icon and equipment</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-5">
                    {/* Name */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Full Gym"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="input-field"
                        />
                    </div>

                    {/* Icon picker */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map(em => (
                                <button
                                    key={em}
                                    onClick={() => setIcon(em)}
                                    className={`w-11 h-11 rounded-2xl text-xl transition-all ${icon === em
                                        ? 'bg-brand-500/20 ring-2 ring-brand-500'
                                        : 'bg-[#171717] hover:bg-[#262626]'
                                        }`}
                                >
                                    {em}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Equipment */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">
                            Equipment
                            {selectedUuids.size > 0 && (
                                <span className="ml-2 text-brand-500">{selectedUuids.size} selected</span>
                            )}
                        </label>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3] pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search equipment..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="input-field pl-10 text-sm"
                            />
                        </div>

                        {equipmentLoading ? (
                            <div className="flex items-center justify-center py-8 text-[#A3A3A3]">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span className="text-sm font-bold">Loading equipment…</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {Object.keys(grouped).length === 0 && (
                                    <p className="text-xs text-[#A3A3A3] text-center py-4">No equipment found</p>
                                )}
                                {Object.entries(grouped).map(([cat, items]) => {
                                    const isOpen = openCategories[cat] ?? true;
                                    const allSel = items.every(e => selectedUuids.has(e.uuid));
                                    const someSel = items.some(e => selectedUuids.has(e.uuid));
                                    return (
                                        <div key={cat} className="rounded-2xl overflow-hidden border border-[#1A1A1A]">
                                            {/* Category header */}
                                            <div className="flex items-center justify-between bg-[#111111] px-4 py-3">
                                                <button
                                                    className="flex items-center gap-2 flex-1 text-left"
                                                    onClick={() => toggleCategory(cat)}
                                                >
                                                    <span className="text-xs font-black uppercase tracking-widest text-[#A3A3A3]">
                                                        {CATEGORY_LABELS[cat] || cat}
                                                    </span>
                                                    {someSel && (
                                                        <span className="text-[10px] font-black text-brand-500">
                                                            {items.filter(e => selectedUuids.has(e.uuid)).length}/{items.length}
                                                        </span>
                                                    )}
                                                    {isOpen
                                                        ? <ChevronUp className="w-4 h-4 text-[#A3A3A3] ml-auto" />
                                                        : <ChevronDown className="w-4 h-4 text-[#A3A3A3] ml-auto" />
                                                    }
                                                </button>
                                                {/* Select all for category */}
                                                <button
                                                    onClick={() => toggleAllInCategory(items)}
                                                    className={`ml-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${allSel
                                                        ? 'border-brand-500 text-brand-500 bg-brand-500/10'
                                                        : 'border-[#262626] text-[#A3A3A3] hover:border-[#404040]'
                                                        }`}
                                                >
                                                    {allSel ? 'Deselect all' : 'Select all'}
                                                </button>
                                            </div>

                                            {/* Equipment items */}
                                            {isOpen && (
                                                <div className="bg-[#0D0D0D] flex flex-col divide-y divide-[#1A1A1A]">
                                                    {items.map(eq => {
                                                        const sel = selectedUuids.has(eq.uuid);
                                                        return (
                                                            <button
                                                                key={eq.uuid}
                                                                onClick={() => toggleEquipment(eq.uuid)}
                                                                className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                                                            >
                                                                <span className={`text-sm font-bold ${sel ? 'text-white' : 'text-[#A3A3A3]'}`}>
                                                                    {eq.name}
                                                                </span>
                                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${sel
                                                                    ? 'bg-brand-500 text-black'
                                                                    : 'bg-[#1A1A1A] border border-[#2A2A2A]'
                                                                    }`}>
                                                                    {sel && <Check className="w-3 h-3 stroke-[3]" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-xs text-red-400 font-bold text-center">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-8 pt-4 flex gap-3 shrink-0 border-t border-[#1A1A1A]">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-2xl bg-[#171717] text-[#A3A3A3] font-bold text-sm hover:bg-[#262626] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] py-4 rounded-2xl bg-brand-500 text-black font-black text-sm hover:bg-brand-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><Check className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Gym'}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
