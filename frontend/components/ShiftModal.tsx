import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Assignment {
  id: string;
  employee: Employee;
}

interface Shift {
  id: string;
  shiftDate: string;
  period: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  startTime: string;
  endTime: string;
  needed: number;
  assignments: Assignment[];
}

interface Suggestion {
  employee: Employee;
  weeklyHours: number;
  nightShiftsThisWeek: number;
}

interface ShiftModalProps {
  shift: Shift;
  employees: Employee[];
  onClose: () => void;
  onRefresh: () => void;
}

const periodLabels = {
  MORNING: 'Matin (07h-13h)',
  AFTERNOON: 'Après-midi (13h-19h)',
  NIGHT: 'Nuit (19h-07h)',
};

const periodColors = {
  MORNING: 'bg-green-100 text-green-800 border-green-300',
  AFTERNOON: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  NIGHT: 'bg-blue-100 text-blue-800 border-blue-300',
};

export default function ShiftModal({ shift, employees, onClose, onRefresh }: ShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, [shift.id]);

  const loadSuggestions = async () => {
    try {
      const response = await api.get(`/shifts/${shift.id}/suggestions`);
      setSuggestions(response.data);
    } catch (err) {
      console.error('Error loading suggestions:', err);
    }
  };

  const handleAssign = async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      await api.post(`/shifts/${shift.id}/assign`, { employeeId });
      await onRefresh();
      await loadSuggestions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'assignation');
      console.error('Error assigning employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    if (!confirm('Retirer cet employé du shift ?')) return;

    try {
      setLoading(true);
      setError(null);
      await api.delete(`/shifts/assign/${assignmentId}`);
      await onRefresh();
      await loadSuggestions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du retrait');
      console.error('Error unassigning employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const availableEmployees = employees.filter(
    (emp) => !shift.assignments.some((a) => a.employee.id === emp.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b-4 ${periodColors[shift.period]} rounded-t-lg`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {periodLabels[shift.period]}
              </h2>
              <p className="text-gray-600">{formatDate(shift.shiftDate)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Assignés: <span className="font-bold">{shift.assignments.length}</span> / {shift.needed}
            </span>
            {shift.assignments.length < shift.needed && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                {shift.needed - shift.assignments.length} manquant(s)
              </span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Current Assignments */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employés assignés</h3>
          {shift.assignments.length === 0 ? (
            <p className="text-gray-500 italic">Aucun employé assigné</p>
          ) : (
            <div className="space-y-2">
              {shift.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {assignment.employee.firstName} {assignment.employee.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{assignment.employee.email}</p>
                  </div>
                  <button
                    onClick={() => handleUnassign(assignment.id)}
                    disabled={loading}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Employee */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ajouter un employé</h3>
            {suggestions.length > 0 && (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showSuggestions ? 'Voir tous' : `Suggestions (${suggestions.length})`}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(showSuggestions ? suggestions.map((s) => s.employee) : availableEmployees).length === 0 ? (
              <p className="text-gray-500 italic">Aucun employé disponible</p>
            ) : (
              (showSuggestions ? suggestions : availableEmployees.map((emp) => ({ employee: emp, weeklyHours: 0, nightShiftsThisWeek: 0 }))).map((item) => {
                const employee = 'employee' in item ? item.employee : item;
                const isSuggestion = 'weeklyHours' in item;

                return (
                  <div
                    key={employee.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isSuggestion ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                        {isSuggestion && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            Suggéré
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{employee.email}</p>
                      {isSuggestion && (
                        <p className="text-xs text-gray-600 mt-1">
                          {item.weeklyHours}h cette semaine • {item.nightShiftsThisWeek} nuit(s)
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAssign(employee.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Assigner
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
