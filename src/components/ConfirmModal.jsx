import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto">
            <div className="w-full max-w-sm bg-[#171717] border border-[#262626] rounded-[2.5rem] p-8 shadow-2xl animate-scale-in">
                <div className="flex flex-col items-center text-center gap-6">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}>
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
                        <p className="text-[#A3A3A3] text-sm font-medium leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="flex flex-col w-full gap-3 mt-2">
                        <button
                            onClick={onConfirm}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 ${type === 'danger' ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-brand-500 text-black shadow-[0_0_30px_rgba(212,255,0,0.2)]'}`}
                        >
                            {confirmText}
                        </button>
                        {cancelText && (
                            <button
                                onClick={onClose}
                                className="w-full py-4 rounded-2xl bg-[#262626] text-[#A3A3A3] font-black uppercase tracking-widest text-sm hover:text-white transition-all active:scale-95"
                            >
                                {cancelText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
