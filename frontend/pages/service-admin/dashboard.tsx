import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

interface DashboardOverview {
  employees: {
    total: number;
    active: number;
    archived: number;
    byRole: { role: string; count: number }[];
  };
  leaves: {
    total: number;
    pending: number;
    approvedByRH: number;
    approved: number;
    rejectedByRH: number;
    rejectedByAdmin: number;
    byType: { type: string; count: number }[];
  };
  shifts: {
    total: number;
    assigned: number;
    unassigned: number;
    byPeriod: { period: string; count: number }[];
    byDayType: { dayType: string; count: number }[];
  };
  pending: {
    pendingLeaveApprovalsRH: number;
    pendingLeaveApprovalsAdmin: number;
    unassignedShifts: number;
    total: number;
  };
}

export default function ServiceAdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && !user.isSuperAdmin && !user.serviceId) {
      setError('Vous devez appartenir à un service pour accéder à cette page');
      setLoading(false);
      return;
    }

    if (user && user.role !== 'ADMIN' && user.role !== 'RH') {
      setError('Accès réservé aux administrateurs et RH');
      setLoading(false);
      return;
    }

    loadOverview();
  }, [user, authLoading, router]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/service-admin/dashboard/overview');
      setOverview(response.data);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Service</h1>
              <p className="text-gray-600 mt-1">
                Vue d'ensemble de votre service de radiologie
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions en attente */}
        {overview.pending.total > 0 && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  {overview.pending.total} action(s) en attente
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {overview.pending.pendingLeaveApprovalsRH > 0 && (
                      <li>
                        {overview.pending.pendingLeaveApprovalsRH} demande(s) de congé à approuver (RH)
                      </li>
                    )}
                    {overview.pending.pendingLeaveApprovalsAdmin > 0 && (
                      <li>
                        {overview.pending.pendingLeaveApprovalsAdmin} demande(s) de congé à approuver (Admin)
                      </li>
                    )}
                    {overview.pending.unassignedShifts > 0 && (
                      <li>{overview.pending.unassignedShifts} shift(s) non assigné(s)</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/service-admin/employees">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-blue-600 text-2xl mb-2">👥</div>
              <h3 className="text-lg font-semibold text-gray-900">Employés</h3>
              <p className="text-gray-600 text-sm">Gérer les employés</p>
            </div>
          </Link>

          <Link href="/service-admin/leaves">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-green-600 text-2xl mb-2">🏖️</div>
              <h3 className="text-lg font-semibold text-gray-900">Congés</h3>
              <p className="text-gray-600 text-sm">Gérer les demandes</p>
            </div>
          </Link>

          <Link href="/service-admin/shifts">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-purple-600 text-2xl mb-2">📅</div>
              <h3 className="text-lg font-semibold text-gray-900">Planning</h3>
              <p className="text-gray-600 text-sm">Gérer les shifts</p>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-orange-600 text-2xl mb-2">📊</div>
            <h3 className="text-lg font-semibold text-gray-900">Rapports</h3>
            <p className="text-gray-600 text-sm">Statistiques</p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employés */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employés</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold">{overview.employees.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Actifs</span>
                <span className="font-semibold text-green-600">
                  {overview.employees.active}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Archivés</span>
                <span className="font-semibold text-gray-400">
                  {overview.employees.archived}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="text-sm text-gray-600 mb-2">Par rôle:</div>
                {overview.employees.byRole.map((r) => (
                  <div key={r.role} className="flex justify-between text-sm">
                    <span className="text-gray-600">{r.role}</span>
                    <span>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Congés */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Congés</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold">{overview.leaves.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">En attente</span>
                <span className="font-semibold text-yellow-600">
                  {overview.leaves.pending}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Approuvés RH</span>
                <span className="font-semibold text-blue-600">
                  {overview.leaves.approvedByRH}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Approuvés</span>
                <span className="font-semibold text-green-600">
                  {overview.leaves.approved}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="text-sm text-gray-600 mb-2">Par type:</div>
                {overview.leaves.byType.map((t) => (
                  <div key={t.type} className="flex justify-between text-sm">
                    <span className="text-gray-600">{t.type}</span>
                    <span>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shifts */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Planning</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total shifts</span>
                <span className="font-semibold">{overview.shifts.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assignés</span>
                <span className="font-semibold text-green-600">
                  {overview.shifts.assigned}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Non assignés</span>
                <span className="font-semibold text-red-600">
                  {overview.shifts.unassigned}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="text-sm text-gray-600 mb-2">Par période:</div>
                {overview.shifts.byPeriod.map((p) => (
                  <div key={p.period} className="flex justify-between text-sm">
                    <span className="text-gray-600">{p.period}</span>
                    <span>{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
