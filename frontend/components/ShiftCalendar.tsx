import { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import { api } from '../lib/api';
import ShiftModal from './ShiftModal';

type Assignment = { id: string; employee: { id: string; firstName: string; lastName: string; matricule: string; role: string } };
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
  const draggableRef = useRef<any>(null);

  useEffect(() => {
    loadShifts();
  }, []);

  useEffect(() => {
    // Initialize draggable for external elements
    if (typeof window !== 'undefined') {
      const containerEl = document.getElementById('external-events');
      if (containerEl && !draggableRef.current) {
        draggableRef.current = new Draggable(containerEl, {
          itemSelector: '.draggable-employee',
          eventData: function(eventEl) {
            return {
              title: eventEl.innerText,
              id: eventEl.getAttribute('data-employee-id'),
              employeeId: eventEl.getAttribute('data-employee-id'),
            };
          }
        });
      }
    }

    return () => {
      if (draggableRef.current) {
        draggableRef.current.destroy();
        draggableRef.current = null;
      }
    };
  }, [employees]);

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

  const colorByPeriod = (p: string) =>
    ({ MORNING: '#4ade80', AFTERNOON: '#facc15', NIGHT: '#3b82f6' }[p] || '#9ca3af');

  const getPeriodLabel = (p: string) =>
    ({ MORNING: 'Matin', AFTERNOON: 'A-M', NIGHT: 'Nuit' }[p] || p);

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

  const handleEventClick = (info: any) => {
    const shift: Shift = info.event.extendedProps.shift;
    setSelectedShift(shift);
  };

  const handleCloseModal = () => {
    setSelectedShift(null);
  };

  const handleDrop = async (info: any) => {
    const employeeId = info.event?.extendedProps?.employeeId;
    const shiftDate = info.dateStr || (info.date ? info.date.toISOString().split('T')[0] : null);

    console.log('[Drop] Employee ID:', employeeId, 'Date:', shiftDate);

    if (!employeeId || !shiftDate) {
      console.log('[Drop] Missing employeeId or date');
      return;
    }

    // Find all shifts for this date
    const dayShifts = shifts.filter(s => {
      const sDate = s.shiftDate.split('T')[0];
      return sDate === shiftDate;
    });

    console.log('[Drop] Found shifts:', dayShifts.length);

    if (dayShifts.length === 0) {
      alert('Aucun shift disponible pour cette date');
      return;
    }

    // If there's only one shift, assign to it
    if (dayShifts.length === 1) {
      try {
        await api.post(`/shifts/${dayShifts[0].id}/assign`, { employeeId });
        alert('Employé assigné avec succès');
        await handleRefresh();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Erreur lors de l\'assignation');
      }
      return;
    }

    // If multiple shifts, let user choose
    const shiftNames = dayShifts.map((s, idx) =>
      `${idx + 1}. ${getPeriodLabel(s.period)} (${s.assignments.length}/${s.needed})`
    ).join('\n');

    const choice = prompt(`Plusieurs shifts disponibles :\n${shiftNames}\n\nChoisissez le numéro du shift (1-${dayShifts.length}) :`);

    if (!choice) return;

    const shiftIndex = parseInt(choice) - 1;
    if (shiftIndex >= 0 && shiftIndex < dayShifts.length) {
      try {
        await api.post(`/shifts/${dayShifts[shiftIndex].id}/assign`, { employeeId });
        alert('Employé assigné avec succès');
        await handleRefresh();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Erreur lors de l\'assignation');
      }
    }
  };

  const handleEventDrop = async (info: any) => {
    // Handle when an event is dragged to a new time/date
    info.revert(); // Revert for now as we don't support moving shifts
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <style jsx global>{`
        .fc-event {
          cursor: pointer !important;
          transition: all 0.2s ease;
        }
        .fc-event:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          opacity: 0.9;
        }
        .fc-event-title {
          font-weight: 600;
        }
      `}</style>
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
          <div className="flex items-center">
            <span className="text-gray-500 italic">💡 Cliquez sur un shift pour gérer les assignations</span>
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
          droppable={true}
          editable={true}
          drop={handleDrop}
          eventDrop={handleEventDrop}
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