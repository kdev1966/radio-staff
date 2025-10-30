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

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface PlanningStatsProps {
  shifts: Shift[];
  employees: Employee[];
}

export default function PlanningStats({ shifts, employees }: PlanningStatsProps) {
  // Calculate statistics
  const totalShifts = shifts.length;
  const totalAssignments = shifts.reduce((sum, s) => sum + s.assignments.length, 0);
  const totalNeeded = shifts.reduce((sum, s) => sum + s.needed, 0);
  const fillRate = totalNeeded > 0 ? Math.round((totalAssignments / totalNeeded) * 100) : 0;

  const emptyShifts = shifts.filter(s => s.assignments.length === 0).length;
  const fullShifts = shifts.filter(s => s.assignments.length >= s.needed).length;
  const partialShifts = totalShifts - emptyShifts - fullShifts;

  // Employee assignments count
  const employeeAssignments = new Map<string, number>();
  shifts.forEach(shift => {
    shift.assignments.forEach(assignment => {
      const count = employeeAssignments.get(assignment.employee.id) || 0;
      employeeAssignments.set(assignment.employee.id, count + 1);
    });
  });

  const unassignedEmployees = employees.filter(
    emp => !employeeAssignments.has(emp.id)
  ).length;

  // Period statistics
  const periodStats = {
    MORNING: { total: 0, assigned: 0, needed: 0 },
    AFTERNOON: { total: 0, assigned: 0, needed: 0 },
    NIGHT: { total: 0, assigned: 0, needed: 0 },
  };

  shifts.forEach(shift => {
    periodStats[shift.period].total++;
    periodStats[shift.period].assigned += shift.assignments.length;
    periodStats[shift.period].needed += shift.needed;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Statistiques du planning</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total shifts</p>
              <p className="text-2xl font-bold text-blue-900">{totalShifts}</p>
            </div>
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          fillRate >= 80 ? 'bg-green-50 border-green-200' :
          fillRate >= 50 ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                fillRate >= 80 ? 'text-green-600' :
                fillRate >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                Taux de remplissage
              </p>
              <p className={`text-2xl font-bold ${
                fillRate >= 80 ? 'text-green-900' :
                fillRate >= 50 ? 'text-yellow-900' :
                'text-red-900'
              }`}>
                {fillRate}%
              </p>
            </div>
            <svg className={`h-8 w-8 ${
              fillRate >= 80 ? 'text-green-600' :
              fillRate >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-xs text-gray-600 mt-1">{totalAssignments}/{totalNeeded} postes</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Employés actifs</p>
              <p className="text-2xl font-bold text-purple-900">{employeeAssignments.size}</p>
            </div>
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-xs text-gray-600 mt-1">{unassignedEmployees} non assignés</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Shifts incomplets</p>
              <p className="text-2xl font-bold text-gray-900">{partialShifts + emptyShifts}</p>
            </div>
            <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-xs text-gray-600 mt-1">{emptyShifts} vides, {partialShifts} partiels</p>
        </div>
      </div>

      {/* Period Breakdown */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par période</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Morning */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-900">Matin</h4>
              <span className="text-sm text-green-700">{periodStats.MORNING.total} shifts</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Assignés:</span>
                <span className="font-semibold text-green-900">
                  {periodStats.MORNING.assigned}/{periodStats.MORNING.needed}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${periodStats.MORNING.needed > 0
                      ? (periodStats.MORNING.assigned / periodStats.MORNING.needed) * 100
                      : 0}%`
                  }}
                ></div>
              </div>
              <p className="text-xs text-green-600 text-right">
                {periodStats.MORNING.needed > 0
                  ? Math.round((periodStats.MORNING.assigned / periodStats.MORNING.needed) * 100)
                  : 0}% rempli
              </p>
            </div>
          </div>

          {/* Afternoon */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-yellow-900">Après-midi</h4>
              <span className="text-sm text-yellow-700">{periodStats.AFTERNOON.total} shifts</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-yellow-700">Assignés:</span>
                <span className="font-semibold text-yellow-900">
                  {periodStats.AFTERNOON.assigned}/{periodStats.AFTERNOON.needed}
                </span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${periodStats.AFTERNOON.needed > 0
                      ? (periodStats.AFTERNOON.assigned / periodStats.AFTERNOON.needed) * 100
                      : 0}%`
                  }}
                ></div>
              </div>
              <p className="text-xs text-yellow-600 text-right">
                {periodStats.AFTERNOON.needed > 0
                  ? Math.round((periodStats.AFTERNOON.assigned / periodStats.AFTERNOON.needed) * 100)
                  : 0}% rempli
              </p>
            </div>
          </div>

          {/* Night */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-900">Nuit</h4>
              <span className="text-sm text-blue-700">{periodStats.NIGHT.total} shifts</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Assignés:</span>
                <span className="font-semibold text-blue-900">
                  {periodStats.NIGHT.assigned}/{periodStats.NIGHT.needed}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${periodStats.NIGHT.needed > 0
                      ? (periodStats.NIGHT.assigned / periodStats.NIGHT.needed) * 100
                      : 0}%`
                  }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 text-right">
                {periodStats.NIGHT.needed > 0
                  ? Math.round((periodStats.NIGHT.assigned / periodStats.NIGHT.needed) * 100)
                  : 0}% rempli
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
