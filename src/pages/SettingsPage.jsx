import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { supabase } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { read, utils, writeFile } from 'xlsx';
import { manageTransactions } from '@/components/Layout';
import { Progress } from '@/components/ui/progress';

const SettingsTab = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
    </div>
);

export default function SettingsPage() {
    const { user, profile, loading: authLoading, fetchProfile } = useAuth();
    const [studioName, setStudioName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [products, setProducts] = useState([]);
    const [filmingTypes, setFilmingTypes] = useState([]);
    
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
    const [isFilmingTypeDialogOpen, setIsFilmingTypeDialogOpen] = useState(false);

    const [editingProduct, setEditingProduct] = useState(null);
    const [editingFilmingType, setEditingFilmingType] = useState(null);

    const [productFormData, setProductFormData] = useState({ name: '', price: '' });
    const [filmingTypeFormData, setFilmingTypeFormData] = useState({ name: '', price: '' });

    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (profile) {
            setStudioName(profile.studio_name || '');
            setOwnerName(profile.owner_name || '');
            setPhoneNumber(profile.phone_number || '');
        }
    }, [profile]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [productsRes, filmingTypesRes] = await Promise.all([
                supabase.from('products').select('*').eq('user_id', user.id).order('name'),
                supabase.from('filming_types').select('*').eq('user_id', user.id).order('name')
            ]);
            if (productsRes.error) throw productsRes.error;
            if (filmingTypesRes.error) throw filmingTypesRes.error;
            setProducts(productsRes.data || []);
            setFilmingTypes(filmingTypesRes.data || []);
        } catch (error) {
            toast({ variant: 'destructive', title: '데이터 로딩 실패', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
        const handleDataUpdate = () => fetchData();
        window.addEventListener('dataUpdated', handleDataUpdate);
        return () => window.removeEventListener('dataUpdated', handleDataUpdate);
    }, [fetchData]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ studio_name: studioName, owner_name: ownerName, phone_number: phoneNumber })
            .eq('id', user.id);
        
        if (error) {
            toast({ variant: 'destructive', title: '프로필 업데이트 실패', description: error.message });
        } else {
            toast({ title: '성공', description: '프로필이 성공적으로 업데이트되었습니다.' });
            if(fetchProfile) fetchProfile();
        }
        setLoading(false);
    };

    const handleProductSave = async (e) => {
        e.preventDefault();
        const dataToSave = { ...productFormData, user_id: user.id, price: parseFloat(productFormData.price) };
        if (editingProduct?.id) dataToSave.id = editingProduct.id;

        const { error } = await supabase.from('products').upsert(dataToSave);
        if (error) toast({ variant: 'destructive', title: '저장 실패', description: error.message });
        else {
            toast({ title: '저장 완료' });
            setIsProductDialogOpen(false);
            setEditingProduct(null);
            fetchData();
            window.dispatchEvent(new CustomEvent('dataUpdated'));
        }
    };
    
    const handleFilmingTypeSave = async (e) => {
        e.preventDefault();
        const dataToSave = { ...filmingTypeFormData, user_id: user.id, price: parseFloat(filmingTypeFormData.price) };
        if (editingFilmingType?.id) dataToSave.id = editingFilmingType.id;

        const { error } = await supabase.from('filming_types').upsert(dataToSave);
        if (error) toast({ variant: 'destructive', title: '저장 실패', description: error.message });
        else {
            toast({ title: '저장 완료' });
            setIsFilmingTypeDialogOpen(false);
            setEditingFilmingType(null);
            fetchData();
            window.dispatchEvent(new CustomEvent('dataUpdated'));
        }
    };
    
    const openProductDialog = (product = null) => {
        setEditingProduct(product);
        setProductFormData(product ? { name: product.name, price: product.price } : { name: '', price: '' });
        setIsProductDialogOpen(true);
    };

    const openFilmingTypeDialog = (type = null) => {
        setEditingFilmingType(type);
        setFilmingTypeFormData(type ? { name: type.name, price: type.price } : { name: '', price: '' });
        setIsFilmingTypeDialogOpen(true);
    };

    const handleDelete = async (table, id) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) toast({ variant: 'destructive', title: '삭제 실패', description: error.message });
        else {
            toast({ title: '삭제 완료' });
            fetchData();
            window.dispatchEvent(new CustomEvent('dataUpdated'));
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = read(data, { type: 'array', cellDates: true, dateNF:'YYYY-MM-DD' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = utils.sheet_to_json(worksheet, { raw: false });

                if (json.length === 0) throw new Error("엑셀 파일에 데이터가 없습니다.");
                
                setIsProcessing(true);
                setProgress(0);

                const customersToInsert = json.map(row => {
                    const dateValue = row['거래일'] || row.transaction_date || row['생성일'] || row.created_at;
                    let transactionDate = new Date().toISOString().split('T')[0];
                    if (dateValue) {
                      try {
                        transactionDate = new Date(dateValue).toISOString().split('T')[0];
                      } catch (e) {
                         console.warn(`Invalid date format for row: ${JSON.stringify(row)}. Defaulting to today.`);
                      }
                    }
                    return {
                        user_id: user.id,
                        name: row['고객명'] || row.name || '이름없음',
                        phone: String(row['연락처'] || row.phone || ''),
                        email: row['이메일'] || row.email,
                        notes: row['메모'] || row.notes,
                        total_cost: parseFloat(row['총비용'] || row.total_cost || 0),
                        deposit: parseFloat(row['선금'] || row.deposit || 0),
                        transaction_date: transactionDate,
                    };
                });
                
                const CHUNK_SIZE = 50;
                for (let i = 0; i < customersToInsert.length; i += CHUNK_SIZE) {
                    const chunk = customersToInsert.slice(i, i + CHUNK_SIZE);
                    const { data: insertedCustomers, error } = await supabase.from('customers').insert(chunk).select();
                    if (error) throw new Error(`고객 데이터 일괄 입력 실패: ${error.message}`);
                    for(const c of insertedCustomers) await manageTransactions(c.id, c, user.id);
                    setProgress(Math.round(((i + chunk.length) / customersToInsert.length) * 100));
                }

                toast({ title: '업로드 성공', description: `${customersToInsert.length}명의 고객 정보가 등록되었습니다.` });
                window.dispatchEvent(new Event('dataUpdated'));

            } catch (error) {
                toast({ variant: 'destructive', title: '엑셀 처리 오류', description: error.message });
            } finally {
                setIsProcessing(false);
                setProgress(0);
                if(e.target) e.target.value = null; 
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleRebuildTransactions = async () => {
        if (!window.confirm('모든 고객의 매출 정보를 처음부터 다시 정산합니다. 계속하시겠습니까?')) return;
        setIsProcessing(true);
        setProgress(0);
        try {
            const { data: customers, error: customerError } = await supabase.from('customers').select('*').eq('user_id', user.id);
            if (customerError) throw customerError;
            if (!customers || customers.length === 0) {
                toast({ title: '알림', description: '정산할 고객 데이터가 없습니다.' });
                return;
            }
            await supabase.from('transactions').delete().eq('user_id', user.id).in('category', ['선금', '잔금']);
            for (let i = 0; i < customers.length; i++) {
                await manageTransactions(customers[i].id, customers[i], user.id);
                setProgress(Math.round(((i + 1) / customers.length) * 100));
            }
            toast({ title: '재정산 완료', description: `총 ${customers.length}명의 고객에 대한 매출 정보가 재정산되었습니다.` });
            window.dispatchEvent(new Event('dataUpdated'));
        } catch (error) {
            toast({ variant: 'destructive', title: '재정산 실패', description: error.message });
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['고객명', '연락처', '이메일', '메모', '총비용', '선금', '거래일'];
        const ws = utils.aoa_to_sheet([headers]);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "고객 템플릿");
        writeFile(wb, "customer_template.xlsx");
        toast({title: "템플릿 다운로드 완료"});
    };

    const handleDownloadData = async () => {
        setLoading(true);
        try {
            const { data: customers, error } = await supabase
                .from('customers')
                .select('name,phone,email,notes,total_cost,deposit,transaction_date,created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const dataToExport = customers.map(c => ({
                '고객명': c.name,
                '연락처': c.phone,
                '이메일': c.email,
                '메모': c.notes,
                '총비용': c.total_cost,
                '선금': c.deposit,
                '거래일': c.transaction_date,
                '최초등록일': c.created_at,
            }));

            const ws = utils.json_to_sheet(dataToExport);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "고객 정보");
            writeFile(wb, "customer_data.xlsx");
            toast({title: "고객 정보 다운로드 완료"});

        } catch (error) {
            toast({ variant: 'destructive', title: '데이터 다운로드 실패', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <div className="flex justify-center items-center h-screen"><p>로딩 중...</p></div>;

    return (
        <>
            <Helmet>
                <title>설정 - 포토스튜디오 CRM</title>
                <meta name="description" content="스튜디오 정보, 상품, 촬영 유형 및 데이터 관리" />
            </Helmet>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
                <h1 className="text-3xl font-bold text-gray-900">설정</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <SettingsTab title="기본 정보">
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div><Label htmlFor="studioName">스튜디오 이름</Label><Input id="studioName" value={studioName} onChange={(e) => setStudioName(e.target.value)} /></div>
                                <div><Label htmlFor="ownerName">대표자명</Label><Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></div>
                                <div><Label htmlFor="phoneNumber">연락처</Label><Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} /></div>
                                <Button type="submit" disabled={loading}>{loading ? '저장 중...' : '저장'}</Button>
                            </form>
                        </SettingsTab>
                        <SettingsTab title="데이터 관리">
                            <div className="space-y-6">
                                <div>
                                    <Label>엑셀 파일로 고객 일괄 등록</Label>
                                    <p className="text-sm text-gray-500 mb-2">정해진 템플릿 양식의 엑셀 파일을 업로드하여 고객을 한번에 등록합니다.</p>
                                    <div className="flex gap-2">
                                        <Button onClick={handleDownloadTemplate} variant="outline" className="flex-1">템플릿 다운로드</Button>
                                        <Input id="excel-upload" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isProcessing}/>
                                        <Button asChild variant="secondary" className="flex-1">
                                            <label htmlFor="excel-upload" className="cursor-pointer">파일 선택 및 업로드</label>
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <Label>고객 정보 백업</Label>
                                    <p className="text-sm text-gray-500 mb-2">현재 시스템에 저장된 모든 고객 정보를 엑셀 파일로 다운로드합니다.</p>
                                    <Button onClick={handleDownloadData} disabled={loading} className="w-full">고객 정보 엑셀 다운로드</Button>
                                </div>
                                <div>
                                    <Label>매출 데이터 재정산</Label>
                                    <p className="text-sm text-gray-500 mb-2">데이터 오류 시 모든 고객 정보를 기반으로 전체 매출 내역을 다시 계산합니다.</p>
                                    <Button onClick={handleRebuildTransactions} disabled={isProcessing} variant="destructive" className="w-full">모든 고객 매출 재정산</Button>
                                </div>
                                {isProcessing && (<div className="space-y-2 mt-4"><p>처리 중... ({progress}%)</p><Progress value={progress} className="w-full" /></div>)}
                            </div>
                        </SettingsTab>
                    </div>
                    <div className="space-y-8">
                        <SettingsTab title="상품 관리">
                            <div className="space-y-4"><Button onClick={() => openProductDialog()}>새 상품 추가</Button>
                                <Table><TableHeader><TableRow><TableHead>상품명</TableHead><TableHead>가격</TableHead><TableHead>작업</TableHead></TableRow></TableHeader>
                                    <TableBody>{products.map(p => (<TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>₩{Number(p.price).toLocaleString()}</TableCell><TableCell className="space-x-2"><Button variant="outline" size="sm" onClick={() => openProductDialog(p)}>수정</Button><Button variant="destructive" size="sm" onClick={() => handleDelete('products', p.id)}>삭제</Button></TableCell></TableRow>))}</TableBody>
                                </Table>
                            </div>
                        </SettingsTab>
                        <SettingsTab title="촬영 유형 관리">
                            <div className="space-y-4"><Button onClick={() => openFilmingTypeDialog()}>새 촬영 유형 추가</Button>
                                <Table><TableHeader><TableRow><TableHead>유형명</TableHead><TableHead>가격</TableHead><TableHead>작업</TableHead></TableRow></TableHeader>
                                    <TableBody>{filmingTypes.map(ft => (<TableRow key={ft.id}><TableCell>{ft.name}</TableCell><TableCell>₩{Number(ft.price).toLocaleString()}</TableCell><TableCell className="space-x-2"><Button variant="outline" size="sm" onClick={() => openFilmingTypeDialog(ft)}>수정</Button><Button variant="destructive" size="sm" onClick={() => handleDelete('filming_types', ft.id)}>삭제</Button></TableCell></TableRow>))}</TableBody>
                                </Table>
                            </div>
                        </SettingsTab>
                    </div>
                </div>
            </motion.div>

            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>{editingProduct ? '상품 수정' : '새 상품 추가'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleProductSave} className="space-y-4">
                        <div><Label htmlFor="productName">상품명</Label><Input id="productName" value={productFormData.name} onChange={e => setProductFormData({...productFormData, name: e.target.value})} required/></div>
                        <div><Label htmlFor="productPrice">가격</Label><Input id="productPrice" type="number" value={productFormData.price} onChange={e => setProductFormData({...productFormData, price: e.target.value})} required/></div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>취소</Button><Button type="submit">저장</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isFilmingTypeDialogOpen} onOpenChange={setIsFilmingTypeDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>{editingFilmingType ? '촬영 유형 수정' : '새 촬영 유형 추가'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleFilmingTypeSave} className="space-y-4">
                        <div><Label htmlFor="filmingTypeName">유형명</Label><Input id="filmingTypeName" value={filmingTypeFormData.name} onChange={e => setFilmingTypeFormData({...filmingTypeFormData, name: e.target.value})} required/></div>
                        <div><Label htmlFor="filmingTypePrice">가격</Label><Input id="filmingTypePrice" type="number" value={filmingTypeFormData.price} onChange={e => setFilmingTypeFormData({...filmingTypeFormData, price: e.target.value})} required/></div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setIsFilmingTypeDialogOpen(false)}>취소</Button><Button type="submit">저장</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}