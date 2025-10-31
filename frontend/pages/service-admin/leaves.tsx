import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  startDate: string;
  endDate: string;
  days: number;
  type: string;
  status: string;
  comment?: string;
  rhReviewedAt?: string;
  rhComment?: string;
  adminReviewedAt?: string;
  adminComment?: string;
  rejectionReason?: string;
  requestedAt: string;
}

export default function ServiceAdminLeaves() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

    loadLeaves();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (filterStatus === 'ALL') {
      setFilteredLeaves(leaves);
    } else {
      setFilteredLeaves(leaves.filter((l) => l.status === filterStatus));
    }
  }, [filterStatus, leaves]);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/service-admin/leaves');
      setLeaves(response.data);
      setFilteredLeaves(response.data);
    } catch (err: any) {
      console.error('Error loading leaves:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des congés');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveByRH = async (leaveId: string) => {
    if (!confirm('Approuver cette demande de congé (RH) ?')) {
      return;
    }

    try {
      setError('');
      await api.post(`/service-admin/leaves/${leaveId}/approve-rh`);
      loadLeaves();
    } catch (err: any) {
      console.error('Error approving leave:', err);
      setError(err.response?.data?.message || "Erreur lors de l'approbation");
    }
  };

  const handleRejectByRH = async () => {
    if (!rejectingLeave) return;

    try {
      setError('');
      await api.post(`/service-admin/leaves/${rejectingLeave.id}/reject-rh`, {
        reason: rejectionReason,
      });
      setShowRejectModal(false);
      setRejectingLeave(null);
      setRejectionReason('');
      loadLeaves();
    } catch (err: any) {
      console.error('Error rejecting leave:', err);
      setError(err.response?.data?.message || 'Erreur lors du rejet');
    }
  };

  const handleApproveByAdmin = async (leaveId: string) => {
    if (!confirm('Approuver définitivement cette demande de congé (Admin) ?')) {
      return;
    }

    try {
      setError('');
      await api.post(`/service-admin/leaves/${leaveId}/approve-admin`);
      loadLeaves();
    } catch (err: any) {
      console.error('Error approving leave:', err);
      setError(err.response?.data?.message || "Erreur lors de l'approbation finale");
    }
  };

  const handleRejectByAdmin = async () => {
    if (!rejectingLeave) return;

    try {
      setError('');
      await api.post(`/service-admin/leaves/${rejectingLeave.id}/reject-admin`, {
        reason: rejectionReason,
      });
      setShowRejectModal(false);
      setRejectingLeave(null);
      setRejectionReason('');
      loadLeaves();
    } catch (err: any) {
      console.error('Error rejecting leave:', err);
      setError(err.response?.data?.message || 'Erreur lors du rejet');
    }
  };

  const openRejectModal = (leave: LeaveRequest, isAdmin: boolean) => {
    setRejectingLeave({ ...leave, status: isAdmin ? 'ADMIN_REJECT' : 'RH_REJECT' } as any);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED_BY_RH':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED_BY_RH':
      case 'REJECTED_BY_ADMIN':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'APPROVED_BY_RH':
        return 'Approuvé RH';
      case 'APPROVED':
        return 'Approuvé';
      case 'REJECTED_BY_RH':
        return 'Rejeté RH';
      case 'REJECTED_BY_ADMIN':
        return 'Rejeté Admin';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Congés</h1>
              <p className="text-gray-600 mt-1">
                {filteredLeaves.length} demande(s) de congé
              </p>
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

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-4 py-2 rounded ${
                filterStatus === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tous ({leaves.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-4 py-2 rounded ${
                filterStatus === 'PENDING'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              En attente ({leaves.filter((l) => l.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED_BY_RH')}
              className={`px-4 py-2 rounded ${
                filterStatus === 'APPROVED_BY_RH'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Approuvé RH ({leaves.filter((l) => l.status === 'APPROVED_BY_RH').length})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-4 py-2 rounded ${
                filterStatus === 'APPROVED'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Approuvés ({leaves.filter((l) => l.status === 'APPROVED').length})
            </button>
          </div>
        </div>

        {/* Leaves List */}
        <div className="space-y-4">
          {filteredLeaves.map((leave) => (
            <div key={leave.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {leave.employeeName}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                        leave.status,
                      )}`}
                    >
                      {getStatusLabel(leave.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Matricule:</span> {leave.employeeMatricule}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {leave.type}
                    </div>
                    <div>
                      <span className="font-medium">Du:</span> {formatDate(leave.startDate)}
                    </div>
                    <div>
                      <span className="font-medium">Au:</span> {formatDate(leave.endDate)}
                    </div>
                    <div>
                      <span className="font-medium">Jours:</span> {leave.days}
                    </div>
                    <div>
                      <span className="font-medium">Demandé le:</span>{' '}
                      {formatDate(leave.requestedAt)}
                    </div>
                  </div>

                  {leave.comment && (
                    <div className="mt-3 text-sm text-gray-700">
                      <span className="font-medium">Commentaire:</span> {leave.comment}
                    </div>
                  )}

                  {leave.rejectionReason && (
                    <div className="mt-3 text-sm text-red-700 bg-red-50 p-2 rounded">
                      <span className="font-medium">Raison du rejet:</span>{' '}
                      {leave.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-4 flex flex-col gap-2">
                  {leave.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApproveByRH(leave.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Approuver (RH)
                      </button>
                      <button
                        onClick={() => openRejectModal(leave, false)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Rejeter (RH)
                      </button>
                    </>
                  )}

                  {leave.status === 'APPROVED_BY_RH' && user?.role === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => handleApproveByAdmin(leave.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Approuver (Admin)
                      </button>
                      <button
                        onClick={() => openRejectModal(leave, true)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Rejeter (Admin)
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredLeaves.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucune demande de congé trouvée
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && rejectingLeave && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Rejeter la demande de congé
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du rejet (optionnel)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Expliquez la raison du rejet..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if ((rejectingLeave as any).status === 'ADMIN_REJECT') {
                      handleRejectByAdmin();
                    } else {
                      handleRejectByRH();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Confirmer le rejet
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingLeave(null);
                    setRejectionReason('');
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
