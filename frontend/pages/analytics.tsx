import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface OverviewData {
  totalServices: number;
  totalEmployees: number;
  totalShifts: number;
  totalLeaveRequests: number;
  activeServices: number;
  suspendedServices: number;
}

interface SubscriptionTier {
  tier: string;
  count: number;
  percentage: number;
}

interface EmployeeDistribution {
  serviceName: string;
  employeeCount: number;
  tier: string;
}

interface ShiftStats {
  totalShifts: number;
  todayShifts: number;
  upcomingShifts: number;
}

interface TopService {
  id: string;
  name: string;
  hospitalName: string;
  employeeCount: number;
  shiftCount: number;
  status: string;
  tier: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [distribution, setDistribution] = useState<EmployeeDistribution[]>([]);
  const [shiftStats, setShiftStats] = useState<ShiftStats | null>(null);
  const [topServices, setTopServices] = useState<TopService[]>([]);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    try {
      const [overviewRes, tiersRes, distributionRes, shiftsRes, topRes] = await Promise.all([
        api.get('/super-admin/analytics/overview'),
        api.get('/super-admin/analytics/subscription-tiers'),
        api.get('/super-admin/analytics/employee-distribution'),
        api.get('/super-admin/analytics/shift-stats'),
        api.get('/super-admin/analytics/top-services?limit=5'),
      ]);

      setOverview(overviewRes.data);
      setTiers(tiersRes.data);
      setDistribution(distributionRes.data);
      setShiftStats(shiftsRes.data);
      setTopServices(topRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      TRIAL: 'bg-gray-100 text-gray-800',
      BASIC: 'bg-blue-100 text-blue-800',
      PRO: 'bg-purple-100 text-purple-800',
      ENTERPRISE: 'bg-yellow-100 text-yellow-800',
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      TRIAL: 'Essai',
      BASIC: 'Basic',
      PRO: 'Pro',
      ENTERPRISE: 'Enterprise',
    };
    return labels[tier] || tier;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement des analytics...</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Statistiques et insights de la plateforme</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Services</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalServices}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-green-600">✓ {overview.activeServices} actifs</span>
              <span className="text-red-600">● {overview.suspendedServices} suspendus</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Employés</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalEmployees}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Quarts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalShifts}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            {shiftStats && (
              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-blue-600">Aujourd'hui: {shiftStats.todayShifts}</span>
                <span className="text-gray-600">7j: {shiftStats.upcomingShifts}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Demandes Congés</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalLeaveRequests}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Subscription Tiers Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Distribution des Tiers</h2>
          <div className="space-y-4">
            {tiers.map((tier) => (
              <div key={tier.tier}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(tier.tier)}`}>
                    {getTierLabel(tier.tier)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {tier.count} services ({tier.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${tier.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top 5 Services</h2>
          <div className="space-y-4">
            {topServices.map((service, index) => (
              <div key={service.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-600">{service.hospitalName}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>{service.employeeCount} employés</span>
                    <span>{service.shiftCount} quarts</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(service.tier)}`}>
                  {getTierLabel(service.tier)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Distribution by Service */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Distribution des Employés par Service</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employés
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visualisation
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {distribution.map((item, index) => {
                const maxEmployees = Math.max(...distribution.map((d) => d.employeeCount));
                const percentage = maxEmployees > 0 ? (item.employeeCount / maxEmployees) * 100 : 0;

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.serviceName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(item.tier)}`}>
                        {getTierLabel(item.tier)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.employeeCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
