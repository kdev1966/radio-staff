import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function NewServicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    hospitalName: '',
    address: '',
    subscriptionTier: 'TRIAL',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/super-admin/services', formData);
      router.push(`/services/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du service');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Accès non autorisé</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/services" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Retour aux services
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Nouveau Service de Radiologie</h1>
        <p className="text-gray-600 mt-2">Créer un nouveau service sur la plateforme</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        <div className="space-y-6">
          {/* Service Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom du Service <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Service de Radiologie"
            />
          </div>

          {/* Hospital Name */}
          <div>
            <label htmlFor="hospitalName" className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'Hôpital <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="hospitalName"
              name="hospitalName"
              value={formData.hospitalName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="CHU de la Région"
            />
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1 Avenue des Hôpitaux, 75000 Paris"
            />
          </div>

          {/* Subscription Tier */}
          <div>
            <label htmlFor="subscriptionTier" className="block text-sm font-medium text-gray-700 mb-2">
              Tier d'Abonnement <span className="text-red-500">*</span>
            </label>
            <select
              id="subscriptionTier"
              name="subscriptionTier"
              value={formData.subscriptionTier}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="TRIAL">Essai (30 jours gratuits)</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              {formData.subscriptionTier === 'TRIAL' && '✓ Période d\'essai de 30 jours avec toutes les fonctionnalités'}
              {formData.subscriptionTier === 'BASIC' && '✓ Fonctionnalités de base pour petits services'}
              {formData.subscriptionTier === 'PRO' && '✓ Fonctionnalités avancées + support prioritaire'}
              {formData.subscriptionTier === 'ENTERPRISE' && '✓ Solution personnalisée + support dédié'}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">À propos de la création</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Le service sera créé avec le statut "TRIAL" par défaut</li>
                  <li>Vous pourrez ajouter des employés après la création</li>
                  <li>Un compte administrateur devra être créé pour le service</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Création en cours...
              </span>
            ) : (
              'Créer le Service'
            )}
          </button>
          <Link
            href="/services"
            className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors text-center"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
