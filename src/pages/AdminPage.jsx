import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const statusColors = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
};

const subscriptionColors = {
    trial: 'bg-blue-100 text-blue-800',
    basic: 'bg-purple-100 text-purple-800',
    premium: 'bg-indigo-100 text-indigo-800',
    expired: 'bg-red-100 text-red-800',
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile: adminProfile } = useAuth();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users');

      if (error) {
        throw error;
      }
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        variant: 'destructive',
        title: '사용자 정보 로딩 실패',
        description: '사용자 목록을 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
      toast({ title: '사용자 상태가 변경되었습니다.' });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        variant: 'destructive',
        title: '상태 변경 실패',
        description: '사용자 상태를 업데이트하는 중 오류가 발생했습니다.',
      });
    }
  };
  
  const handleSubscriptionChange = async (userId, newSubscription) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ subscription_plan: newSubscription })
            .eq('id', userId);

        if (error) throw error;

        setUsers(prevUsers =>
            prevUsers.map(user =>
                user.id === userId ? { ...user, subscription_plan: newSubscription } : user
            )
        );
        toast({ title: '구독 상태가 변경되었습니다.' });
    } catch (error) {
        console.error('Error updating subscription:', error);
        toast({
            variant: 'destructive',
            title: '구독 변경 실패',
            description: '구독 상태를 업데이트하는 중 오류가 발생했습니다.',
        });
    }
  };

  const handleDeleteUser = async (userId) => {
      if (window.confirm('정말 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
          try {
              const { error } = await supabase.rpc('delete_user_by_id', { user_id_to_delete: userId });
              if (error) throw error;
              
              setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
              toast({ title: '사용자 삭제 완료', variant: 'destructive' });
          } catch (error) {
              console.error('Error deleting user:', error);
              toast({
                  variant: 'destructive',
                  title: '삭제 실패',
                  description: '사용자를 삭제하는 중 오류가 발생했습니다.',
              });
          }
      }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <>
      <Helmet>
        <title>관리자 페이지 - 포토스튜디오 CRM</title>
        <meta name="description" content="사용자 및 시스템 관리" />
      </Helmet>

      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>스튜디오 이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>계정 상태</TableHead>
                <TableHead>구독</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                  <TableCell className="font-medium">{user.studio_name || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Select 
                      value={user.status} 
                      onValueChange={(value) => handleStatusChange(user.id, value)}
                      disabled={user.id === adminProfile?.id}
                    >
                      <SelectTrigger className={`w-28 h-8 text-xs ${statusColors[user.status] || ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">활성</SelectItem>
                        <SelectItem value="suspended">정지</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                   <TableCell>
                    <Select 
                      value={user.subscription_plan} 
                      onValueChange={(value) => handleSubscriptionChange(user.id, value)}
                    >
                      <SelectTrigger className={`w-28 h-8 text-xs ${subscriptionColors[user.subscription_plan] || ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">평가판</SelectItem>
                        <SelectItem value="basic">베이직</SelectItem>
                        <SelectItem value="premium">프리미엄</SelectItem>
                        <SelectItem value="expired">만료</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">메뉴 열기</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast({ title: '🚧 기능 준비 중' })}>
                          세부 정보 보기
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="text-red-500 focus:text-red-500 focus:bg-red-50"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === adminProfile?.id}
                        >
                          사용자 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}