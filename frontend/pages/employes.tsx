import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Employee {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  role: 'TECHNICIEN' | 'ADMINISTRATIF';
  address: string;
}

export default function EmployesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    matricule: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    phone: '',
    role: 'TECHNICIEN',
    address: '',
  });
  const [error, setError] = useState('');

  // Format phone number for display (e.g., 98765432 => 98 765 432)
  const formatPhoneNumber = (phone: string): string => {
    if (phone.length === 8) {
      return `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
    }
    return phone;
  };

  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [user]);

  const loadEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
      setError('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await api.patch(`/employees/${editingId}`, formData);
      } else {
        await api.post('/employees', formData);
      }
      await loadEmployees();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      matricule: employee.matricule,
      firstName: employee.firstName,
      lastName: employee.lastName,
      birthDate: employee.birthDate.split('T')[0],
      phone: employee.phone,
      role: employee.role,
      address: employee.address,
    });
    setEditingId(employee.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;

    try {
      await api.delete(`/employees/${id}`);
      await loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      matricule: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      phone: '',
      role: 'TECHNICIEN',
      address: '',
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Employés</h1>
          <p className="text-gray-600 mt-2">
            {employees.length} employé{employees.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {showForm ? '✕ Annuler' : '+ Nouvel employé'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingId ? 'Modifier l\'employé' : 'Nouvel employé'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matricule (8 à 10 chiffres) *
              </label>
              <input
                type="text"
                required
                pattern="\d{8,10}"
                value={formData.matricule}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, matricule: value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: 123456789"
                title="Matricule unique de l'employé (8 à 10 chiffres)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de naissance *
              </label>
              <input
                type="date"
                required
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone Tunisie (8 chiffres) *
              </label>
              <input
                type="tel"
                required
                pattern="\d{8}"
                maxLength={8}
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, phone: value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: 98765432"
                title="Format: 8 chiffres (ex: 98765432 ou 22345678)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle *
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as 'TECHNICIEN' | 'ADMINISTRATIF' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="TECHNICIEN">Technicien</option>
                <option value="ADMINISTRATIF">Administratif</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse *
              </label>
              <textarea
                required
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: 15 Avenue Habib Bourguiba, Tunis"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                {editingId ? 'Mettre à jour' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matricule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom complet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de naissance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucun employé trouvé. Cliquez sur "Nouvel employé" pour commencer.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {employee.matricule}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(employee.birthDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {formatPhoneNumber(employee.phone)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.role === 'TECHNICIEN'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {employee.role === 'TECHNICIEN' ? 'Technicien' : 'Administratif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {employee.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
