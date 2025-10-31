import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

interface Shift {
  id: string;
  serviceId: string;
  shiftDate: string;
  period: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  startTime: string;
  endTime: string;
  dayType: 'NORMAL' | 'WEEKEND_HOLIDAY';
  needed: number;
  assigned: number;
  assignments: Assignment[];
}

interface Assignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  assignedAt: string;
}

interface Employee {
  id: string;
  fullName: string;
  matricule: string;
  isActive: boolean;
}

export default function ServiceAdminShifts() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month'>('list');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'ADMIN' && user.role !== 'RH') {
      setError('Accès réservé aux administrateurs et RH');
      setLoading(false);
      return;
    }

    loadShifts();
    loadEmployees();
  }, [user, authLoading, router]);

  // Reload shifts when view mode changes
  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'RH')) {
      loadShifts();
    }
  }, [viewMode]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      if (viewMode === 'week') {
        // Get current week start (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        const weekStart = monday.toISOString().split('T')[0];

        response = await api.get(`/service-admin/shifts/weekly/${weekStart}`);
      } else if (viewMode === 'month') {
        // Get current month
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        response = await api.get(`/service-admin/shifts/monthly/${year}/${month}`);
      } else {
        response = await api.get('/service-admin/shifts');
      }

      setShifts(response.data);
    } catch (err: any) {
      console.error('Error loading shifts:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des shifts');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await api.get('/service-admin/employees');
      setEmployees(
        response.data.filter((emp: Employee) => emp.isActive)
      );
    } catch (err: any) {
      console.error('Error loading employees:', err);
    }
  };

  const handleAssignEmployee = async () => {
    if (!selectedShift || !selectedEmployeeId) return;

    try {
      setError('');
      await api.post(`/service-admin/shifts/${selectedShift.id}/assign`, {
        employeeId: selectedEmployeeId,
      });
      setShowAssignModal(false);
      setSelectedShift(null);
      setSelectedEmployeeId('');
      loadShifts();
    } catch (err: any) {
      console.error('Error assigning employee:', err);
      setError(err.response?.data?.message || "Erreur lors de l'assignation");
    }
  };

  const handleUnassignEmployee = async (shiftId: string) => {
    if (!confirm('Désassigner l\'employé de ce shift ?')) {
      return;
    }

    try {
      setError('');
      await api.post(`/service-admin/shifts/${shiftId}/unassign`);
      loadShifts();
    } catch (err: any) {
      console.error('Error unassigning employee:', err);
      setError(err.response?.data?.message || 'Erreur lors de la désassignation');
    }
  };

  const openAssignModal = (shift: Shift) => {
    setSelectedShift(shift);
    setSelectedEmployeeId('');
    setShowAssignModal(true);
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'MORNING':
        return 'Matin';
      case 'AFTERNOON':
        return 'Après-midi';
      case 'NIGHT':
        return 'Nuit';
      default:
        return period;
    }
  };

  const getPeriodColor = (period: string) => {
    switch (period) {
      case 'MORNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'AFTERNOON':
        return 'bg-blue-100 text-blue-800';
      case 'NIGHT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const groupShiftsByDate = () => {
    const grouped: Record<string, Shift[]> = {};
    shifts.forEach((shift) => {
      const date = shift.shiftDate;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(shift);
    });
    return grouped;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  const groupedShifts = groupShiftsByDate();
  const dates = Object.keys(groupedShifts).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestion des Shifts
              </h1>
              <p className="text-gray-600 mt-1">{shifts.length} shift(s) planifié(s)</p>
            </div>
            <button
              onClick={() => router.push('/service-admin/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* View Mode Selector */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📋 Liste
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📅 Semaine
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📆 Mois
            </button>
          </div>
        </div>

        {/* Shifts by Date */}
        <div className="space-y-6">
          {dates.map((date) => (
            <div key={date} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {formatDate(date)}
              </h3>

              <div className="space-y-4">
                {groupedShifts[date]
                  .sort((a, b) => {
                    const order = { MORNING: 1, AFTERNOON: 2, NIGHT: 3 };
                    return order[a.period as keyof typeof order] - order[b.period as keyof typeof order];
                  })
                  .map((shift) => (
                    <div
                      key={shift.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`px-3 py-1 text-sm font-semibold rounded-full ${getPeriodColor(
                                shift.period,
                              )}`}
                            >
                              {getPeriodLabel(shift.period)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                            </span>
                            {shift.dayType === 'WEEKEND_HOLIDAY' && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                Week-end/Férié
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">Employés nécessaires:</span>{' '}
                            {shift.needed} | <span className="font-medium">Assignés:</span>{' '}
                            <span
                              className={
                                shift.assigned >= shift.needed
                                  ? 'text-green-600 font-semibold'
                                  : 'text-red-600 font-semibold'
                              }
                            >
                              {shift.assigned}
                            </span>
                          </div>

                          {shift.assignments.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-700">
                                Employés assignés:
                              </div>
                              {shift.assignments.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                                >
                                  <div className="text-sm">
                                    <span className="font-medium">
                                      {assignment.employeeName}
                                    </span>{' '}
                                    <span className="text-gray-500">
                                      ({assignment.employeeMatricule})
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleUnassignEmployee(shift.id)}
                                    className="text-red-600 hover:text-red-900 text-xs"
                                  >
                                    Désassigner
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {shift.assignments.length === 0 && (
                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              ⚠️ Aucun employé assigné
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="ml-4">
                          <button
                            onClick={() => openAssignModal(shift)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Assigner
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {dates.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
              Aucun shift planifié
            </div>
          )}
        </div>
      </div>

      {/* Assign Employee Modal */}
      {showAssignModal && selectedShift && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Assigner un employé
              </h3>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  <div>
                    <strong>Date:</strong> {formatDate(selectedShift.shiftDate)}
                  </div>
                  <div>
                    <strong>Période:</strong> {getPeriodLabel(selectedShift.period)}
                  </div>
                  <div>
                    <strong>Horaire:</strong> {formatTime(selectedShift.startTime)} -{' '}
                    {formatTime(selectedShift.endTime)}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un employé
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">-- Choisir un employé --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.matricule})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAssignEmployee}
                  disabled={!selectedEmployeeId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Assigner
                </button>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedShift(null);
                    setSelectedEmployeeId('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
