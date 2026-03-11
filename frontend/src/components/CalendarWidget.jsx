import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarWidget({ activeDays = [] }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // Adjust for Monday start instead of Sunday
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const renderDays = () => {
        const days = [];
        for (let i = 0; i < startOffset; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isActive = activeDays.includes(dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <div key={i} className="flex items-center justify-center w-8 h-8 relative">
                    <span className={`text-xs font-medium z-10 ${isActive ? 'text-brand-500 font-bold' : 'text-[#A3A3A3]'}`}>
                        {i}
                    </span>
                    {isActive && (
                        <div className="absolute inset-0 bg-brand-500/10 border border-brand-500/30 rounded-full" />
                    )}
                    {isToday && !isActive && (
                        <div className="absolute bottom-1 w-1 h-1 bg-[#FAFAFA] rounded-full" />
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="card-glass flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-white tracking-tight">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-1 text-[#A3A3A3] hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={nextMonth} className="p-1 text-[#A3A3A3] hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-y-3 text-center place-items-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-[10px] font-black text-[#A3A3A3] opacity-50 mb-1">{day}</div>
                ))}
                {renderDays()}
            </div>
        </div>
    );
}
