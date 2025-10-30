import { useState } from 'react';
import { api } from '../lib/api';

interface BulkShiftCreatorProps {
  onClose: () => void;
  onRefresh: () => void;
}

export default function BulkShiftCreator({ onClose, onRefresh }: BulkShiftCreatorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periods, setPeriods] = useState({
    MORNING: false,
    AFTERNOON: false,
    NIGHT: false,
  });
  const [needed, setNeeded] = useState({
    MORNING: 2,
    AFTERNOON: 2,
    NIGHT: 2,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Veuillez sélectionner une période');
      return;
    }

    const selectedPeriods = Object.entries(periods)
      .filter(([_, selected]) => selected)
      .map(([period]) => period);

    if (selectedPeriods.length === 0) {
      setError('Veuillez sélectionner au moins une période');
      return;
    }

    try {
      setLoading(true);

      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (days > 90) {
        setError('La période ne peut pas dépasser 90 jours');
        return;
      }

      const shiftsToCreate = [];
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];

        for (const period of selectedPeriods) {
          shiftsToCreate.push({
            shiftDate: dateStr,
            period: period as 'MORNING' | 'AFTERNOON' | 'NIGHT',
            needed: needed[period as keyof typeof needed],
          });
        }
      }

      // Create shifts in batches
      let created = 0;
      for (const shift of shiftsToCreate) {
        try {
          await api.post('/shifts', shift);
          created++;
        } catch (err: any) {
          // Skip if shift already exists
          if (!err.response?.data?.message?.includes('already exists')) {
            console.error('Error creating shift:', err);
          }
        }
      }

      alert(`${created} shift(s) créé(s) avec succès sur ${shiftsToCreate.length} tentative(s)`);
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création des shifts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Créer des shifts en masse</h2>
              <p className="text-sm text-gray-600 mt-1">Générez plusieurs shifts pour une période donnée</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Périodes à créer *
            </label>
            <div className="space-y-3">
              {/* Morning */}
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="morning"
                    checked={periods.MORNING}
                    onChange={(e) => setPeriods({ ...periods, MORNING: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="morning" className="ml-3 text-sm font-medium text-gray-900">
                    Matin (07h-13h)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Employés nécessaires:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={needed.MORNING}
                    onChange={(e) => setNeeded({ ...needed, MORNING: parseInt(e.target.value) })}
                    disabled={!periods.MORNING}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Afternoon */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="afternoon"
                    checked={periods.AFTERNOON}
                    onChange={(e) => setPeriods({ ...periods, AFTERNOON: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="afternoon" className="ml-3 text-sm font-medium text-gray-900">
                    Après-midi (13h-19h)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Employés nécessaires:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={needed.AFTERNOON}
                    onChange={(e) => setNeeded({ ...needed, AFTERNOON: parseInt(e.target.value) })}
                    disabled={!periods.AFTERNOON}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Night */}
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="night"
                    checked={periods.NIGHT}
                    onChange={(e) => setPeriods({ ...periods, NIGHT: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="night" className="ml-3 text-sm font-medium text-gray-900">
                    Nuit (19h-07h)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Employés nécessaires:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={needed.NIGHT}
                    onChange={(e) => setNeeded({ ...needed, NIGHT: parseInt(e.target.value) })}
                    disabled={!periods.NIGHT}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Informations</p>
                <p className="mt-1">Les shifts existants pour les mêmes dates/périodes seront ignorés.</p>
                <p className="mt-1">Limite: 90 jours maximum par opération.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Création en cours...' : 'Créer les shifts'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-medium transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
