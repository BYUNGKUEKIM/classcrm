import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Users, Calendar, DollarSign, Package } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import RecentBookings from '@/components/dashboard/RecentBookings';
import RevenueChart from '@/components/dashboard/RevenueChart';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { supabase } from '@/lib/firebase';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    todayBookings: 0,
    monthlyRevenue: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const firstDayOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

      const [
        { count: customerCount },
        { count: productCount },
        { count: todayBookingsCount },
        { data: monthlyRevenueData, error: revenueError }
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('booking_date', today),
        supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('transaction_date', firstDayOfMonth)
      ]);
      
      if (revenueError) throw revenueError;

      const monthlyRevenue = monthlyRevenueData.reduce((sum, t) => sum + Number(t.amount), 0);

      setStats({
        totalCustomers: customerCount || 0,
        totalProducts: productCount || 0,
        todayBookings: todayBookingsCount || 0,
        monthlyRevenue: monthlyRevenue || 0
      });

    } catch(error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStats();
    
    const handleDataUpdate = () => {
      loadStats();
    };

    window.addEventListener('dataUpdated', handleDataUpdate);

    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, [loadStats]);

  return (
    <>
      <Helmet>
        <title>대시보드 - 포토스튜디오 CRM</title>
        <meta name="description" content="포토스튜디오 고객관리 시스템 대시보드" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 mt-2">오늘의 현황을 한눈에 확인하세요</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="총 고객" value={loading ? '...' : stats.totalCustomers} icon={Users} color="blue" linkTo="/customers" />
          <StatCard title="오늘 예약" value={loading ? '...' : stats.todayBookings} icon={Calendar} color="green" linkTo="/bookings" />
          <StatCard title="이번 달 매출" value={loading ? '...' : `₩${stats.monthlyRevenue.toLocaleString()}`} icon={DollarSign} color="purple" linkTo="/finance" />
          <StatCard title="총 상품" value={loading ? '...' : stats.totalProducts} icon={Package} color="pink" linkTo="/products" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentBookings />
          <RevenueChart />
        </div>
      </div>
    </>
  );
}