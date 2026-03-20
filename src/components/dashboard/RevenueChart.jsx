import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';

export default function RevenueChart() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchRevenueData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date, amount')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .gte('transaction_date', sixMonthsAgo.toISOString().split('T')[0]);

      if (error) throw error;
      
      const revenueByMonth = Array(6).fill(0).map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          return { month: `${d.getMonth() + 1}월`, revenue: 0 };
      }).reverse();

      data.forEach(t => {
        const monthIndex = new Date(t.transaction_date).getMonth();
        const monthLabel = `${monthIndex + 1}월`;
        const target = revenueByMonth.find(m => m.month === monthLabel);
        if (target) {
          target.revenue += t.amount;
        }
      });

      setMonthlyData(revenueByMonth);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRevenueData();
    
    const channel = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchRevenueData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRevenueData]);
  
  const handleClick = () => {
    navigate('/finance');
  };

  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">월별 매출</h2>
        <div className="flex items-center text-green-600 text-sm font-medium">
          <TrendingUp className="w-4 h-4 mr-1" />
          +15%
        </div>
      </div>
      
      <div className="space-y-4">
        {loading ? (
           <p className="text-gray-500 text-center py-8">로딩 중...</p>
        ) : monthlyData.map((data, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{data.month}</span>
              <span className="font-medium text-gray-900">₩{data.revenue.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}