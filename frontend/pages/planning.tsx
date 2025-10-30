import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/lib/keycloak';
import ShiftCalendar from '@/components/ShiftCalendar';
import BulkShiftCreator from '@/components/BulkShiftCreator';
import PlanningStats from '@/components/PlanningStats';
import { api } from '@/lib/api';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  role: string;
}

interface Shift {
  id: string;
  period: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  needed: number;
  assignments: Array<{
    id: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

export default function PlanningPage() {
  const { keycloak, initialized } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showBulkCreator, setShowBulkCreator] = useState(false);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    if (initialized && keycloak?.authenticated) {
      loadEmployees();
      loadShifts();
    } else if (initialized) {
      keycloak?.login();
    }
  }, [initialized, keycloak]);

  const loadEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shifts');
      setShifts(response.data);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    await loadEmployees();
    await loadShifts();
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      // Get current date range from calendar
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const response = await api.get('/shifts/export', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          format: 'pdf',
        },
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `planning-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      alert('Planning exporté avec succès');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'export du planning');
    } finally {
      setIsExporting(false);
    }
  };

  if (!initialized || loading) {
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
        <title>Planning - Radio Staff Manager</title>
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
                <h1 className="text-2xl font-bold text-gray-900">Planning des équipes</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {showStats ? 'Masquer' : 'Afficher'} stats
                </button>
                <button
                  onClick={() => setShowBulkCreator(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Créer shifts
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isExporting ? 'Export...' : 'PDF'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistics */}
          {showStats && (
            <div className="mb-8">
              <PlanningStats shifts={shifts} employees={employees} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Employee Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Employés ({employees.length})
                  </h2>
                  <button
                    onClick={handleRefreshAll}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Rafraîchir"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">
                    💡 Glissez-déposez un employé sur le calendrier pour l'assigner
                  </p>
                </div>
                <div id="external-events" className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      data-employee-id={employee.id}
                      className="draggable-employee p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-move border border-gray-200 hover:border-blue-300"
                      title="Glissez-déposez sur le calendrier"
                    >
                      <p className="font-medium text-gray-900 text-sm">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{employee.matricule}</p>
                      <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {employee.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="lg:col-span-3">
              <ShiftCalendar employees={employees} onEmployeesChange={handleRefreshAll} />
            </div>
          </div>
        </main>

        {/* Bulk Shift Creator Modal */}
        {showBulkCreator && (
          <BulkShiftCreator
            onClose={() => setShowBulkCreator(false)}
            onRefresh={handleRefreshAll}
          />
        )}
      </div>
    </>
  );
}