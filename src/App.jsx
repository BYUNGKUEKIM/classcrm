import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import CustomersPage from '@/pages/CustomersPage';
import BookingsPage from '@/pages/BookingsPage';
import FinancePage from '@/pages/FinancePage';
import ProductsPage from '@/pages/ProductsPage';
import FilmingTypesPage from '@/pages/FilmingTypesPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminPage from '@/pages/AdminPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import AIGalleryPage from '@/pages/AIGalleryPage';
import Layout from '@/components/Layout';

function PrivateRoute({ children, adminOnly = false }) {
  const { session, loading, profile } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-50"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.status === 'suspended') {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4 bg-gray-50">
          <h1 className="text-2xl font-bold mb-4 text-red-600">계정이 정지되었습니다.</h1>
          <p className="text-gray-700">관리자에게 문의하여 계정을 활성화해주세요.</p>
      </div>
    );
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-50"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  return !session ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  const openCustomerDialog = (customer = null) => {
    setEditingCustomer(customer);
    setIsCustomerDialogOpen(true);
  };

  const closeCustomerDialog = () => {
    setEditingCustomer(null);
    setIsCustomerDialogOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>포토스튜디오 고객관리 시스템</title>
        <meta name="description" content="사진관 전용 고객관리 및 예약 시스템 - 고객 정보, 촬영 일정, 매출 관리를 한 곳에서" />
      </Helmet>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        
        <Route 
          path="/*"
          element={
            <PrivateRoute>
              <Layout 
                editingCustomer={editingCustomer}
                isCustomerDialogOpen={isCustomerDialogOpen}
                onOpenCustomerDialog={openCustomerDialog}
                onCloseCustomerDialog={closeCustomerDialog}
              >
                <Routes>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route 
                    path="customers" 
                    element={<CustomersPage onEditCustomer={openCustomerDialog} />} 
                  />
                  <Route path="bookings" element={<BookingsPage onEditCustomer={openCustomerDialog} />} />
                  <Route 
                    path="finance" 
                    element={<FinancePage onEditCustomer={openCustomerDialog} />} 
                  />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="filming-types" element={<FilmingTypesPage />} />
                  <Route path="gallery" element={<AIGalleryPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="subscription" element={<SubscriptionPage />} />
                  <Route 
                    path="admin" 
                    element={
                      <PrivateRoute adminOnly={true}>
                        <AdminPage />
                      </PrivateRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } 
        />
      </Routes>
    </>
  );
}

export default App;