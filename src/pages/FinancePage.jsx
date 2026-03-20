import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function FinancePage({ onEditCustomer }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDateData, setSelectedDateData] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers ( id, name )')
        .eq('user_id', user.id)
        .gte('transaction_date', format(start, 'yyyy-MM-dd'))
        .lte('transaction_date', format(end, 'yyyy-MM-dd'));

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      toast({ variant: "destructive", title: "매출 정보 로딩 실패", description: error.message });
    } finally {
      setLoading(false);
    }
  }, [user, currentDate, toast]);

  useEffect(() => {
    const handleDataUpdate = () => fetchTransactions();
    window.addEventListener('dataUpdated', handleDataUpdate);
    fetchTransactions();
    return () => window.removeEventListener('dataUpdated', handleDataUpdate);
  }, [fetchTransactions]);

  const dailyStats = useMemo(() => {
    const monthDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    const stats = monthDays.map(day => {
      const dayString = format(day, 'yyyy-MM-dd');
      const dayTransactions = transactions.filter(t => t.transaction_date === dayString);
      const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        date: day,
        income,
        expense,
        transactions: dayTransactions,
      };
    });
    return stats;
  }, [transactions, currentDate]);

  const totalIncome = useMemo(() => dailyStats.reduce((sum, day) => sum + day.income, 0), [dailyStats]);
  const totalExpense = useMemo(() => dailyStats.reduce((sum, day) => sum + day.expense, 0), [dailyStats]);

  const calendarCells = useMemo(() => {
    const firstDay = startOfMonth(currentDate);
    const totalDays = dailyStats.length;
    const leadingEmptyCount = getDay(firstDay);
    const totalCells = leadingEmptyCount + totalDays;
    const trailingEmptyCount = (7 - (totalCells % 7)) % 7;

    const leadingPlaceholders = Array.from({ length: leadingEmptyCount }, (_, index) => ({
      key: `leading-${index}`,
      isPlaceholder: true,
    }));

    const trailingPlaceholders = Array.from(
      { length: trailingEmptyCount < 0 ? 0 : trailingEmptyCount },
      (_, index) => ({
        key: `trailing-${index}`,
        isPlaceholder: true,
      })
    );

    const dayCells = dailyStats.map(day => ({
      key: format(day.date, 'yyyy-MM-dd'),
      ...day,
      isPlaceholder: false,
    }));

    return [...leadingPlaceholders, ...dayCells, ...trailingPlaceholders];
  }, [dailyStats, currentDate]);

  const openDetailModal = (dayData) => {
    if (dayData.income > 0) {
      setSelectedDateData(dayData);
      setIsDetailModalOpen(true);
    }
  };

  const handleCustomerClick = async (customerId) => {
    if (!onEditCustomer) {
      toast({ variant: "destructive", title: "오류", description: "고객 수정 기능이 연결되지 않았습니다." });
      return;
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      toast({ variant: "destructive", title: "고객 정보 조회 실패", description: error.message });
    } else if (customer) {
      onEditCustomer(customer);
      setIsDetailModalOpen(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>매출 관리 - 포토스튜디오 CRM</title>
        <meta name="description" content="월별 수입, 지출 내역 및 일별 통계 확인" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft /></Button>
            <h1 className="text-3xl font-bold text-gray-900 whitespace-nowrap">{format(currentDate, 'yyyy년 M월')}</h1>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight /></Button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center w-full sm:w-auto">
            <div className="p-4 bg-blue-100 rounded-lg"><p className="text-sm text-blue-800 font-semibold">총 수입</p><p className="text-xl font-bold text-blue-900">₩{totalIncome.toLocaleString()}</p></div>
            <div className="p-4 bg-red-100 rounded-lg"><p className="text-sm text-red-800 font-semibold">총 지출</p><p className="text-xl font-bold text-red-900">₩{totalExpense.toLocaleString()}</p></div>
            <div className="p-4 bg-green-100 rounded-lg"><p className="text-sm text-green-800 font-semibold">순이익</p><p className="text-xl font-bold text-green-900">₩{(totalIncome - totalExpense).toLocaleString()}</p></div>
          </div>
        </div>

        {loading ? <div className="text-center py-10">로딩 중...</div> :
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-7 gap-px text-center font-semibold text-gray-600 border-b pb-2 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {calendarCells.map((cell, index) => {
                if (cell.isPlaceholder) {
                  return (
                    <div
                      key={cell.key || `placeholder-${index}`}
                      className="p-2 border rounded-md h-32 bg-white"
                    />
                  );
                }

                const dayOfWeek = getDay(cell.date);
                const isSaturday = dayOfWeek === 6;
                const isSunday = dayOfWeek === 0;

                return (
                  <motion.div
                    key={cell.key}
                    className={`p-2 border rounded-md h-32 flex flex-col justify-between text-sm 
                      ${isSunday ? 'bg-red-50' : isSaturday ? 'bg-blue-50' : 'bg-gray-50'}`}
                    whileHover={{ scale: 1.05, boxShadow: "0px 4px 10px rgba(0,0,0,0.1)" }}
                  >
                    <p className={`font-bold ${isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-gray-800'}`}>
                      {format(cell.date, 'd')}
                    </p>
                    <div className="text-right">
                      {cell.income > 0 &&
                        <p className="text-blue-600 font-semibold cursor-pointer" onClick={() => openDetailModal(cell)}>
                          + {cell.income.toLocaleString()}
                        </p>}
                      {cell.expense > 0 && <p className="text-red-600 font-semibold">- {cell.expense.toLocaleString()}</p>}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        }
      </div>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDateData ? format(selectedDateData.date, 'M월 d일 수입 내역', { locale: ko }) : '수입 내역'}</DialogTitle>
            <DialogDescription>해당 날짜에 발생한 수입 상세 정보입니다.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
            {selectedDateData?.transactions.filter(t => t.type === 'income').map(t => (
              <div key={t.id} className="flex justify-between items-center p-2 bg-gray-100 rounded-md">
                <div>
                  <p
                    className="font-semibold text-blue-700 hover:underline cursor-pointer"
                    onClick={() => handleCustomerClick(t.customers?.id)}
                  >
                    {t.customers?.name || '알 수 없는 고객'}
                  </p>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </div>
                <p className="font-bold">₩{Number(t.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}