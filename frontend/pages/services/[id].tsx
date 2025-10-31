import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface ServiceDetails {
  id: string;
  name: string;
  hospitalName: string;
  address?: string;
  status: string;
  subscriptionTier: string;
  subscriptionEndsAt?: string;
  trialEndsAt?: string;
  employeeCount: number;
  shiftCount: number;
  leaveRequestCount: number;
  createdAt: string;
  updatedAt: string;
  employees?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }>;
}

interface ServiceStats {
  totalEmployees: number;
  totalShifts: number;
  totalLeaveRequests: number;
  pendingLeaves: number;
  status: string;
  tier: string;
}

export default function ServiceDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [service, setService] = useState<ServiceDetails | null>(null);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id && user?.isSuperAdmin) {
      loadServiceDetails();
      loadServiceStats();
    }
  }, [id, user]);

  const loadServiceDetails = async () => {
    try {
      const response = await api.get(`/super-admin/services/${id}`);
      setService(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du service:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceStats = async () => {
    try {
      const response = await api.get(`/super-admin/services/${id}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleSuspend = async () => {
    if (!confirm('Suspendre ce service ?')) return;

    setActionLoading(true);
    try {
      await api.patch(`/super-admin/services/${id}/suspend`);
      await loadServiceDetails();
      await loadServiceStats();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la suspension');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!confirm('Activer ce service ?')) return;

    setActionLoading(true);
    try {
      await api.patch(`/super-admin/services/${id}/activate`);
      await loadServiceDetails();
      await loadServiceStats();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de l\'activation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('⚠️ ATTENTION : Cette action est irréversible et supprimera tous les employés, shifts et congés associés. Continuer ?')) {
      return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/super-admin/services/${id}`);
      router.push('/services');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-800' },
      SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-800' },
      TRIAL: { label: 'Essai', color: 'bg-blue-100 text-blue-800' },
      EXPIRED: { label: 'Expiré', color: 'bg-gray-100 text-gray-800' },
    };
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      TRIAL: { label: 'Essai', color: 'bg-gray-100 text-gray-800' },
      BASIC: { label: 'Basic', color: 'bg-blue-100 text-blue-800' },
      PRO: { label: 'Pro', color: 'bg-purple-100 text-purple-800' },
      ENTERPRISE: { label: 'Enterprise', color: 'bg-yellow-100 text-yellow-800' },
    };
    const badge = badges[tier] || { label: tier, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Service introuvable</p>
        <Link href="/services" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Retour aux services
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href="/services" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Retour aux services
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
            <p className="text-gray-600 mt-2">{service.hospitalName}</p>
            {service.address && <p className="text-gray-500 text-sm">{service.address}</p>}
          </div>
          <div className="flex gap-3">
            <Link
              href={`/services/${id}/edit`}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Modifier
            </Link>
            {service.status === 'ACTIVE' ? (
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                Suspendre
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={actionLoading}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Activer
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Status and Tier */}
      <div className="flex gap-4 mb-8">
        {getStatusBadge(service.status)}
        {getTierBadge(service.subscriptionTier)}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium">Employés</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-medium">Quarts Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalShifts}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm font-medium">Demandes de Congés</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalLeaveRequests}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-medium">Congés en Attente</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingLeaves}</p>
          </div>
        </div>
      )}

      {/* Information Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informations</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">ID</dt>
              <dd className="text-sm text-gray-900 font-mono">{service.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Date de création</dt>
              <dd className="text-sm text-gray-900">
                {new Date(service.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Dernière modification</dt>
              <dd className="text-sm text-gray-900">
                {new Date(service.updatedAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
            {service.trialEndsAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fin de l'essai</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(service.trialEndsAt).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            )}
            {service.subscriptionEndsAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fin d'abonnement</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(service.subscriptionEndsAt).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="space-y-3">
            <Link
              href={`/service-admin/${id}/employees`}
              className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">👥</span>
                <div>
                  <p className="font-semibold text-gray-900">Gérer les Employés</p>
                  <p className="text-sm text-gray-600">{service.employeeCount} employés</p>
                </div>
              </div>
            </Link>
            <Link
              href={`/service-admin/${id}/shifts`}
              className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">📅</span>
                <div>
                  <p className="font-semibold text-gray-900">Planning des Quarts</p>
                  <p className="text-sm text-gray-600">{service.shiftCount} quarts planifiés</p>
                </div>
              </div>
            </Link>
            <Link
              href={`/service-admin/${id}/leaves`}
              className="block w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏖️</span>
                <div>
                  <p className="font-semibold text-gray-900">Demandes de Congés</p>
                  <p className="text-sm text-gray-600">{service.leaveRequestCount} demandes</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Employees List */}
      {service.employees && service.employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold text-gray-900">Employés du Service</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {service.employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{employee.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.role}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
