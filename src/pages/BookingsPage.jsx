import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, List, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingDialog from '@/components/bookings/BookingDialog';
import BookingCalendar from '@/components/bookings/BookingCalendar';
import BookingMonthlyCalendar from '@/components/bookings/BookingMonthlyCalendar.jsx';
import BookingList from '@/components/bookings/BookingList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';

export default function BookingsPage({ onEditCustomer }) {
  const [bookings, setBookings] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await db.collection
        .from('bookings')
        .select(`
          id,
          user_id,
          customer_id,
          customer_name,
          filming_type_id,
          booking_date,
          booking_time,
          memo,
          sms_reminder,
          created_at,
          customers (id, name, phone, email),
          filming_types (id, name, price)
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });
      if (error) throw error;
      
      const formattedData = data.map(b => {
        // 출고 예정일 판단: booking_time이 "00:00"으로 시작하고 memo에 "출고예정일"이 포함된 경우
        const bookingTime = String(b.booking_time || '').trim();
        const memo = String(b.memo || '').trim();
        // booking_time이 "00:00"으로 시작하거나 정확히 "00:00:00"이고, memo에 "출고예정일"이 포함된 경우
        const isDelivery = (bookingTime.startsWith('00:00') || bookingTime === '00:00:00') && memo.includes('출고예정일');
        
        return {
          ...b,
          customerName: b.customers?.name || b.customer_name,
          phone: b.customers?.phone,
          email: b.customers?.email,
          type: b.filming_types?.name,
          date: b.booking_date,
          time: isDelivery ? null : (b.booking_time ? b.booking_time.substring(0, 5) : null),
          totalCost: b.filming_types?.price || 0,
          notes: b.memo,
          customerId: b.customer_id,
          filmingTypeId: b.filming_type_id,
          deliveryDate: isDelivery ? b.booking_date : null,
          isDelivery: isDelivery,
        };
      });
      
      setBookings(formattedData);

    } catch (error) {
      toast({ variant: 'destructive', title: '예약 로딩 실패', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    fetchBookings();
    
    const channel = supabase
      .channel('public:bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        fetchBookings();
        window.dispatchEvent(new Event('dataUpdated'));
      })
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [fetchBookings]);

  const handleSaveBooking = async (bookingData) => {
    if (bookingData.smsReminder) {
      toast({
        title: "🚧 SMS 기능 준비 중",
        description: "SMS 발송 기능은 곧 업데이트될 예정입니다! 🚀",
      });
    }

    const dataToSave = {
      user_id: user.id,
      customer_id: bookingData.customerId,
      customer_name: bookingData.customerName,
      filming_type_id: bookingData.filmingTypeId,
      booking_date: bookingData.date,
      booking_time: bookingData.time,
      memo: bookingData.notes,
      sms_reminder: bookingData.smsReminder,
    };

    try {
      let error;
      if (editingBooking) {
        ({ error } = await db.collection('bookings').update(dataToSave).eq('id', editingBooking.id));
      } else {
        ({ error } = await db.collection('bookings').insert([dataToSave]));
      }
      if (error) throw error;

      toast({ title: '저장 완료', description: `예약이 성공적으로 ${editingBooking ? '수정' : '저장'}되었습니다.` });
      await fetchBookings();
      closeDialog();
    } catch (err) {
      toast({ variant: 'destructive', title: '저장 실패', description: err.message });
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('정말로 이 예약을 삭제하시겠습니까?')) return;
    try {
      const { error } = await db.collection('bookings').delete().eq('id', id);
      if (error) throw error;
      toast({ title: '삭제 완료' });
      await fetchBookings();
    } catch (err) {
      toast({ variant: 'destructive', title: '삭제 실패', description: err.message });
    }
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setInitialData(null);
    setIsDialogOpen(true);
  };

  const handleNewBooking = (date, time) => {
    setEditingBooking(null);
    setInitialData({ date, time });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBooking(null);
    setInitialData(null);
  }

  return (
    <>
      <Helmet>
        <title>예약 관리 - 포토스튜디오 CRM</title>
        <meta name="description" content="촬영 예약 일정 관리" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">예약 관리</h1>
            <p className="text-gray-600 mt-2">주간 타임테이블 또는 목록으로 일정을 관리하세요</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('https://new.smartplace.naver.com/bizes/place/5487164?bookingBusinessId=415664', '_blank', 'noopener,noreferrer')}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              네이버 예약창 열기
            </Button>
            <Button
              onClick={() => handleNewBooking(new Date().toISOString().split('T')[0], '')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              새 예약 추가
            </Button>
          </div>
        </div>

        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="weekly">주간 시간표</TabsTrigger>
            <TabsTrigger value="monthly">
              <Calendar className="w-4 h-4 mr-2" />
              월간 스케줄
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" />
              목록
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly" className="mt-6">
            <BookingCalendar 
              bookings={bookings}
              onEditBooking={handleEditBooking}
              onNewBooking={handleNewBooking}
              onDeleteBooking={handleDeleteBooking}
              onEditCustomer={onEditCustomer}
            />
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-6">
            {loading ? (
              <div className="text-center py-20">로딩 중...</div>
            ) : (
              <BookingMonthlyCalendar 
                bookings={bookings}
                onEditBooking={handleEditBooking}
                onNewBooking={handleNewBooking}
                onDeleteBooking={handleDeleteBooking}
                onEditCustomer={onEditCustomer}
              />
            )}
          </TabsContent>
          
          <TabsContent value="list" className="mt-6">
             {loading ? (
                <div className="text-center py-20">로딩 중...</div>
             ) : (
                <BookingList
                  bookings={bookings}
                  onEdit={handleEditBooking}
                  onDelete={handleDeleteBooking}
                />
             )}
          </TabsContent>
        </Tabs>
      </div>

      <BookingDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onSave={handleSaveBooking}
        booking={editingBooking}
        initialData={initialData}
      />
    </>
  );
}