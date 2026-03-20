import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import { Button } from '@/components/ui/button';
import CustomerDialog from '@/components/customers/CustomerDialog';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';

export const manageTransactions = async (customerId, currentCustomerData, userId, toast) => {
  if (!userId) return;

  const depositAmount = Number(currentCustomerData.deposit) || 0;
  const totalCostAmount = Number(currentCustomerData.total_cost) || 0;
  const balanceAmount = totalCostAmount - depositAmount;
  
  const transactionDate = currentCustomerData.transaction_date || (currentCustomerData.created_at ? new Date(currentCustomerData.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);


  const { data: existingTransactions, error: fetchError } = await db.collection
    .from('transactions')
    .select('id, category')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .in('category', ['선금', '잔금']);

  if (fetchError) {
    console.error("Error fetching existing transactions:", fetchError);
    if(toast) toast({ variant: "destructive", title: "기존 거래내역 조회 실패", description: fetchError.message });
    return;
  }

  const transactionsToUpsert = [];
  const transactionIdsToDelete = [];

  const existingDeposit = existingTransactions.find(t => t.category === '선금');
  if (depositAmount > 0) {
    const depositTransaction = {
      user_id: userId,
      customer_id: customerId,
      type: 'income',
      amount: depositAmount,
      payment_method: currentCustomerData.deposit_payment_method,
      transaction_date: transactionDate,
      description: `${currentCustomerData.name} 고객 선금`,
      category: '선금',
    };
    if (existingDeposit) {
      depositTransaction.id = existingDeposit.id;
    }
    transactionsToUpsert.push(depositTransaction);
  } else if (existingDeposit) {
    transactionIdsToDelete.push(existingDeposit.id);
  }

  const existingBalance = existingTransactions.find(t => t.category === '잔금');
  if (balanceAmount > 0) {
    const balanceTransaction = {
      user_id: userId,
      customer_id: customerId,
      type: 'income',
      amount: balanceAmount,
      payment_method: currentCustomerData.total_cost_payment_method,
      transaction_date: transactionDate,
      description: `${currentCustomerData.name} 고객 잔금`,
      category: '잔금',
    };
    if (existingBalance) {
      balanceTransaction.id = existingBalance.id;
    }
    transactionsToUpsert.push(balanceTransaction);
  } else if (existingBalance) {
    transactionIdsToDelete.push(existingBalance.id);
  }

  if (transactionIdsToDelete.length > 0) {
      const { error: deleteError } = await db.collection('transactions').delete().in('id', transactionIdsToDelete);
      if (deleteError && toast) {
          toast({ variant: "destructive", title: "기존 거래내역 삭제 실패", description: deleteError.message });
      }
  }

  if (transactionsToUpsert.length > 0) {
    const { error: upsertError } = await db.collection('transactions').upsert(transactionsToUpsert, { onConflict: 'id' });
    if (upsertError && toast) {
      toast({
        variant: "destructive",
        title: "자동 정산 실패",
        description: "매출 정보를 자동으로 기록하는 데 실패했습니다. " + upsertError.message,
      });
    }
  }
};


export default function Layout({ children, editingCustomer, isCustomerDialogOpen, onOpenCustomerDialog, onCloseCustomerDialog }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [filmingTypes, setFilmingTypes] = useState([]);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const location = useLocation();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [productsRes, filmingTypesRes] = await Promise.all([
        db.collection('products').select('*').eq('user_id', user.id),
        db.collection('filming_types').select('*').eq('user_id', user.id)
      ]);
      if (productsRes.error) throw productsRes.error;
      if (filmingTypesRes.error) throw filmingTypesRes.error;
      setProducts(productsRes.data || []);
      setFilmingTypes(filmingTypesRes.data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: '데이터 로딩 실패', description: error.message });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleSaveCustomer = async (customerData) => {
    const isNewCustomer = !editingCustomer?.id;
    
    // Ensure transaction_date is not an empty string, convert to null if it is.
    if (customerData.transaction_date === '') {
        customerData.transaction_date = null;
    }

    // Extract booking and delivery info before saving customer
    const bookingDate = customerData.booking_date || '';
    const bookingTime = customerData.booking_time || '';
    const deliveryDate = customerData.delivery_date || '';
    const filmingTypeId = customerData.filming_type_id ? Number(customerData.filming_type_id) : null;

    // Remove booking/delivery fields from customer data before saving
    const { booking_date, booking_time, delivery_date, ...customerToSave } = { ...customerData, user_id: user.id };
    
    if (isNewCustomer && !customerToSave.transaction_date) {
        customerToSave.transaction_date = new Date().toISOString().split('T')[0];
    }
  
    if (!isNewCustomer) {
        customerToSave.id = editingCustomer.id;
    }

    const { data, error } = await db.collection('customers').upsert(customerToSave).select().single();

    if (error) {
        toast({ variant: "destructive", title: "저장 실패", description: error.message });
        return null;
    } else {
        toast({ title: "저장 완료!", description: "고객 정보가 성공적으로 저장되었습니다." });
        
        await manageTransactions(data.id, { ...data, ...customerData }, user.id, toast);

        // Create booking if booking date and time are provided (new customer only)
        if (isNewCustomer && bookingDate && bookingTime && filmingTypeId) {
          try {
            const { error: bookingError } = await db.collection('bookings').insert([{
              user_id: user.id,
              customer_id: data.id,
              customer_name: data.name,
              filming_type_id: filmingTypeId,
              booking_date: bookingDate,
              booking_time: bookingTime,
              memo: customerData.notes || '',
            }]);
            if (bookingError) {
              console.error('예약 생성 실패:', bookingError);
              toast({ variant: 'destructive', title: '예약 생성 실패', description: bookingError.message });
            }
          } catch (err) {
            console.error('예약 생성 오류:', err);
          }
        }

        // Create delivery booking if delivery date is provided (new customer only)
        if (isNewCustomer && deliveryDate) {
          try {
            const filmingTypeName = filmingTypes.find(ft => ft.id === filmingTypeId)?.name || '사진';
            const deliveryMemo = `${data.name}님의 ${filmingTypeName} 출고예정일입니다.`;
            
            console.log('출고 예정일 생성 시도:', {
              deliveryDate,
              filmingTypeId,
              customerName: data.name,
              memo: deliveryMemo
            });
            
            const { error: deliveryError } = await db.collection('bookings').insert([{
              user_id: user.id,
              customer_id: data.id,
              customer_name: data.name,
              filming_type_id: filmingTypeId,
              booking_date: deliveryDate,
              booking_time: '00:00:00', // 출고 예정일은 00:00:00으로 표시
              memo: deliveryMemo,
            }]);
            if (deliveryError) {
              console.error('출고 예정일 생성 실패:', deliveryError);
              toast({ variant: 'destructive', title: '출고 예정일 생성 실패', description: deliveryError.message });
            } else {
              console.log('출고 예정일 생성 성공:', deliveryDate);
            }
          } catch (err) {
            console.error('출고 예정일 생성 오류:', err);
          }
        }

        onCloseCustomerDialog();

        window.dispatchEvent(new Event('dataUpdated'));
        
        return data;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar 
        profile={profile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onAddNewCustomer={() => onOpenCustomerDialog()}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader profile={profile} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      <Button
        onClick={() => onOpenCustomerDialog()}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:scale-110 transform transition-transform z-50"
      >
        <Plus className="w-8 h-8" />
      </Button>

      <CustomerDialog
        isOpen={isCustomerDialogOpen}
        onClose={onCloseCustomerDialog}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        products={products}
        filmingTypes={filmingTypes}
      />
    </div>
  );
}