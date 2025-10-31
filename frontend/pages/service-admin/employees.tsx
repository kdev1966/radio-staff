import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  matricule: string;
  role: 'ADMIN' | 'RH' | 'EMPLOYE';
  employeeType?: 'TECHNICIEN' | 'ADMINISTRATIF';
  isActive: boolean;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  matricule: string;
  role: 'ADMIN' | 'RH' | 'EMPLOYE';
  employeeType?: 'TECHNICIEN' | 'ADMINISTRATIF';
}

export default function ServiceAdminEmployees() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    matricule: '',
    role: 'EMPLOYE',
  });

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

    loadEmployees();
  }, [user, authLoading, router]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/service-admin/employees');
      setEmployees(response.data);
    } catch (err: any) {
      console.error('Error loading employees:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');

      if (editingEmployee) {
        // Update existing employee
        const updateData: any = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          matricule: formData.matricule,
          role: formData.role,
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        // Include employeeType for all roles (will be stored even for ADMIN/RH)
        if (formData.employeeType) {
          updateData.employeeType = formData.employeeType;
        }

        await api.patch(`/service-admin/employees/${editingEmployee.id}`, updateData);
      } else {
        // Create new employee
        await api.post('/service-admin/employees', formData);
      }

      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      loadEmployees();
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleUpdatePermissions = async (employeeId: string, newRole: string) => {
    if (!confirm('Êtes-vous sûr de vouloir modifier les permissions de cet employé ?')) {
      return;
    }

    try {
      setError('');
      await api.patch(`/service-admin/employees/${employeeId}/permissions`, {
        role: newRole,
      });
      loadEmployees();
    } catch (err: any) {
      console.error('Error updating permissions:', err);
      setError(err.response?.data?.message || 'Erreur lors de la modification des permissions');
    }
  };

  const handleArchive = async (employeeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver cet employé ?')) {
      return;
    }

    try {
      setError('');
      await api.patch(`/service-admin/employees/${employeeId}/archive`);
      loadEmployees();
    } catch (err: any) {
      console.error('Error archiving employee:', err);
      setError(err.response?.data?.message || "Erreur lors de l'archivage");
    }
  };

  const handleRestore = async (employeeId: string) => {
    try {
      setError('');
      await api.patch(`/service-admin/employees/${employeeId}/restore`);
      loadEmployees();
    } catch (err: any) {
      console.error('Error restoring employee:', err);
      setError(err.response?.data?.message || 'Erreur lors de la restauration');
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir supprimer définitivement cet employé ? Cette action est irréversible.',
      )
    ) {
      return;
    }

    try {
      setError('');
      await api.delete(`/service-admin/employees/${employeeId}`);
      loadEmployees();
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingEmployee(null);
    setShowModal(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email,
      password: '',
      firstName: employee.firstName,
      lastName: employee.lastName,
      matricule: employee.matricule,
      role: employee.role,
      employeeType: employee.employeeType,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      matricule: '',
      role: 'EMPLOYE',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'RH':
        return 'bg-blue-100 text-blue-800';
      case 'EMPLOYE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Employés</h1>
              <p className="text-gray-600 mt-1">
                {employees.length} employé(s) au total
              </p>
            </div>
            <div className="flex gap-4">
              {user?.role === 'ADMIN' && (
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Nouvel Employé
                </button>
              )}
              <button
                onClick={() => router.push('/service-admin/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Retour
              </button>
            </div>
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

        {/* Employees Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matricule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.fullName}
                      </div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.matricule}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                        employee.role,
                      )}`}
                    >
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {employee.employeeType || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {employee.isActive ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Archivé
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Modifier
                      </button>

                      {user?.role === 'ADMIN' && (
                        <>
                          {employee.isActive ? (
                            <button
                              onClick={() => handleArchive(employee.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Archiver
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(employee.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Restaurer
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {editingEmployee ? 'Modifier Employé' : 'Nouvel Employé'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Matricule
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.matricule}
                    onChange={(e) =>
                      setFormData({ ...formData, matricule: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mot de passe {editingEmployee && '(laisser vide pour ne pas modifier)'}
                  </label>
                  <input
                    type="password"
                    required={!editingEmployee}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                {user?.role === 'ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Rôle
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as any,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                      <option value="EMPLOYE">Employé</option>
                      <option value="RH">RH</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                )}

                {formData.role === 'EMPLOYE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type d'employé
                    </label>
                    <select
                      value={formData.employeeType || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employeeType: e.target.value as any,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                      <option value="">Sélectionner un type</option>
                      <option value="TECHNICIEN">Technicien</option>
                      <option value="ADMINISTRATIF">Administratif</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {editingEmployee ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingEmployee(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
