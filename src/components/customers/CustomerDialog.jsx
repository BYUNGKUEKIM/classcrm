import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { format } from 'date-fns';

const timeOptions = Array.from({ length: (19 - 10) * 6 + 1 }, (_, i) => {
  const totalMinutes = 10 * 60 + i * 10;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

const paymentMethods = ["카드", "현금", "계좌이체"];

export default function CustomerDialog({ isOpen, onClose, onSave, customer, products = [], filmingTypes = [] }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const customerId = customer?.id;
  
  const getInitialState = (customer) => ({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    notes: customer?.notes || '',
    filming_type_id: customer?.filming_type_id?.toString() || '',
    selected_products: customer?.selected_products || [],
    total_cost: customer?.total_cost || 0,
    deposit: customer?.deposit || 0,
    total_cost_payment_method: customer?.total_cost_payment_method || '카드',
    deposit_payment_method: customer?.deposit_payment_method || '카드',
    transaction_date: customer?.transaction_date || (customer?.created_at ? new Date(customer.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    booking_date: customer?.booking_date || '',
    booking_time: customer?.booking_time || '',
    delivery_date: customer?.delivery_date || '',
  });

  const [formData, setFormData] = useState(getInitialState(customer));
  const [openFilmingTypePopover, setOpenFilmingTypePopover] = useState(false);
  const [visitHistory, setVisitHistory] = useState([]);
  const [visitLoading, setVisitLoading] = useState(false);
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [deletingVisitId, setDeletingVisitId] = useState(null);
  const [updatingVisitId, setUpdatingVisitId] = useState(null);
  const [visitDateDrafts, setVisitDateDrafts] = useState({});
  const todayString = format(new Date(), 'yyyy-MM-dd');
  const [visitForm, setVisitForm] = useState({
    filming_type_id: '',
    amount: '',
    payment_method: paymentMethods[0],
    description: '',
    date: todayString,
  });


  useEffect(() => {
    if (isOpen) {
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      setFormData(getInitialState(customer));
      setVisitForm({
        filming_type_id: customer?.filming_type_id?.toString() || '',
        amount: '',
        payment_method: paymentMethods[0],
        description: '',
        date: currentDate,
      });
    } else {
      setVisitHistory([]);
      setVisitDateDrafts({});
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      setVisitForm({
        filming_type_id: '',
        amount: '',
        payment_method: paymentMethods[0],
        description: '',
        date: currentDate,
      });
    }
  }, [customer, isOpen]);

  const calculatedTotal = useMemo(() => {
    const filmingTypePrice = filmingTypes.find(ft => ft.id === Number(formData.filming_type_id))?.price || 0;
    const productsPrice = formData.selected_products.reduce((sum, sp) => sum + (sp.price * sp.quantity), 0);
    return Number(filmingTypePrice) + Number(productsPrice);
  }, [formData.filming_type_id, formData.selected_products, filmingTypes]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, total_cost: calculatedTotal }));
  }, [calculatedTotal]);

  const fetchVisitHistory = useCallback(async () => {
    if (!user || !customerId) return;
    setVisitLoading(true);
    try {
      const { data, error } = await db.collection
        .from('transactions')
        .select('id, transaction_date, amount, description, payment_method, created_at')
        .eq('user_id', user.id)
        .eq('customer_id', customerId)
        .eq('type', 'income')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      const history = data || [];
      setVisitHistory(history);
      const drafts = history.reduce((acc, visit) => {
        acc[visit.id] = visit.transaction_date || todayString;
        return acc;
      }, {});
      setVisitDateDrafts(drafts);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '촬영 기록 불러오기 실패',
        description: error.message,
      });
    } finally {
      setVisitLoading(false);
    }
  }, [customerId, user, toast]);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchVisitHistory();
    }
  }, [isOpen, customerId, fetchVisitHistory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const resetVisitForm = useCallback(() => {
    setVisitForm({
      filming_type_id: '',
      amount: '',
      payment_method: paymentMethods[0],
      description: '',
      date: todayString,
    });
  }, [todayString]);

  const handleVisitSelectChange = (value) => {
    const targetFilmingType = filmingTypes.find((ft) => ft.id === Number(value));
    setVisitForm((prev) => ({
      ...prev,
      filming_type_id: value,
      amount: targetFilmingType ? String(targetFilmingType.price || 0) : '',
      description: prev.description || (targetFilmingType ? `${targetFilmingType.name} 촬영` : ''),
    }));
  };

  const handleVisitInputChange = (e) => {
    const { name, value } = e.target;
    setVisitForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVisitPaymentChange = (value) => {
    setVisitForm((prev) => ({ ...prev, payment_method: value }));
  };

  const handleAddVisit = async () => {
    if (!customerId || !user) {
      toast({ variant: 'destructive', title: '오류', description: '고객 정보가 저장된 후에 촬영 기록을 추가할 수 있습니다.' });
      return;
    }

    if (!visitForm.filming_type_id) {
      toast({ variant: 'destructive', title: '촬영 분류 필요', description: '촬영 분류를 선택해 주세요.' });
      return;
    }

    const filmingType = filmingTypes.find((ft) => ft.id === Number(visitForm.filming_type_id));
    const parsedAmount = Number(visitForm.amount || filmingType?.price || 0);

    if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ variant: 'destructive', title: '금액 확인', description: '유효한 매출 금액을 입력해 주세요.' });
      return;
    }

    const targetDate = visitForm.date || todayString;
    setIsSavingVisit(true);

    try {
      const descriptionText =
        visitForm.description?.trim() ||
        `${customer?.name || ''} ${filmingType?.name || ''} 촬영`;

      const { error: insertError } = await db.collection('transactions').insert([
        {
          user_id: user.id,
          customer_id: customerId,
          type: 'income',
          amount: parsedAmount,
          payment_method: visitForm.payment_method,
          transaction_date: targetDate,
          description: descriptionText,
          category: '촬영',
        },
      ]);

      if (insertError) throw insertError;

      const { error: updateError } = await db.collection
        .from('customers')
        .update({
          transaction_date: targetDate,
          filming_type_id: Number(visitForm.filming_type_id) || null,
        })
        .eq('id', customerId);

      if (updateError) throw updateError;

      toast({ title: '촬영 기록 추가 완료', description: '오늘 매출 내역이 반영되었습니다.' });

      setFormData((prev) => ({
        ...prev,
        transaction_date: targetDate,
        filming_type_id: visitForm.filming_type_id,
      }));

      resetVisitForm();
      await fetchVisitHistory();
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '촬영 기록 추가 실패',
        description: error.message,
      });
    } finally {
      setIsSavingVisit(false);
    }
  };
  
  const handleVisitDateDraftChange = (visitId, value) => {
    setVisitDateDrafts((prev) => ({
      ...prev,
      [visitId]: value,
    }));
  };

  const handleSaveVisitDate = async (visitId) => {
    const newDate = visitDateDrafts[visitId];
    if (!newDate) return;
    setUpdatingVisitId(visitId);
    try {
      const { error } = await db.collection
        .from('transactions')
        .update({ transaction_date: newDate })
        .eq('id', visitId)
        .eq('user_id', user.id);
      if (error) throw error;
      await fetchVisitHistory();
      toast({ title: '촬영 날짜 변경 완료' });
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '날짜 변경 실패',
        description: error.message,
      });
    } finally {
      setUpdatingVisitId(null);
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (!customerId || !user) return;
    if (!window.confirm('이 촬영 매출 기록을 삭제하시겠습니까?')) return;
    setDeletingVisitId(visitId);
    try {
      const { error } = await db.collection
        .from('transactions')
        .delete()
        .eq('id', visitId)
        .eq('user_id', user.id);
      if (error) throw error;
      await fetchVisitHistory();
      toast({ title: '촬영 매출이 삭제되었습니다.' });
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error.message,
      });
    } finally {
      setDeletingVisitId(null);
    }
  };

  const handleProductSelection = (product) => {
    setFormData(prev => {
      const existingProduct = prev.selected_products.find(p => p.id === product.id);
      if (existingProduct) {
        return {
          ...prev,
          selected_products: prev.selected_products.filter(p => p.id !== product.id)
        };
      } else {
        return {
          ...prev,
          selected_products: [...prev.selected_products, { ...product, quantity: 1 }]
        };
      }
    });
  };

  const handleProductQuantityChange = (productId, quantity) => {
    const newQuantity = Math.max(1, Number(quantity));
    setFormData(prev => ({
      ...prev,
      selected_products: prev.selected_products.map(p =>
        p.id === productId ? { ...p, quantity: newQuantity } : p
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ variant: 'destructive', title: '입력 오류', description: '고객 이름은 필수입니다.' });
      return;
    }
    onSave({
      ...formData,
      total_cost: parseFloat(formData.total_cost) || 0,
      deposit: parseFloat(formData.deposit) || 0,
      filming_type_id: Number(formData.filming_type_id) || null,
      booking_date: formData.booking_date || '',
      booking_time: formData.booking_time || '',
      delivery_date: formData.delivery_date || '',
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{customer ? '고객 정보 수정' : '신규 고객 등록'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto">
          {/* 기본 정보 */}
          <div className="space-y-3 border-b border-gray-200 pb-4">
            <h3 className="font-bold text-base text-gray-900 mb-3">기본 정보</h3>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-800">고객 이름*</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="focus-visible:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-800">연락처</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="focus-visible:border-blue-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-800">이메일</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="이메일 주소"
                  className="focus-visible:border-blue-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction_date" className="text-sm font-medium text-gray-800">거래 발생일*</Label>
              <Input id="transaction_date" name="transaction_date" type="date" value={formData.transaction_date} onChange={handleChange} required className="focus-visible:border-blue-500" />
            </div>
          </div>

          {/* 촬영 정보 */}
          <div className="space-y-3 border-b border-gray-200 pb-4">
            <h3 className="font-bold text-base text-gray-900 mb-3">촬영 정보</h3>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-800">촬영 유형</Label>
              <Popover open={openFilmingTypePopover} onOpenChange={setOpenFilmingTypePopover}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openFilmingTypePopover} className="w-full justify-between">
                    {formData.filming_type_id ? filmingTypes.find(ft => ft.id === Number(formData.filming_type_id))?.name : "선택..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="검색..." />
                    <CommandEmpty>결과 없음.</CommandEmpty>
                    <CommandGroup>
                      {filmingTypes.map((ft) => (
                        <CommandItem
                          key={ft.id}
                          value={ft.name}
                          onSelect={() => {
                            handleSelectChange('filming_type_id', ft.id.toString());
                            setOpenFilmingTypePopover(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", Number(formData.filming_type_id) === ft.id ? "opacity-100" : "opacity-0")} />
                          {ft.name} (₩{Number(ft.price).toLocaleString()})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {products.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-800">추가 상품</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-gray-50">
                  {products.map(product => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={!!formData.selected_products.find(p => p.id === product.id)}
                        onCheckedChange={() => handleProductSelection(product)}
                      />
                      <label htmlFor={`product-${product.id}`} className="text-xs leading-none cursor-pointer text-gray-700 font-medium">
                        {product.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 결제 정보 */}
          <div className="space-y-3 border-b border-gray-200 pb-4">
            <h3 className="font-bold text-base text-gray-900 mb-3">결제 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="total_cost" className="text-sm font-medium text-gray-800">총비용</Label>
                <Input id="total_cost" name="total_cost" type="number" value={formData.total_cost} onChange={handleChange} className="focus-visible:border-blue-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-800">결제수단</Label>
                <Select name="total_cost_payment_method" value={formData.total_cost_payment_method} onValueChange={(value) => handleSelectChange('total_cost_payment_method', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="deposit" className="text-sm font-medium text-gray-800">선금</Label>
                <Input id="deposit" name="deposit" type="number" value={formData.deposit} onChange={handleChange} className="focus-visible:border-blue-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-800">선금 결제수단</Label>
                <Select name="deposit_payment_method" value={formData.deposit_payment_method} onValueChange={(value) => handleSelectChange('deposit_payment_method', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-800">메모</Label>
            <Input id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="메모 입력" className="focus-visible:border-blue-500" />
          </div>

          {!customerId && (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="font-bold text-base text-gray-900 mb-3">예약 및 출고 설정</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="booking_date" className="text-sm font-medium text-gray-800">예약 날짜</Label>
                  <Input id="booking_date" name="booking_date" type="date" value={formData.booking_date} onChange={handleChange} className="focus-visible:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking_time" className="text-sm font-medium text-gray-800">예약 시간</Label>
                  <Select name="booking_time" value={formData.booking_time} onValueChange={(value) => handleSelectChange('booking_time', value)}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_date" className="text-sm font-medium text-gray-800">출고 예정일</Label>
                <Input id="delivery_date" name="delivery_date" type="date" value={formData.delivery_date} onChange={handleChange} className="focus-visible:border-blue-500" />
              </div>
            </div>
          )}

          {customerId && (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="font-bold text-base text-gray-900 mb-3">촬영 이력</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-md p-3">
                {visitLoading ? (
                  <p className="text-xs text-gray-500 text-center py-2">불러오는 중...</p>
                ) : visitHistory.length > 0 ? (
                  visitHistory.map((visit) => (
                    <div key={visit.id} className="flex items-center justify-between bg-white rounded px-2 py-2 text-xs border border-gray-200 mb-1">
                      <div className="flex-1">
                        <Input
                          type="date"
                          value={visitDateDrafts[visit.id] || todayString}
                          onChange={(e) => handleVisitDateDraftChange(visit.id, e.target.value)}
                          onBlur={() => handleSaveVisitDate(visit.id)}
                          disabled={updatingVisitId === visit.id}
                          className="h-7 text-xs mb-1"
                        />
                        <p className="text-gray-700 font-medium truncate">{visit.description || '설명 없음'}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="font-bold text-blue-600">₩{Number(visit.amount).toLocaleString()}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 font-bold"
                          onClick={() => handleDeleteVisit(visit.id)}
                          disabled={deletingVisitId === visit.id}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">기록 없음</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-800">촬영 분류</Label>
                  <Select value={visitForm.filming_type_id} onValueChange={handleVisitSelectChange}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {filmingTypes.map((ft) => (
                        <SelectItem key={ft.id} value={String(ft.id)}>
                          {ft.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="visitAmount" className="text-sm font-medium text-gray-800">금액</Label>
                  <Input
                    id="visitAmount"
                    name="amount"
                    type="number"
                    min="0"
                    value={visitForm.amount}
                    onChange={handleVisitInputChange}
                    className="h-9 focus-visible:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="visitDate" className="text-sm font-medium text-gray-800">일자</Label>
                  <Input
                    id="visitDate"
                    name="date"
                    type="date"
                    value={visitForm.date}
                    onChange={handleVisitInputChange}
                    className="h-9 focus-visible:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-800">결제수단</Label>
                  <Select value={visitForm.payment_method} onValueChange={handleVisitPaymentChange}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="visitDescription" className="text-sm font-medium text-gray-800">메모</Label>
                <Input
                  id="visitDescription"
                  name="description"
                  value={visitForm.description}
                  onChange={handleVisitInputChange}
                  placeholder="메모"
                  className="h-9 focus-visible:border-blue-500"
                />
              </div>
              <Button type="button" onClick={handleAddVisit} disabled={isSavingVisit} className="w-full h-9">
                {isSavingVisit ? '저장 중...' : '매출 추가'}
              </Button>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600">저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}