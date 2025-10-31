import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function Navigation() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const getUserName = () => {
    if (user) {
      // SuperAdmin has fullName, Employee has firstName + lastName
      if (user.isSuperAdmin) {
        return user.fullName || 'Super Admin';
      }
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Utilisateur';
  };

  // Different navigation items based on user role
  const getNavItems = () => {
    if (user?.isSuperAdmin) {
      return [
        { href: '/', label: 'Dashboard', icon: '📊' },
        { href: '/services', label: 'Services', icon: '🏥' },
        { href: '/super-admins', label: 'Super Admins', icon: '👨‍💼' },
        { href: '/analytics', label: 'Analytiques', icon: '📈' },
      ];
    }

    // Service Admin/RH navigation
    if (user?.role === 'ADMIN' || user?.role === 'RH') {
      return [
        { href: '/service-admin/dashboard', label: 'Dashboard Service', icon: '📊' },
        { href: '/service-admin/employees', label: 'Employés', icon: '👥' },
        { href: '/service-admin/leaves', label: 'Congés', icon: '🏖️' },
        { href: '/service-admin/shifts', label: 'Planning', icon: '📅' },
      ];
    }

    // Regular employee navigation
    return [
      { href: '/', label: 'Tableau de bord', icon: '📊' },
      { href: '/planning', label: 'Planning', icon: '📅' },
      { href: '/employes', label: 'Employés', icon: '👥' },
      { href: '/conges', label: 'Congés', icon: '🏖️' },
    ];
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-2xl z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Radio Staff</h1>
          <p className="text-blue-300 text-sm">Gestion du personnel</p>
        </div>

        <nav className="mt-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center px-6 py-4 transition-all duration-200
                ${
                  isActive(item.href)
                    ? 'bg-blue-700 border-l-4 border-white font-semibold'
                    : 'hover:bg-blue-700/50 border-l-4 border-transparent'
                }
              `}
              onClick={() => setIsOpen(false)}
            >
              <span className="text-2xl mr-3">{item.icon}</span>
              <span className="text-lg">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-blue-700">
          <div className="mb-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-lg">
                👤
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-white truncate">{getUserName()}</p>
                <p className="text-xs text-blue-300">Connecté</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center"
            >
              <span className="mr-2">🚪</span>
              Déconnexion
            </button>
          </div>
          <div className="text-sm text-blue-300 pt-3 border-t border-blue-700">
            <p className="font-semibold">Service Radiologie</p>
            <p className="text-xs mt-1">Hôpital Central</p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
