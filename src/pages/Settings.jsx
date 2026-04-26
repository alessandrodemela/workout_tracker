import React, { useState } from 'react';
import { ChevronLeft, Download, Timer, Dumbbell, MapPin, Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { API_URL, fetcher, deleteUserGym, setDefaultGym } from '../api';
import { useAuth } from '../context/AuthContext';
import { useGym } from '../context/GymContext';
import GymEditorModal from '../components/GymEditorModal';
import ConfirmModal from '../components/ConfirmModal';

export default function Settings() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeGymId, setActiveGym, refreshGyms } = useGym();

    // Default Rest Timer. 0 means disabled (ask user).
    const [defaultRest, setDefaultRest] = useState(
        parseInt(localStorage.getItem('defaultRestTimer') || '0')
    );

    const handleRestChange = (val) => {
        setDefaultRest(val);
        localStorage.setItem('defaultRestTimer', val.toString());
    };

    // Export Workouts
    const { data: historyData } = useSWR(`${API_URL}/workout-history`, fetcher);

    const handleExportCSV = () => {
        if (!historyData || !historyData.workouts) {
            alert('No workout data available to export.');
            return;
        }
        const workouts = historyData.workouts;
        if (workouts.length === 0) { alert('No workouts to export.'); return; }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Session_Type,Exercise,Kg,Sets,Reps,RPE,Notes\n";
        workouts.forEach(w => {
            const row = [
                w.Date,
                w.Session_Type,
                `"${w.Exercise || ''}"`,
                w.Kg || '',
                w.Sets || '',
                `"${w.Reps ? w.Reps.replace(/"/g, '""') : ''}"`,
                w.RPE || '',
                `"${w.Notes ? w.Notes.replace(/"/g, '""') : ''}"`
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `workout_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ─── Gyms ───────────────────────────────────────────────────
    const [gyms, setGyms] = useState(null); // local copy for instant UI
    const [gymsLoading, setGymsLoading] = useState(false);
    const { gyms: contextGyms, gymsLoaded } = useGym();

    // Mirror context gyms into local state when loaded
    React.useEffect(() => {
        if (gymsLoaded && contextGyms) setGyms(contextGyms);
    }, [contextGyms, gymsLoaded]);

    const [gymEditor, setGymEditor] = useState({ open: false, gym: null });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // gymId being processed

    const handleGymSaved = async () => {
        const updated = await refreshGyms();
        if (updated) setGyms(updated);
    };

    const handleDelete = async (gym) => {
        setActionLoading(gym.id);
        try {
            await deleteUserGym(gym.id);
            const updated = await refreshGyms();
            if (updated) setGyms(updated);
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(null);
            setDeleteTarget(null);
        }
    };

    const handleSetDefault = async (gym) => {
        setActionLoading(gym.id);
        try {
            await setDefaultGym(user.id, gym.id);
            const updated = await refreshGyms();
            if (updated) setGyms(updated);
            // Also update active context if user sets a new default
            setActiveGym(gym);
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-32 animate-fade-in w-full">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black tracking-tight text-white">Settings</h1>
                </div>
            </div>

            <div className="flex flex-col gap-6">

                {/* ─── My Gyms ─────────────────────────────────── */}
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-brand-500" /> My Gyms
                    </h2>

                    <div className="flex flex-col gap-2">
                        {!gymsLoaded ? (
                            <div className="flex items-center justify-center py-8 text-[#A3A3A3]">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                <span className="text-sm font-bold">Loading gyms…</span>
                            </div>
                        ) : (gyms || []).length === 0 ? (
                            <div className="card-glass border-[#171717] p-6 flex flex-col items-center gap-2 text-center">
                                <span className="text-3xl">🏋️</span>
                                <p className="text-sm text-[#A3A3A3] font-bold">No gyms yet</p>
                                <p className="text-xs text-[#404040]">Create your first gym to track available equipment</p>
                            </div>
                        ) : (
                            (gyms || []).map(gym => (
                                <div key={gym.id} className="card-glass border-[#171717] p-4 flex items-center gap-3">
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-2xl bg-[#171717] flex items-center justify-center text-2xl shrink-0">
                                        {gym.icon || '🏋️'}
                                    </div>
                                    {/* Info */}
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-white text-base truncate">{gym.name}</span>
                                            {gym.is_default && (
                                                <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-500 text-[10px] font-black uppercase tracking-widest shrink-0">
                                                    Default
                                                </span>
                                            )}
                                            {activeGymId === gym.id && !gym.is_default && (
                                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest shrink-0">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    {actionLoading === gym.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3] shrink-0" />
                                    ) : (
                                        <div className="flex items-center gap-1 shrink-0">
                                            {!gym.is_default && (
                                                <button
                                                    title="Set as default"
                                                    onClick={() => handleSetDefault(gym)}
                                                    className="w-9 h-9 rounded-xl text-[#A3A3A3] hover:text-brand-500 hover:bg-brand-500/10 transition-all flex items-center justify-center"
                                                >
                                                    <Star className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                title="Edit gym"
                                                onClick={() => setGymEditor({ open: true, gym })}
                                                className="w-9 h-9 rounded-xl text-[#A3A3A3] hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                title="Delete gym"
                                                onClick={() => setDeleteTarget(gym)}
                                                className="w-9 h-9 rounded-xl text-[#A3A3A3] hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        {/* New gym button */}
                        <button
                            onClick={() => setGymEditor({ open: true, gym: null })}
                            className="w-full py-4 rounded-[2rem] border-2 border-dashed border-[#262626] text-[#A3A3A3] font-bold hover:border-brand-500 hover:text-brand-500 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" /> New Gym
                        </button>
                    </div>
                </div>

                {/* Timer Section */}
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Timer className="w-5 h-5 text-brand-500" /> Defaults
                    </h2>
                    <div className="card-glass border-[#171717] p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="font-bold text-white">Auto Rest Timer</span>
                                <span className="text-xs text-[#A3A3A3]">Auto starts when set is completed (0 to ask)</span>
                            </div>
                            <div className="flex items-center gap-2 w-28">
                                <input
                                    type="number"
                                    className="bg-[#171717] text-white w-full text-center py-2 rounded-xl focus:outline-none focus:border-brand-500 border border-[#262626]"
                                    value={defaultRest}
                                    onChange={(e) => handleRestChange(parseInt(e.target.value) || 0)}
                                    min="0"
                                    step="10"
                                />
                                <span className="text-xs font-bold text-[#A3A3A3]">s</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Export Section */}
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-brand-500" /> Data Management
                    </h2>
                    <div className="card-glass border-[#171717] p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col flex-1">
                                <span className="font-bold text-white">Export Workouts</span>
                                <span className="text-xs text-[#A3A3A3]">Download your complete history as CSV</span>
                            </div>
                            <button
                                onClick={handleExportCSV}
                                className="w-12 h-12 rounded-2xl bg-[#171717] text-[#404040] flex items-center justify-center hover:text-brand-500 hover:border-brand-500 transition-all border border-transparent"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* GymEditorModal */}
            <GymEditorModal
                isOpen={gymEditor.open}
                onClose={() => setGymEditor({ open: false, gym: null })}
                onSaved={handleGymSaved}
                userId={user?.id}
                gymToEdit={gymEditor.gym}
            />

            {/* Delete confirm */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
                title="Delete Gym?"
                message={`"${deleteTarget?.name}" and all its equipment settings will be permanently deleted.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
}
