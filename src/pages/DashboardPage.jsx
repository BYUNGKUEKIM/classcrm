import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { 
  Users, Calendar, DollarSign, TrendingUp, 
  Camera, Bell, Clock, Star, ArrowUp, ArrowDown,
  Plus, CheckCircle, AlertCircle, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { format, startOfMonth, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    todayBookings: 0,
    upcomingBookings: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    totalPhotos: 0,
    pendingSelections: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const monthStart = startOfMonth(today);
      const lastMonthStart = startOfMonth(subDays(monthStart, 1));

      // 고객 통계
      const customersRef = collection(db, 'customers');
      const customersQuery = query(customersRef, where('userId', '==', user.uid));
      const customersSnap = await getDocs(customersQuery);
      
      const totalCustomers = customersSnap.size;
      const newCustomers = customersSnap.docs.filter(doc => {
        const created = doc.data().createdAt?.toDate();
        return created && created >= monthStart;
      }).length;

      // 예약 통계
      const bookingsRef = collection(db, 'bookings');
      const todayBookingsQuery = query(
        bookingsRef, 
        where('userId', '==', user.uid),
        where('booking_date', '>=', todayStr)
      );
      const bookingsSnap = await getDocs(todayBookingsQuery);
      
      const todayBookings = bookingsSnap.docs.filter(doc => 
        doc.data().booking_date === todayStr
      ).length;
      
      const upcomingBookings = bookingsSnap.size;

      // 매출 통계
      const transactionsRef = collection(db, 'transactions');
      const currentMonthQuery = query(
        transactionsRef,
        where('userId', '==', user.uid),
        where('type', '==', 'income'),
        where('date', '>=', monthStart)
      );
      const currentMonthSnap = await getDocs(currentMonthQuery);
      
      const monthlyRevenue = currentMonthSnap.docs.reduce((sum, doc) => {
        return sum + (parseFloat(doc.data().amount) || 0);
      }, 0);

      // 지난달 매출
      const lastMonthQuery = query(
        transactionsRef,
        where('userId', '==', user.uid),
        where('type', '==', 'income'),
        where('date', '>=', lastMonthStart),
        where('date', '<', monthStart)
      );
      const lastMonthSnap = await getDocs(lastMonthQuery);
      
      const lastMonthRevenue = lastMonthSnap.docs.reduce((sum, doc) => {
        return sum + (parseFloat(doc.data().amount) || 0);
      }, 0);

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      // 최근 활동
      const recentBookingsQuery = query(
        bookingsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentBookingsSnap = await getDocs(recentBookingsQuery);
      
      const activities = recentBookingsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'booking',
          title: `${data.customerName || '고객'}님 예약`,
          description: `${data.filmingType || '촬영'} - ${data.booking_date}`,
          time: data.createdAt?.toDate(),
          icon: Calendar,
          color: 'blue'
        };
      });

      setRecentActivity(activities);

      // 다가오는 이벤트
      const upcomingQuery = query(
        bookingsRef,
        where('userId', '==', user.uid),
        where('booking_date', '>=', todayStr),
        orderBy('booking_date', 'asc'),
        limit(5)
      );
      const upcomingSnap = await getDocs(upcomingQuery);
      
      const events = upcomingSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          customerName: data.customerName || '고객',
          date: data.booking_date,
          time: data.booking_time || '시간 미정',
          type: data.filmingType || '촬영'
        };
      });

      setUpcomingEvents(events);

      setStats({
        totalCustomers,
        newCustomers,
        todayBookings,
        upcomingBookings,
        monthlyRevenue,
        revenueGrowth,
        totalPhotos: 0, // TODO: 갤러리 연동
        pendingSelections: 0 // TODO: 고객 선택 대기
      });

    } catch(error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const StatCard = ({ title, value, change, icon: Icon, color, trend, linkTo }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600'
    };

    return (
      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => linkTo && navigate(linkTo)}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <h3 className="text-3xl font-bold mt-2">{value}</h3>
              {change !== undefined && (
                <div className="flex items-center mt-2">
                  {trend === 'up' ? (
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(change).toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">전월 대비</span>
                </div>
              )}
            </div>
            <div className={`p-4 rounded-full ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const QuickAction = ({ icon: Icon, label, onClick, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500 hover:bg-blue-600',
      green: 'bg-green-500 hover:bg-green-600',
      purple: 'bg-purple-500 hover:bg-purple-600'
    };

    return (
      <Button
        onClick={onClick}
        className={`${colorClasses[color]} text-white flex items-center gap-2`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    );
  };

  return (
    <>
      <Helmet>
        <title>대시보드 - 포토스튜디오 CRM</title>
        <meta name="description" content="포토스튜디오 고객관리 시스템 대시보드" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              👋 환영합니다!
            </h1>
            <p className="text-gray-600 mt-1">
              {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}
            </p>
          </div>
          <div className="flex gap-2">
            <QuickAction 
              icon={Plus} 
              label="새 예약" 
              onClick={() => navigate('/bookings')}
              color="blue"
            />
            <QuickAction 
              icon={Users} 
              label="고객 추가" 
              onClick={() => navigate('/customers')}
              color="green"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="총 고객" 
            value={loading ? '...' : stats.totalCustomers}
            change={stats.newCustomers}
            icon={Users} 
            color="blue"
            linkTo="/customers"
          />
          <StatCard 
            title="오늘 예약" 
            value={loading ? '...' : stats.todayBookings}
            icon={Calendar} 
            color="green"
            linkTo="/bookings"
          />
          <StatCard 
            title="이번 달 매출" 
            value={loading ? '...' : `₩${stats.monthlyRevenue.toLocaleString()}`}
            change={stats.revenueGrowth}
            trend={stats.revenueGrowth >= 0 ? 'up' : 'down'}
            icon={DollarSign} 
            color="purple"
            linkTo="/finance"
          />
          <StatCard 
            title="다가오는 예약" 
            value={loading ? '...' : stats.upcomingBookings}
            icon={Clock} 
            color="orange"
            linkTo="/bookings"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                최근 활동
              </CardTitle>
              <CardDescription>최근 예약 및 고객 활동</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className={`p-2 rounded-full bg-${activity.color}-50`}>
                        <activity.icon className={`h-4 w-4 text-${activity.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.time && format(activity.time, 'M월 d일 HH:mm', { locale: ko })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  최근 활동이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                다가오는 일정
              </CardTitle>
              <CardDescription>예정된 촬영</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div 
                      key={event.id}
                      className="p-3 border rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => navigate('/bookings')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{event.customerName}</span>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  예정된 일정이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/gallery')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-full">
                  <Camera className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">갤러리 관리</h3>
                  <p className="text-sm text-gray-600">사진 업로드 및 관리</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/finance')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">재무 리포트</h3>
                  <p className="text-sm text-gray-600">수입 및 지출 관리</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/settings')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-full">
                  <Star className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">고객 리뷰</h3>
                  <p className="text-sm text-gray-600">리뷰 및 평가 관리</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
