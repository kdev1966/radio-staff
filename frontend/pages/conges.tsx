import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/lib/keycloak';
import { api } from '@/lib/api';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string };
  startDate: string;
  endDate: string;
  days: number;
  type: 'CP' | 'RTT' | 'MALADIE' | 'FORMATION' | 'SPECIAL';
  status: 'PENDING' | 'APPROVED_BY_MANAGER' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  rejectionReason?: string;
}

const leaveTypeLabels = {
  CP: 'Congés Payés',
  RTT: 'RTT',
  MALADIE: 'Maladie',
  FORMATION: 'Formation',
  SPECIAL: 'Congé Spécial',
};

const statusLabels = {
  PENDING: 'En attente',
  APPROVED_BY_MANAGER: 'Validé chef de service',
  APPROVED: 'Approuvé RH',
  REJECTED: 'Rejeté',
};

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED_BY_MANAGER: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function CongesPage() {
  const { keycloak, initialized } = useAuth();
  const [isManager, setIsManager] = useState(false);
  const [isHR, setIsHR] = useState(false);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [managerApprovedRequests, setManagerApprovedRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<'CP' | 'RTT' | 'MALADIE' | 'FORMATION' | 'SPECIAL'>('CP');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialized && keycloak?.authenticated) {
      const roles = keycloak.realmAccess?.roles || [];
      setIsManager(roles.includes('CHEF_SERVICE') || roles.includes('ADMIN'));
      setIsHR(roles.includes('RH') || roles.includes('ADMIN'));
      loadRequests();
    } else if (initialized) {
      keycloak?.login();
    }
  }, [initialized, keycloak]);

  const loadRequests = async () => {
    try {
      setLoading(true);

      const allResponse = await api.get('/leave');
      const allRequests = allResponse.data;

      setMyRequests(allRequests);

      const roles = keycloak?.realmAccess?.roles || [];
      if (roles.includes('CHEF_SERVICE') || roles.includes('ADMIN')) {
        setPendingRequests(allRequests.filter((r: LeaveRequest) => r.status === 'PENDING'));
      }

      if (roles.includes('RH') || roles.includes('ADMIN')) {
        setManagerApprovedRequests(allRequests.filter((r: LeaveRequest) => r.status === 'APPROVED_BY_MANAGER'));
      }
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      alert('Veuillez sélectionner une période');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    try {
      setSubmitting(true);
      await api.post('/leave', {
        employeeId: keycloak?.tokenParsed?.sub,
        startDate,
        endDate,
        days,
        type: leaveType,
      });

      setStartDate('');
      setEndDate('');
      setLeaveType('CP');
      setReason('');
      setShowForm(false);

      await loadRequests();
      alert('Demande de congé créée avec succès');
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      alert(error.response?.data?.message || 'Erreur lors de la création de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveByManager = async (id: string) => {
    if (!confirm('Approuver cette demande en tant que chef de service ?')) return;

    try {
      await api.post(`/leave/${id}/approve-manager`);
      await loadRequests();
      alert('Demande approuvée. En attente de validation RH.');
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'approbation');
    }
  };

  const handleApproveByHR = async (id: string) => {
    if (!confirm('Approuver cette demande en tant que RH (validation finale) ?')) return;

    try {
      await api.post(`/leave/${id}/approve-hr`);
      await loadRequests();
      alert('Demande approuvée définitivement');
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Motif du rejet (optionnel):');
    if (reason === null) return;

    try {
      await api.post(`/leave/${id}/reject`, { reason: reason || undefined });
      await loadRequests();
      alert('Demande rejetée');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.response?.data?.message || 'Erreur lors du rejet');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette demande ?')) return;

    try {
      await api.delete(`/leave/${id}`);
      await loadRequests();
      alert('Demande supprimée');
    } catch (error: any) {
      console.error('Error deleting request:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Gestion des Congés - Radio Staff Manager</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <button className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Retour
                  </button>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Congés</h1>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouvelle demande
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* New Request Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Nouvelle demande de congé</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Date de début
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      min={startDate}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-2">
                    Type de congé
                  </label>
                  <select
                    id="leaveType"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="CP">Congés Payés</option>
                    <option value="RTT">RTT</option>
                    <option value="MALADIE">Maladie</option>
                    <option value="FORMATION">Formation</option>
                    <option value="SPECIAL">Congé Spécial</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Envoi...' : 'Soumettre la demande'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* My Requests Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mes demandes</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Aucune demande de congé
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motif</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {leaveTypeLabels[request.type]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[request.status]}`}>
                              {statusLabels[request.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {request.rejectionReason || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {request.status === 'PENDING' && (
                              <button
                                onClick={() => handleDelete(request.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                Supprimer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Pending Requests (Manager View) */}
          {isManager && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Demandes en attente</h2>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  Aucune demande en attente
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motif</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : `Employé #${request.employeeId}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.days} jours)
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {leaveTypeLabels[request.type]}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                              <button
                                onClick={() => handleApproveByManager(request.id)}
                                className="text-green-600 hover:text-green-900 font-medium transition-colors"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                className="text-red-600 hover:text-red-900 font-medium transition-colors"
                              >
                                Rejeter
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HR Approval Requests */}
          {isHR && managerApprovedRequests.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Validation RH - Demandes approuvées par le chef de service</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {managerApprovedRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : `Employé #${request.employeeId}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.days} jours)
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {leaveTypeLabels[request.type]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[request.status]}`}>
                              {statusLabels[request.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                            <button
                              onClick={() => handleApproveByHR(request.id)}
                              className="text-green-600 hover:text-green-900 font-medium transition-colors"
                            >
                              Valider (RH)
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="text-red-600 hover:text-red-900 font-medium transition-colors"
                            >
                              Rejeter
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
