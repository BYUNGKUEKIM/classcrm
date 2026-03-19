import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TransactionDialog({ isOpen, onClose, onSave, transaction }) {
  
  const getInitialState = () => ({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });
  
  const [formData, setFormData] = useState(getInitialState());

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setFormData({
          type: transaction.type || 'expense',
          amount: transaction.amount || '',
          category: transaction.category || '',
          description: transaction.description || '',
          transaction_date: transaction.transaction_date || new Date().toISOString().split('T')[0],
        });
      } else {
        setFormData(getInitialState());
      }
    }
  }, [transaction, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { 
      ...formData, 
      amount: parseFloat(formData.amount) || 0,
    };
    if (transaction?.id) {
      dataToSave.id = transaction.id;
    }
    onSave(dataToSave);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? '거래 수정' : '새 거래 추가 (지출)'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
           <input type="hidden" name="type" value="expense" />
          <div className="space-y-2">
            <Label htmlFor="amount">금액 *</Label>
            <Input id="amount" name="amount" type="number" placeholder="0" value={formData.amount} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">카테고리 *</Label>
            <Input id="category" name="category" placeholder="예: 장비구입, 스튜디오 월세" value={formData.category} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transaction_date">날짜 *</Label>
            <Input id="transaction_date" name="transaction_date" type="date" value={formData.transaction_date} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Input id="description" name="description" value={formData.description} onChange={handleChange} />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600">저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}