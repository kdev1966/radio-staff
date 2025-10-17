import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../lib/api';
import ShiftModal from './ShiftModal';

type Assignment = { id: string; employee: { id: string; firstName: string; lastName: string; email: string } };
type Shift = {
  id: string;
  shiftDate: string;
  period: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  startTime: string;
  endTime: string;
  needed: number;
  assignments: Assignment[];
};

interface ShiftCalendarProps {
  employees: any[];
  onEmployeesChange?: () => Promise<void>;
}

export default function ShiftCalendar({ employees, onEmployeesChange }: ShiftCalendarProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get<Shift[]>('/shifts');
      setShifts(response.data);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadShifts();
    if (onEmployeesChange) {
      await onEmployeesChange();
    }
  };

  const events = shifts.map((s) => {
    const isFull = s.assignments.length >= s.needed;
    const isEmpty = s.assignments.length === 0;

    return {
      id: s.id,
      title: `${getPeriodLabel(s.period)} (${s.assignments.length}/${s.needed})`,
      start: `${s.shiftDate}T${s.startTime}`,
      end: `${s.shiftDate}T${s.endTime}`,
      backgroundColor: colorByPeriod(s.period),
      borderColor: isEmpty ? '#ef4444' : isFull ? '#10b981' : '#f59e0b',
      extendedProps: { shift: s },
    };
  });

  const colorByPeriod = (p: string) =>
    ({ MORNING: '#4ade80', AFTERNOON: '#facc15', NIGHT: '#3b82f6' }[p] || '#9ca3af');

  const getPeriodLabel = (p: string) =>
    ({ MORNING: 'Matin', AFTERNOON: 'A-M', NIGHT: 'Nuit' }[p] || p);

  const handleEventClick = (info: any) => {
    const shift: Shift = info.event.extendedProps.shift;
    setSelectedShift(shift);
  };

  const handleCloseModal = () => {
    setSelectedShift(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Planning des équipes</h2>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-gray-600">Vide</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-gray-600">Incomplet</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-gray-600">Complet</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          locale="fr"
          firstDay={1}
          buttonText={{
            today: "Aujourd'hui",
            month: 'Mois',
            week: 'Semaine',
            day: 'Jour',
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
        />
      )}

      {selectedShift && (
        <ShiftModal
          shift={selectedShift}
          employees={employees}
          onClose={handleCloseModal}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}