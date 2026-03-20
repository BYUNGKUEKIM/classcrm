import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, BarChart2, Package, Settings, Shield, LogOut, X, Plus, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/FirebaseAuthContext';

const menuItems = [
  { href: '/dashboard', label: '대시보드', icon: Home },
  { href: '/customers', label: '고객 관리', icon: Users },
  { href: '/bookings', label: '예약 관리', icon: Calendar },
  { href: '/finance', label: '매출 관리', icon: BarChart2 },
  { href: '/filming-types', label: '촬영 유형 관리', icon: Camera },
  { href: '/products', label: '상품 관리', icon: Package },
];

const bottomMenuItems = [
  { href: '/settings', label: '설정', icon: Settings },
  { href: '/subscription', label: '구독', icon: Shield },
];


export default function Sidebar({ sidebarOpen, setSidebarOpen, onAddNewCustomer }) {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const renderNavLinks = (items) => items.map(item => (
    <li key={item.label}>
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
            isActive
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`
        }
        onClick={() => setSidebarOpen(false)}
      >
        <item.icon className="w-6 h-6 mr-4" />
        <span className="font-medium">{item.label}</span>
      </NavLink>
    </li>
  ));

  return (
    <>
      {/* Mobile-tablet overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 w-64 bg-gray-800 text-white p-4 transform transition-transform duration-300 z-30 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Studio CRM</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <button 
            onClick={() => {
                onAddNewCustomer();
                setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center p-3 mb-4 rounded-lg bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold hover:from-green-500 hover:to-blue-600 transition-all duration-300 shadow-lg"
        >
            <Plus className="w-5 h-5 mr-2" />
            신규고객추가
        </button>

        <nav className="flex-grow">
          <ul>{renderNavLinks(menuItems)}</ul>
          {profile?.role === 'admin' && (
             <li>
                <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                    `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                        isActive
                        ? 'bg-gradient-to-r from-red-500 to-yellow-500 text-white shadow-md'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`
                    }
                    onClick={() => setSidebarOpen(false)}
                >
                    <Shield className="w-6 h-6 mr-4" />
                    <span className="font-medium">관리자</span>
                </NavLink>
            </li>
          )}
        </nav>

        <div>
          <ul>
            {renderNavLinks(bottomMenuItems)}
            <li>
              <button
                onClick={signOut}
                className="flex items-center w-full p-3 my-1 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors duration-200"
              >
                <LogOut className="w-6 h-6 mr-4" />
                <span className="font-medium">로그아웃</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}