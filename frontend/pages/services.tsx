import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface RadiologyService {
  id: string;
  name: string;
  hospitalName: string;
  address?: string;
  status: string;
  subscriptionTier: string;
  subscriptionEndsAt?: string;
  trialEndsAt?: string;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<RadiologyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<RadiologyService | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadServices();
    }
  }, [user]);

  const loadServices = async () => {
    try {
      const response = await api.get('/super-admin/services');
      setServices(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (service: RadiologyService) => {
    if (!confirm(`Suspendre le service "${service.name}" ?`)) return;

    setActionLoading(true);
    try {
      await api.patch(`/super-admin/services/${service.id}/suspend`);
      await loadServices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la suspension');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (service: RadiologyService) => {
    if (!confirm(`Activer le service "${service.name}" ?`)) return;

    setActionLoading(true);
    try {
      await api.patch(`/super-admin/services/${service.id}/activate`);
      await loadServices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de l\'activation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;

    setActionLoading(true);
    try {
      await api.delete(`/super-admin/services/${selectedService.id}`);
      setShowDeleteConfirm(false);
      setSelectedService(null);
      await loadServices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement des services...</p>
        </div>
      </div>
    );
  }

  if (!user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Accès non autorisé</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Services</h1>
          <p className="text-gray-600 mt-2">Gérer tous les services de radiologie de la plateforme</p>
        </div>
        <Link
          href="/services/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Nouveau Service
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium">Total Services</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{services.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium">Services Actifs</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {services.filter((s) => s.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium">Suspendus</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {services.filter((s) => s.status === 'SUSPENDED').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium">Employés Total</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {services.reduce((sum, s) => sum + s.employeeCount, 0)}
          </p>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hôpital
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employés
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                    <div className="text-sm text-gray-500">{service.address}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{service.hospitalName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(service.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getTierBadge(service.subscriptionTier)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{service.employeeCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link
                    href={`/services/${service.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Voir
                  </Link>
                  {service.status === 'ACTIVE' ? (
                    <button
                      onClick={() => handleSuspend(service)}
                      disabled={actionLoading}
                      className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                    >
                      Suspendre
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(service)}
                      disabled={actionLoading}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50"
                    >
                      Activer
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedService(service);
                      setShowDeleteConfirm(true);
                    }}
                    disabled={actionLoading}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {services.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun service trouvé</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirmer la suppression</h2>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer le service <strong>{selectedService.name}</strong> ?
              <br />
              <br />
              <span className="text-red-600 font-semibold">
                ⚠️ Cette action est irréversible et supprimera également tous les employés, quarts et congés associés.
              </span>
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedService(null);
                }}
                disabled={actionLoading}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
