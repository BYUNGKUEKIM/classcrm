import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/FirebaseAuthContext';

export default function MobileHeader({ profile, setSidebarOpen }) {
  const { signOut } = useAuth();
  
  return (
    <header className="lg:hidden bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
      <button onClick={() => setSidebarOpen(true)}>
        <Menu className="w-6 h-6" />
      </button>
      <div className="text-xl font-bold">
        {profile?.studio_name || 'Studio CRM'}
      </div>
      <button onClick={signOut}>
        <LogOut className="w-6 h-6" />
      </button>
    </header>
  );
}