import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';

export default function RecentBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchRecentBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_name,
          booking_date,
          booking_time,
          memo,
          filming_types ( name )
        `)
        .eq('user_id', user.id)
        .neq('booking_time', '00:00:00') // 출고 예정일 제외
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false })
        .limit(5);

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching recent bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentBookings();

    const channel = supabase
      .channel('public:bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchRecentBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecentBookings]);
  
  const handleClick = () => {
    navigate('/bookings');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <h2 className="text-xl font-bold text-gray-900 mb-4">최근 예약</h2>
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500 text-center py-8">로딩 중...</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">예약이 없습니다</p>
        ) : (
          bookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{booking.customer_name}</p>
                  <p className="text-sm text-gray-600">{booking.filming_types?.name || '미지정'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{format(parseISO(booking.booking_date), 'yyyy-MM-dd')}</p>
                {booking.booking_time && booking.booking_time !== '00:00:00' && (
                  <div className="flex items-center text-xs text-gray-600">
                    <Clock className="w-3 h-3 mr-1" />
                    {booking.booking_time.substring(0, 5)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}