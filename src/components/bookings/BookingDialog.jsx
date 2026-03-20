import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import CustomerDialog from '@/components/customers/CustomerDialog';
import { manageTransactions } from '@/components/Layout';

const timeOptions = Array.from({ length: (19 - 10) * 6 + 1 }, (_, i) => {
  const totalMinutes = 10 * 60 + i * 10;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export default function BookingDialog({ isOpen, onClose, onSave, booking, initialData }) {
  const [allCustomers, setAllCustomers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [customerCache, setCustomerCache] = useState({});
  const [filmingTypes, setFilmingTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  const [formData, setFormData] = useState({});
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [filmingTypePopoverOpen, setFilmingTypePopoverOpen] = useState(false);

  const resetFormData = () => {
    const data = booking || initialData || {};
    setFormData({
      customerName: data.customerName || '',
      customerId: data.customerId || null,
      phone: data.phone || '',
      email: data.email || '',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '',
      filmingTypeId: data.filmingTypeId || null,
      totalCost: data.totalCost || 0,
      notes: data.notes || '',
      smsReminder: data.smsReminder !== undefined ? data.smsReminder : true,
    });
  };

  const fetchFilmingTypes = useCallback(async () => {
      if (!user) return;
      try {
        const { data: filmingTypeData, error: filmingTypeError } = await supabase.from('filming_types').select('id, name, price').eq('user_id', user.id);
        if (filmingTypeError) throw filmingTypeError;
        setFilmingTypes(filmingTypeData || []);
      } catch (error) {
        toast({ variant: 'destructive', title: '촬영 종류 로딩 실패', description: error.message });
      }
  }, [user, toast]);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('products').select('*').eq('user_id', user.id);
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: '상품 로딩 실패', description: error.message });
    }
  }, [user, toast]);

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setCustomerLoading(true);
    try {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id, name, phone, email, created_at, filming_type_id, total_cost, notes, transaction_date')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false, nullsFirst: false })
          .order('name', { ascending: true, nullsFirst: false });
        if (customerError) throw customerError;

        const safeData = customerData || [];
        setAllCustomers(safeData);
        setCustomerCache(prev => {
          const next = { ...prev };
          safeData.forEach(customer => {
            if (customer?.id) {
              next[customer.id] = customer;
            }
          });
          return next;
        });
    } catch (error) {
        toast({ variant: 'destructive', title: '고객 검색 실패', description: error.message });
    } finally {
        setCustomerLoading(false);
    }
  }, [user, toast]);

  const remoteSearchCustomers = useCallback(async (searchTerm) => {
    if (!user) return;
    const keyword = searchTerm.trim();
    if (!keyword) {
      setSearchResults([]);
      setIsSearchingCustomers(false);
      return;
    }

    setIsSearchingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, created_at, filming_type_id, total_cost, notes, transaction_date')
        .eq('user_id', user.id)
        .or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%,email.ilike.%${keyword}%`)
        .order('created_at', { ascending: false, nullsFirst: false })
        .order('name', { ascending: true, nullsFirst: false })
        .limit(100);
      if (error) throw error;

      const safeData = data || [];
      setSearchResults(safeData);
      setCustomerCache(prev => {
        const next = { ...prev };
        safeData.forEach(customer => {
          if (customer?.id) {
            next[customer.id] = customer;
          }
        });
        return next;
      });
    } catch (error) {
      toast({ variant: 'destructive', title: '고객 검색 실패', description: error.message });
    } finally {
      setIsSearchingCustomers(false);
    }
  }, [user, toast]);
  
  const filteredCustomers = useMemo(() => {
    const keyword = customerSearch.trim();
    if (!keyword) return allCustomers;
    return searchResults;
  }, [allCustomers, searchResults, customerSearch]);
  
  useEffect(() => {
    if (!isOpen) return;
    resetFormData();
    fetchFilmingTypes();
    fetchProducts();
    fetchCustomers();
  }, [isOpen, booking, initialData, fetchFilmingTypes, fetchProducts, fetchCustomers]);

  useEffect(() => {
    if (!isOpen) return;
    const handleDataUpdate = () => fetchCustomers();
    window.addEventListener('dataUpdated', handleDataUpdate);
    return () => window.removeEventListener('dataUpdated', handleDataUpdate);
  }, [isOpen, fetchCustomers]);

  useEffect(() => {
    if (!customerPopoverOpen) {
      setCustomerSearch('');
      setSearchResults([]);
      setIsSearchingCustomers(false);
    }
  }, [customerPopoverOpen]);

  useEffect(() => {
    if (!customerPopoverOpen) return;
    const timer = setTimeout(() => {
      remoteSearchCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, customerPopoverOpen, remoteSearchCustomers]);

  useEffect(() => {
    const filmingType = filmingTypes.find(ft => ft.id === formData.filmingTypeId);
    if (!filmingType) return;
    const typePrice = Number(filmingType.price) || 0;
    setFormData(prev => {
      if (prev.totalCost && Number(prev.totalCost) > 0 && prev.totalCost !== typePrice) {
        return prev;
      }
      if (prev.totalCost === typePrice) {
        return prev;
      }
      return { ...prev, totalCost: typePrice };
    });
  }, [formData.filmingTypeId, filmingTypes]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      filmingTypeId: customer.filming_type_id ? Number(customer.filming_type_id) : prev.filmingTypeId || null,
      totalCost: customer.total_cost !== undefined && customer.total_cost !== null
        ? Number(customer.total_cost) || 0
        : prev.totalCost,
      notes: (!prev.notes || prev.notes.trim() === '') && customer.notes ? customer.notes : prev.notes,
    }));
    setCustomerPopoverOpen(false);
    setEditingCustomer(customerCache[customer.id] || customer);
  };
  
  const handleSelectFilmingType = (type) => {
    setFormData(prev => ({ ...prev, filmingTypeId: type.id, totalCost: Number(type.price) || 0 }));
    setFilmingTypePopoverOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast({ variant: 'destructive', title: '고객을 선택하거나 등록해주세요.' });
      return;
    }
    if (!formData.filmingTypeId) {
      toast({ variant: 'destructive', title: '촬영 종류를 선택해주세요.' });
      return;
    }
    onSave(formData);
  };

  const currentFilmingType = filmingTypes.find(ft => ft.id === formData.filmingTypeId);
  const selectedCustomer = useMemo(() => {
    if (!formData.customerId) return null;
    return customerCache[formData.customerId] || null;
  }, [customerCache, formData.customerId]);
  const selectedCustomerFilmingType = useMemo(() => {
    if (!selectedCustomer?.filming_type_id) return null;
    return filmingTypes.find(ft => ft.id === selectedCustomer.filming_type_id) || null;
  }, [selectedCustomer, filmingTypes]);

  const openCustomerDialog = useCallback(async (customer) => {
    if (!user) return;
    try {
      if (customer?.id) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customer.id)
          .eq('user_id', user.id)
          .single();
        if (error) throw error;
        setEditingCustomer(data);
      } else {
        setEditingCustomer(null);
      }
      setIsCustomerDialogOpen(true);
    } catch (error) {
      toast({ variant: 'destructive', title: '고객 정보 로딩 실패', description: error.message });
    }
  }, [user, toast]);

  const handleCustomerDialogClose = useCallback(() => {
    setIsCustomerDialogOpen(false);
    setEditingCustomer(null);
  }, []);

  const handleCustomerDialogSave = async (customerData) => {
    if (!user) return null;

    const isNewCustomer = !editingCustomer?.id;
    
    if (customerData.transaction_date === '') {
      customerData.transaction_date = null;
    }

    const customerToSave = { ...customerData, user_id: user.id };

    if (isNewCustomer && !customerToSave.transaction_date) {
      customerToSave.transaction_date = new Date().toISOString().split('T')[0];
    }

    if (!isNewCustomer) {
      customerToSave.id = editingCustomer.id;
    }

    const { data, error } = await supabase.from('customers').upsert(customerToSave).select().single();

    if (error) {
      toast({ variant: "destructive", title: "저장 실패", description: error.message });
      return null;
    } else {
      toast({ title: "저장 완료!", description: "고객 정보가 성공적으로 저장되었습니다." });
      setIsCustomerDialogOpen(false);

      await manageTransactions(data.id, { ...data, ...customerData }, user.id, toast);

      setCustomerCache(prev => ({
        ...prev,
        [data.id]: data,
      }));
      await fetchCustomers();

      setFormData(prev => ({
        ...prev,
        customerId: data.id,
        customerName: data.name,
        phone: data.phone,
        email: data.email,
        filmingTypeId: data.filming_type_id ? Number(data.filming_type_id) : prev.filmingTypeId,
        totalCost: data.total_cost != null ? Number(data.total_cost) || 0 : prev.totalCost,
        notes: (!prev.notes || prev.notes.trim() === '') && data.notes ? data.notes : prev.notes,
      }));

      window.dispatchEvent(new Event('dataUpdated'));
      return data;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{booking ? '예약 수정' : '새 예약 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-h-[80vh] overflow-y-auto pr-2">
          
          <div className="md:col-span-2 space-y-2">
            <Label>고객 *</Label>
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={customerPopoverOpen} className="w-full justify-between">
                  {selectedCustomer ? selectedCustomer.name : "기존 고객 선택..."}
                  <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput 
                    placeholder="고객 이름 또는 연락처 검색..." 
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    {customerLoading ? (
                      <div className="p-4 text-sm text-center">고객 목록을 불러오는 중...</div>
                    ) : (
                      <>
                        {isSearchingCustomers ? (
                          <div className="p-4 text-sm text-center">검색 중...</div>
                        ) : (
                          <CommandEmpty>고객을 찾을 수 없습니다.</CommandEmpty>
                        )}
                        <CommandGroup>
                          {filteredCustomers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.name || ''} ${customer.phone || ''} ${customer.email || ''}`}
                              onSelect={() => handleSelectCustomer(customer)}
                            >
                              <Check className={cn("mr-2 h-4 w-4", formData.customerId === customer.id ? "opacity-100" : "opacity-0")} />
                              {customer.name || '이름 없음'} {customer.phone ? `(${customer.phone})` : ''}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openCustomerDialog(selectedCustomer)}
                disabled={!selectedCustomer}
              >
                고객 정보 수정
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => openCustomerDialog(null)}
              >
                새 고객 등록
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerName">고객명</Label>
            <Input
              id="customerName"
              name="customerName"
              value={formData.customerName || ''}
              readOnly
              placeholder="선택된 고객 이름"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone || ''}
              readOnly
              placeholder="고객 정보에서 자동 입력"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email || ''}
              readOnly
              placeholder="고객 정보에서 자동 입력"
            />
          </div>

          {selectedCustomer && (
            <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-gray-800">
                최근 촬영 정보
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                {selectedCustomerFilmingType ? (
                  <span>촬영 유형: {selectedCustomerFilmingType.name}</span>
                ) : (
                  <span>촬영 유형: 기록 없음</span>
                )}
                <span>
                  최근 촬영일:{' '}
                  {selectedCustomer.transaction_date
                    ? format(new Date(selectedCustomer.transaction_date), 'yyyy-MM-dd')
                    : '기록 없음'}
                </span>
                {selectedCustomer.total_cost ? (
                  <span>매출: ₩{Number(selectedCustomer.total_cost).toLocaleString()}</span>
                ) : (
                  <span>매출: 기록 없음</span>
                )}
              </div>
              {selectedCustomer.notes && (
                <p className="text-gray-500 mt-1">메모: {selectedCustomer.notes}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">날짜 *</Label>
            <Input id="date" name="date" type="date" value={formData.date || ''} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">시간 *</Label>
            <Select value={formData.time} onValueChange={(value) => setFormData(prev => ({...prev, time: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="시간 선택..." />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map(time => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>촬영 종류 *</Label>
            <Popover open={filmingTypePopoverOpen} onOpenChange={setFilmingTypePopoverOpen}>
              <PopoverTrigger asChild>
                 <Button variant="outline" role="combobox" aria-expanded={filmingTypePopoverOpen} className="w-full justify-between">
                  {currentFilmingType ? `${currentFilmingType.name} (+${Number(currentFilmingType.price).toLocaleString()}원)` : "촬영 종류 선택..."}
                  <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                   <CommandInput placeholder="촬영 종류 검색..." />
                   <CommandEmpty>해당 종류를 찾을 수 없습니다.</CommandEmpty>
                   <CommandList>
                    <CommandGroup>
                      {filmingTypes.map((type) => (
                        <CommandItem key={type.id} onSelect={() => handleSelectFilmingType(type)}>
                           <Check className={cn("mr-2 h-4 w-4", formData.filmingTypeId === type.id ? "opacity-100" : "opacity-0")} />
                          {type.name} (+{Number(type.price).toLocaleString()}원)
                        </CommandItem>
                      ))}
                    </CommandGroup>
                   </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="notes">메모</Label>
            <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="특이사항이나 요청사항을 입력하세요" rows="3" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
          </div>
          
          <div className="md:col-span-2 flex items-center space-x-2">
            <input type="checkbox" id="smsReminder" name="smsReminder" checked={!!formData.smsReminder} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            <Label htmlFor="smsReminder" className="text-sm font-medium text-gray-700">예약 1시간 전 SMS 알림 보내기 (준비중)</Label>
          </div>
          
          <DialogFooter className="md:col-span-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600">저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <CustomerDialog
        isOpen={isCustomerDialogOpen}
        onClose={handleCustomerDialogClose}
        onSave={handleCustomerDialogSave}
        customer={editingCustomer}
        products={products}
        filmingTypes={filmingTypes}
      />
    </Dialog>
  );
}