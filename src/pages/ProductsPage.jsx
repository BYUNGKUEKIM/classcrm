import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Package, Edit, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';

function ProductDialog({ isOpen, onClose, onSave, product }) {
  const [formData, setFormData] = useState({ name: '', price: '' });
  
  useEffect(() => {
    if (product) {
      setFormData({ name: product.name, price: product.price });
    } else {
      setFormData({ name: '', price: '' });
    }
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert("상품명과 가격을 모두 입력해주세요.");
      return;
    }
    onSave({ ...formData, price: Number(formData.price) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle>{product ? '상품 수정' : '새 상품 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700">상품명 *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="bg-gray-50 border-gray-300" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price" className="text-gray-700">가격 (원) *</Label>
            <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} required className="bg-gray-50 border-gray-300" />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-300">취소</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">{product ? '수정' : '추가'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data);
    } catch (error) {
      toast({ variant: "destructive", title: "상품 로딩 실패", description: error.message });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Update
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: "상품 수정 완료" });
      } else {
        // Create
        const { error } = await supabase
          .from('products')
          .insert({ ...productData, user_id: user.id });
        if (error) throw error;
        toast({ title: "새 상품 추가 완료" });
      }
      fetchProducts();
      setIsDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast({ variant: "destructive", title: "저장 실패", description: error.message });
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        fetchProducts();
        toast({ title: "상품 삭제 완료", variant: "destructive" });
      } catch (error) {
        toast({ variant: "destructive", title: "삭제 실패", description: error.message });
      }
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <>
      <Helmet>
        <title>상품 관리 - 포토스튜디오 CRM</title>
        <meta name="description" content="스튜디오에서 제공하는 추가 상품 관리 (액자, 앨범 등)" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">상품 관리</h1>
          <Button onClick={() => { setEditingProduct(null); setIsDialogOpen(true); }} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <Plus className="w-5 h-5 mr-2" />새 상품 추가
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-md">
          <ul className="divide-y divide-gray-200">
            {products.length > 0 ? products.map((product, index) => (
              <motion.li
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex justify-between items-center"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg"><Package className="text-blue-600" /></div>
                  <div>
                    <p className="font-semibold text-gray-800">{product.name}</p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <DollarSign className="w-3 h-3 mr-1"/>
                      {Number(product.price).toLocaleString()}원
                    </p>
                  </div>
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="icon" onClick={() => { setEditingProduct(product); setIsDialogOpen(true); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.li>
            )) : (
              <div className="p-12 text-center text-gray-500">
                <Package className="w-16 h-16 mx-auto text-gray-300" />
                <p className="mt-4 font-semibold">등록된 상품이 없습니다.</p>
                <p className="text-sm text-gray-400 mt-1">우측 상단의 '새 상품 추가' 버튼으로 첫 상품을 등록해보세요.</p>
              </div>
            )}
          </ul>
        </div>
      </div>

      <ProductDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
      />
    </>
  );
}