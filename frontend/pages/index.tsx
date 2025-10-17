import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface DashboardStats {
  totalEmployees: number;
  totalShifts: number;
  pendingLeaves: number;
  todayShifts: number;
}

interface Shift {
  id: string;
  shiftDate: string;
  period: string;
  startTime: string;
  endTime: string;
  needed: number;
  assignments: Array<{
    id: string;
    employee: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface LeaveRequest {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
  };
  startDate: string;
  endDate: string;
  type: string;
  status: string;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalShifts: 0,
    pendingLeaves: 0,
    todayShifts: 0,
  });
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [employeesRes, shiftsRes, leavesRes] = await Promise.all([
        api.get('/employee'),
        api.get('/shifts'),
        api.get('/leave'),
      ]);

      const employees = employeesRes.data;
      const shifts = shiftsRes.data;
      const leaves = leavesRes.data;

      const today = new Date().toISOString().split('T')[0];
      const todayShiftsData = shifts.filter(
        (s: Shift) => s.shiftDate.split('T')[0] === today
      );

      const pendingLeaves = leaves.filter(
        (l: LeaveRequest) => l.status === 'PENDING' || l.status === 'APPROVED_BY_MANAGER'
      );

      setStats({
        totalEmployees: employees.length,
        totalShifts: shifts.length,
        pendingLeaves: pendingLeaves.length,
        todayShifts: todayShiftsData.length,
      });

      setTodayShifts(todayShiftsData);
      setRecentLeaves(leaves.slice(0, 5));
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      MORNING: 'Matin (07h-13h)',
      AFTERNOON: 'Après-midi (13h-19h)',
      NIGHT: 'Nuit (19h-07h)',
    };
    return labels[period] || period;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      APPROVED_BY_MANAGER: { label: 'Validé manager', color: 'bg-blue-100 text-blue-800' },
      APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Refusé', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      CP: { label: 'CP', color: 'bg-blue-100 text-blue-800' },
      RTT: { label: 'RTT', color: 'bg-purple-100 text-purple-800' },
      MALADIE: { label: 'Maladie', color: 'bg-red-100 text-red-800' },
      FORMATION: { label: 'Formation', color: 'bg-green-100 text-green-800' },
      SPECIAL: { label: 'Spécial', color: 'bg-orange-100 text-orange-800' },
    };
    const badge = badges[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-2">Service de Radiologie - Hôpital Central</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Employés</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
          <Link href="/employes" className="text-blue-600 text-sm mt-4 inline-block hover:underline">
            Voir tous →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Quarts planifiés</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalShifts}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
          <Link href="/planning" className="text-green-600 text-sm mt-4 inline-block hover:underline">
            Voir le planning →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Congés en attente</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingLeaves}</p>
            </div>
            <div className="text-4xl">🏖️</div>
          </div>
          <Link href="/conges" className="text-yellow-600 text-sm mt-4 inline-block hover:underline">
            Gérer les congés →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Quarts aujourd'hui</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayShifts}</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* Today's Shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quarts d'aujourd'hui</h2>
          {todayShifts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun quart prévu aujourd'hui</p>
          ) : (
            <div className="space-y-4">
              {todayShifts.map((shift) => (
                <div key={shift.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{getPeriodLabel(shift.period)}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        shift.assignments.length === 0
                          ? 'bg-red-100 text-red-800'
                          : shift.assignments.length >= shift.needed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {shift.assignments.length}/{shift.needed}
                    </span>
                  </div>
                  {shift.assignments.length > 0 ? (
                    <div className="space-y-1">
                      {shift.assignments.map((assignment) => (
                        <p key={assignment.id} className="text-sm text-gray-600">
                          • {assignment.employee.firstName} {assignment.employee.lastName}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">⚠ Aucun employé assigné</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leave Requests */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Demandes de congés récentes</h2>
          {recentLeaves.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune demande de congé</p>
          ) : (
            <div className="space-y-4">
              {recentLeaves.map((leave) => (
                <div key={leave.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {leave.employee.firstName} {leave.employee.lastName}
                    </h3>
                    {getTypeBadge(leave.type)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Du {new Date(leave.startDate).toLocaleDateString('fr-FR')} au{' '}
                    {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                  </p>
                  {getStatusBadge(leave.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/planning"
            className="bg-white/20 hover:bg-white/30 rounded-lg p-4 transition-colors"
          >
            <div className="text-3xl mb-2">📅</div>
            <h3 className="font-semibold">Gérer le planning</h3>
            <p className="text-sm text-blue-100 mt-1">Créer et assigner des quarts</p>
          </Link>
          <Link
            href="/employes"
            className="bg-white/20 hover:bg-white/30 rounded-lg p-4 transition-colors"
          >
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-semibold">Gérer les employés</h3>
            <p className="text-sm text-blue-100 mt-1">Ajouter ou modifier des employés</p>
          </Link>
          <Link
            href="/conges"
            className="bg-white/20 hover:bg-white/30 rounded-lg p-4 transition-colors"
          >
            <div className="text-3xl mb-2">🏖️</div>
            <h3 className="font-semibold">Valider les congés</h3>
            <p className="text-sm text-blue-100 mt-1">Approuver les demandes en attente</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
