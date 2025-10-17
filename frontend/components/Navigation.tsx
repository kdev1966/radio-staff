import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Navigation() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Tableau de bord', icon: '📊' },
    { href: '/planning', label: 'Planning', icon: '📅' },
    { href: '/employes', label: 'Employés', icon: '👥' },
    { href: '/conges', label: 'Congés', icon: '🏖️' },
  ];

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
          <div className="text-sm text-blue-300">
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
