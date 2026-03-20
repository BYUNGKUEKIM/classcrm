import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import CustomerCard from '@/components/customers/CustomerCard';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function CustomersPage({ onEditCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const fetchChunkSize = 400;

  const fetchCustomers = useCallback(async (search) => {
    if (!user) return;
    setLoading(true);
    
    try {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(fetchChunkSize);

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      setCustomers(data || []);
      setTotalCustomers(count ?? (data?.length || 0));

    } catch (error) {
      toast({
        variant: "destructive",
        title: "고객 정보 로딩 실패",
        description: error.message,
      });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchCustomers]);

  const handleDataUpdate = useCallback(() => {
    fetchCustomers(searchTerm);
  }, [searchTerm, fetchCustomers]);

  useEffect(() => {
    handleDataUpdate();
    window.addEventListener('dataUpdated', handleDataUpdate);
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, [handleDataUpdate]);

  const buildEmailLink = useCallback((email) => {
    if (!email) return null;
    return `https://mail.naver.com/write/popup?to=${encodeURIComponent(email)}`;
  }, []);

  const groupedCustomers = useMemo(() => {
    return customers.reduce((acc, customer) => {
      const date = customer.transaction_date || customer.created_at;
      const dateKey = date ? format(new Date(date), 'yyyy-MM-dd') : '날짜 없음';
      const enrichedCustomer = {
        ...customer,
        email_link: buildEmailLink(customer.email),
      };

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(enrichedCustomer);
      return acc;
    }, {});
  }, [customers, buildEmailLink]);

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('정말로 이 고객 정보를 삭제하시겠습니까? 관련 예약, 매출 정보도 모두 삭제됩니다.')) {
      return;
    }
    try {
      const { error: transactionError } = await supabase.from('transactions').delete().eq('customer_id', id);
      if (transactionError) throw transactionError;

      const { error: bookingError } = await supabase.from('bookings').delete().eq('customer_id', id);
      if (bookingError) throw bookingError;

      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      
      toast({
        title: "삭제 완료",
        description: "고객 정보가 성공적으로 삭제되었습니다.",
      });
      handleDataUpdate();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "삭제 실패",
        description: error.message,
      });
    }
  };

  const monthGroupedCustomers = useMemo(() => {
    return customers.reduce((acc, customer) => {
      const baseDate = customer.transaction_date || customer.created_at;
      const dateObj = baseDate ? new Date(baseDate) : null;
      const monthKey = dateObj ? format(dateObj, 'yyyy-MM') : '날짜 없음';
      const dateKey = dateObj ? format(dateObj, 'yyyy-MM-dd') : '날짜 없음';
      const enrichedCustomer = {
        ...customer,
        email_link: buildEmailLink(customer.email),
      };

      if (!acc[monthKey]) {
        acc[monthKey] = {};
      }
      if (!acc[monthKey][dateKey]) {
        acc[monthKey][dateKey] = [];
      }
      acc[monthKey][dateKey].push(enrichedCustomer);
      return acc;
    }, {});
  }, [customers, buildEmailLink]);

  const monthKeys = useMemo(() => {
    return Object.keys(monthGroupedCustomers).sort((a, b) => {
      if (a === '날짜 없음') return 1;
      if (b === '날짜 없음') return -1;
      return new Date(`${b}-01`) - new Date(`${a}-01`);
    });
  }, [monthGroupedCustomers]);

  const totalPages = Math.max(1, monthKeys.length || 1);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedMonthKeys = useMemo(
    () => monthKeys.slice(currentPage - 1, currentPage),
    [monthKeys, currentPage]
  );

  return (
    <>
      <Helmet>
        <title>고객 관리 - 포토스튜디오 CRM</title>
        <meta name="description" content="고객 정보 관리 및 촬영 이력 확인" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">고객 관리</h1>
            <p className="text-gray-600 mt-2">총 {totalCustomers.toLocaleString()}명의 고객</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="이름, 전화번호, 이메일로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : customers.length > 0 && paginatedMonthKeys.length > 0 ? (
          <div className="space-y-8">
            {paginatedMonthKeys.map(monthKey => {
              const dateGroups = monthGroupedCustomers[monthKey] || {};
              const dateKeys = Object.keys(dateGroups).sort((a, b) => {
                if (a === '날짜 없음') return 1;
                if (b === '날짜 없음') return -1;
                return new Date(b) - new Date(a);
              });

              return (
                <div key={monthKey} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {monthKey === '날짜 없음'
                        ? '날짜 없음'
                        : format(new Date(`${monthKey}-01`), "yyyy년 MM월", { locale: ko })}
                    </h2>
                    <span className="ml-3 bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">
                      {Object.values(dateGroups).reduce((sum, customers) => sum + customers.length, 0)}명
                    </span>
                  </div>

                  <div className="space-y-8">
                    {dateKeys.map(dateKey => (
                      <motion.div
                        key={dateKey}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="flex items-center mb-4">
                          <h3 className="text-xl font-bold text-gray-800">
                            {dateKey === '날짜 없음'
                              ? dateKey
                              : format(new Date(dateKey), "MM월 dd일 (eee)", { locale: ko })}
                          </h3>
                          <span className="ml-3 bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            {dateGroups[dateKey].length}명
                          </span>
                        </div>
                        <div 
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        >
                          {dateGroups[dateKey].map((customer) => (
                            <CustomerCard
                              key={customer.id}
                              customer={customer}
                              onEdit={onEditCustomer}
                              onDelete={handleDeleteCustomer}
                            />
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 text-lg font-semibold">{searchTerm ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}</p>
            <p className="text-gray-400 mt-2">{searchTerm ? '다른 검색어로 시도해보세요.' : "오른쪽 하단의 '+' 버튼을 눌러 첫 고객을 등록해보세요!"}</p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-8">
            <button
              className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {currentPage}/{totalPages}
            </span>
            <button
              className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </>
  );
}