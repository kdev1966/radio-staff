import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface SuperAdmin {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function SuperAdminsPage() {
  const { user } = useAuth();
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<SuperAdmin | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadSuperAdmins();
    }
  }, [user]);

  const loadSuperAdmins = async () => {
    try {
      const response = await api.get('/super-admins');
      setSuperAdmins(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des super admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (admin: SuperAdmin) => {
    if (!confirm(`Désactiver le super admin "${admin.fullName}" ?`)) return;

    setActionLoading(true);
    try {
      await api.patch(`/super-admins/${admin.id}/deactivate`);
      await loadSuperAdmins();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la désactivation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (admin: SuperAdmin) => {
    if (!confirm(`Activer le super admin "${admin.fullName}" ?`)) return;

    setActionLoading(true);
    try {
      await api.patch(`/super-admins/${admin.id}/activate`);
      await loadSuperAdmins();
    } catch (error: any) {
      alert(error.response?.data?.message || "Erreur lors de l'activation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAdmin) return;

    setActionLoading(true);
    try {
      await api.delete(`/super-admins/${selectedAdmin.id}`);
      setShowDeleteConfirm(false);
      setSelectedAdmin(null);
      await loadSuperAdmins();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement des super admins...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Super Admins</h1>
          <p className="text-gray-600 mt-2">Gérer les administrateurs de la plateforme</p>
        </div>
        <Link
          href="/super-admins/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Nouveau Super Admin
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium">Total Super Admins</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{superAdmins.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium">Actifs</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {superAdmins.filter((a) => a.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium">Inactifs</p>
          <p className="text-3xl font-bold text-gray-600 mt-2">
            {superAdmins.filter((a) => !a.isActive).length}
          </p>
        </div>
      </div>

      {/* Super Admins Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom Complet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dernière Connexion
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {superAdmins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{admin.fullName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{admin.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(admin.isActive)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{formatDate(admin.lastLoginAt)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link
                    href={`/super-admins/${admin.id}/edit`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Modifier
                  </Link>
                  {admin.isActive ? (
                    <button
                      onClick={() => handleDeactivate(admin)}
                      disabled={actionLoading}
                      className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                    >
                      Désactiver
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(admin)}
                      disabled={actionLoading}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50"
                    >
                      Activer
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedAdmin(admin);
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

        {superAdmins.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun super admin trouvé</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirmer la suppression</h2>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer le super admin <strong>{selectedAdmin.fullName}</strong> ?
              <br />
              <br />
              <span className="text-red-600 font-semibold">
                ⚠️ Cette action est irréversible.
              </span>
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedAdmin(null);
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
