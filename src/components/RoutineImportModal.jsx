import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, CheckCircle, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const REQUIRED_COLS = ['exercise_name', 'split', 'sets', 'reps'];
const OPTIONAL_COLS = ['week_number', 'mesocycle', 'exercise_number', 'rpe', 'notes'];

function parseRows(rawRows) {
    return rawRows.map(row => {
        const clean = {};
        for (const k of Object.keys(row)) {
            clean[k.trim().toLowerCase()] = typeof row[k] === 'string' ? row[k].trim() : row[k];
        }
        return {
            week_number: parseInt(clean.week_number) || 1,
            mesocycle: clean.mesocycle || '',
            split: clean.split || '',
            exercise_number: parseInt(clean.exercise_number) || 1,
            exercise_name: clean.exercise_name || '',
            sets: clean.sets || '',
            reps: clean.reps || '',
            rpe: clean.rpe ? parseFloat(clean.rpe) : null,
            notes: clean.notes || '',
        };
    });
}

export default function RoutineImportModal({ isOpen, onClose, onSuccess }) {
    const { user } = useAuth();
    const fileRef = useRef(null);

    const [step, setStep] = useState('upload'); // upload | preview | inserting | done | error
    const [parsedRows, setParsedRows] = useState([]);
    const [parseError, setParseError] = useState('');
    const [existingMesos, setExistingMesos] = useState([]);
    const [latestMeso, setLatestMeso] = useState('');
    const [insertError, setInsertError] = useState('');
    const [fileName, setFileName] = useState('');

    const reset = () => {
        setStep('upload');
        setParsedRows([]);
        setParseError('');
        setExistingMesos([]);
        setLatestMeso('');
        setInsertError('');
        setFileName('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFile = (file) => {
        if (!file) return;
        setFileName(file.name);
        setParseError('');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const cols = (results.meta.fields || []).map(f => f.trim().toLowerCase());
                const missing = REQUIRED_COLS.filter(c => !cols.includes(c));
                if (missing.length > 0) {
                    setParseError(`Missing required columns: ${missing.join(', ')}`);
                    return;
                }

                const rows = parseRows(results.data);

                // Check for existing mesocycles in DB
                const csvMesos = [...new Set(rows.map(r => r.mesocycle).filter(Boolean))];
                if (csvMesos.length > 0 && user?.id) {
                    const { data: existing } = await supabase
                        .from('workout_templates')
                        .select('mesocycle')
                        .eq('user_id', user.id);

                    const dbMesos = [...new Set((existing || []).map(r => r.mesocycle).filter(Boolean))];
                    const conflicts = csvMesos.filter(m => dbMesos.includes(m));
                    setExistingMesos(conflicts);

                    // Find the latest mesocycle in DB alphabetically / by name
                    if (dbMesos.length > 0) {
                        const sorted = [...dbMesos].sort();
                        setLatestMeso(sorted[sorted.length - 1]);
                    }
                }

                setParsedRows(rows);
                setStep('preview');
            },
            error: (err) => {
                setParseError(`Failed to parse CSV: ${err.message}`);
            }
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleConfirm = async () => {
        setStep('inserting');
        setInsertError('');
        try {
            const rows = parsedRows.map(row => ({
                id: crypto.randomUUID(),
                user_id: user.id,
                week_number: row.week_number,
                mesocycle: row.mesocycle,
                split: row.split,
                exercise_number: row.exercise_number,
                exercise_name: row.exercise_name,
                sets: row.sets,
                reps: row.reps,
                rpe: row.rpe,
                notes: row.notes,
            }));

            const { error } = await supabase.from('workout_templates').insert(rows);
            if (error) throw error;

            setStep('done');
            // Notify parent to revalidate SWR cache
            if (onSuccess) onSuccess();
        } catch (err) {
            setInsertError(err.message || 'Insert failed');
            setStep('error');
        }
    };

    if (!isOpen) return null;

    // Derived summary
    const uniqueSplits = [...new Set(parsedRows.map(r => r.split).filter(Boolean))];
    const uniqueWeeks = [...new Set(parsedRows.map(r => r.week_number).filter(Boolean))];
    const uniqueMesos = [...new Set(parsedRows.map(r => r.mesocycle).filter(Boolean))];
    const mesoLabel = uniqueMesos.join(', ') || '—';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-lg bg-[#0A0A0A] border border-[#171717] rounded-[2.5rem] p-6 flex flex-col gap-6 animate-slide-up shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-white tracking-tight">Import Routines</h2>
                        <p className="text-[#A3A3A3] text-xs font-bold uppercase tracking-widest mt-0.5">
                            {step === 'upload' && 'Upload a CSV file'}
                            {step === 'preview' && 'Review before importing'}
                            {step === 'inserting' && 'Saving to database…'}
                            {step === 'done' && 'Import complete'}
                            {step === 'error' && 'Something went wrong'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── STEP: upload ── */}
                {step === 'upload' && (
                    <div className="flex flex-col gap-4">
                        {/* Drop zone */}
                        <label
                            htmlFor="csv-upload"
                            className="group relative flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#262626] hover:border-brand-500/60 rounded-3xl p-10 cursor-pointer transition-colors"
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#171717] border border-[#262626] flex items-center justify-center text-brand-500 group-hover:scale-105 transition-transform">
                                <Upload className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-sm">Drop your CSV here</p>
                                <p className="text-[#A3A3A3] text-xs mt-1">or click to browse</p>
                            </div>
                            <input
                                id="csv-upload"
                                ref={fileRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={e => handleFile(e.target.files?.[0])}
                            />
                        </label>

                        {/* Expected columns */}
                        <div className="bg-[#111111] border border-[#1C1C1C] rounded-2xl p-4">
                            <p className="text-[10px] font-black text-[#A3A3A3] uppercase tracking-widest mb-2">Expected Columns</p>
                            <div className="flex flex-wrap gap-1.5">
                                {REQUIRED_COLS.map(c => (
                                    <span key={c} className="px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-wider">{c}</span>
                                ))}
                                {OPTIONAL_COLS.map(c => (
                                    <span key={c} className="px-2 py-0.5 rounded-lg bg-[#1C1C1C] text-[#A3A3A3] text-[10px] font-black uppercase tracking-wider">{c}</span>
                                ))}
                            </div>
                            <p className="text-[9px] text-[#555] mt-2">Green = required · Grey = optional</p>
                        </div>

                        {parseError && (
                            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-red-400 text-xs font-bold leading-relaxed">{parseError}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP: preview ── */}
                {step === 'preview' && (
                    <div className="flex flex-col gap-4">
                        {/* File pill */}
                        <div className="flex items-center gap-3 bg-[#111111] border border-[#1C1C1C] rounded-2xl p-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-brand-500" />
                            </div>
                            <span className="text-white text-sm font-bold truncate flex-1">{fileName}</span>
                        </div>

                        {/* Summary card */}
                        <div className="bg-[#111111] border border-[#1C1C1C] rounded-2xl p-5 flex flex-col gap-3">
                            <SummaryRow label="Mesocycle" value={mesoLabel} />
                            <SummaryRow label="Splits" value={uniqueSplits.join(' · ') || '—'} />
                            <SummaryRow label="Weeks" value={uniqueWeeks.length > 0 ? String(Math.max(...uniqueWeeks)) : '—'} />
                            <SummaryRow label="Exercises" value={`${parsedRows.length} movements`} />
                            {latestMeso && (
                                <SummaryRow label="Latest in DB" value={latestMeso} dim />
                            )}
                        </div>

                        {/* Duplicate warning */}
                        {existingMesos.length > 0 && (
                            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <p className="text-yellow-300 text-xs font-bold leading-relaxed">
                                    <span className="text-yellow-400">{existingMesos.join(', ')}</span> already exists in your library.
                                    Existing data will be kept and new rows added.
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-2 mt-1">
                            <button
                                onClick={handleConfirm}
                                className="w-full py-4 rounded-2xl bg-brand-500 text-black font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-[0_0_30px_rgba(212,255,0,0.15)] hover:bg-brand-400 flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Confirm Import
                            </button>
                            <button
                                onClick={() => { reset(); }}
                                className="w-full py-4 rounded-2xl bg-[#171717] text-[#A3A3A3] font-black uppercase tracking-widest text-sm hover:text-white transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP: inserting ── */}
                {step === 'inserting' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-16 h-16 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
                        <p className="text-[#A3A3A3] font-bold text-sm">Importing {parsedRows.length} rows…</p>
                    </div>
                )}

                {/* ── STEP: done ── */}
                {step === 'done' && (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-brand-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-lg">Import Successful</p>
                            <p className="text-[#A3A3A3] text-xs font-bold mt-1">{parsedRows.length} movements added to your library</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-full py-4 rounded-2xl bg-brand-500 text-black font-black uppercase tracking-widest text-sm transition-all active:scale-95 mt-2"
                        >
                            Done
                        </button>
                    </div>
                )}

                {/* ── STEP: error ── */}
                {step === 'error' && (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-lg">Insert Failed</p>
                            <p className="text-red-400 text-xs font-bold mt-1 leading-relaxed">{insertError}</p>
                        </div>
                        <div className="flex flex-col gap-2 w-full mt-2">
                            <button
                                onClick={() => setStep('preview')}
                                className="w-full py-4 rounded-2xl bg-[#171717] text-white font-black uppercase tracking-widest text-sm hover:bg-[#262626] transition-all active:scale-95"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={handleClose}
                                className="w-full py-4 rounded-2xl bg-transparent text-[#A3A3A3] font-black uppercase tracking-widest text-sm hover:text-white transition-all active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryRow({ label, value, dim }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-[#A3A3A3] text-xs font-bold uppercase tracking-widest">{label}</span>
            <span className={`text-sm font-black ${dim ? 'text-[#555]' : 'text-white'}`}>{value}</span>
        </div>
    );
}
