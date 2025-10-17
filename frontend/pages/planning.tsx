import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/lib/keycloak';
import ShiftCalendar from '@/components/ShiftCalendar';
import { api } from '@/lib/api';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function PlanningPage() {
  const { keycloak, initialized } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (initialized && keycloak?.authenticated) {
      loadEmployees();
    } else if (initialized) {
      keycloak?.login();
    }
  }, [initialized, keycloak]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
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
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isExporting ? 'Export en cours...' : 'Exporter en PDF'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Employee Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Employés ({employees.length})
                </h2>
                <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Glissez-déposez sur le calendrier"
                    >
                      <p className="font-medium text-gray-900 text-sm">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{employee.email}</p>
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
              <ShiftCalendar employees={employees} onEmployeesChange={loadEmployees} />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}