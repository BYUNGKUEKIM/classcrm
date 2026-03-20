import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeJobs: 0,
    monthlyRevenue: 0,
    upcomingBookings: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load leads
      const leadsRef = collection(db, 'leads');
      const leadsQuery = query(leadsRef, where('userId', '==', user.uid));
      const leadsSnap = await getDocs(leadsQuery);
      const totalLeads = leadsSnap.size;

      // Load jobs
      const jobsRef = collection(db, 'jobs');
      const jobsQuery = query(jobsRef, where('userId', '==', user.uid), where('status', '==', 'active'));
      const jobsSnap = await getDocs(jobsQuery);
      const activeJobs = jobsSnap.size;

      // Load payments (this month)
      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(paymentsRef, where('userId', '==', user.uid));
      const paymentsSnap = await getDocs(paymentsQuery);
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const monthlyRevenue = paymentsSnap.docs
        .filter(doc => {
          const paymentDate = doc.data().date?.toDate();
          return paymentDate && paymentDate >= monthStart;
        })
        .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      // Load upcoming bookings
      const todayStr = now.toISOString().split('T')[0];
      const upcomingBookings = jobsSnap.docs.filter(doc => {
        const shootDate = doc.data().shootDate;
        return shootDate && shootDate >= todayStr;
      }).length;

      setStats({
        totalLeads,
        activeJobs,
        monthlyRevenue,
        upcomingBookings
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, onClick }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    };

    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-200"
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
              <h3 className="text-3xl font-bold text-gray-900">
                {loading ? '...' : value}
              </h3>
            </div>
            <div className={`p-4 rounded-full ${colorClasses[color]} bg-opacity-10`}>
              <Icon className={`h-8 w-8 text-${color}-500`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const QuickAction = ({ icon: Icon, label, onClick, color = 'blue' }) => {
    return (
      <Button
        onClick={onClick}
        className={`w-full bg-${color}-600 hover:bg-${color}-700 text-white`}
      >
        <Icon className="h-4 w-4 mr-2" />
        {label}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('welcomeMessage')}, {profile?.studioName || 'there'}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                {t('todayActivity')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('totalLeads')}
            value={stats.totalLeads}
            icon={Users}
            color="blue"
            onClick={() => navigate('/leads')}
          />
          <StatCard
            title={t('activeJobs')}
            value={stats.activeJobs}
            icon={Briefcase}
            color="green"
            onClick={() => navigate('/jobs')}
          />
          <StatCard
            title={t('monthlyRevenue')}
            value={`₩${stats.monthlyRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="purple"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            title={t('upcomingShoots')}
            value={stats.upcomingBookings}
            icon={Calendar}
            color="orange"
            onClick={() => navigate('/jobs')}
          />
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <QuickAction
                icon={Plus}
                label={t('newLead')}
                onClick={() => navigate('/leads?action=new')}
                color="blue"
              />
              <QuickAction
                icon={Briefcase}
                label={t('createJob')}
                onClick={() => navigate('/jobs?action=new')}
                color="green"
              />
              <QuickAction
                icon={Users}
                label={t('addClient')}
                onClick={() => navigate('/clients?action=new')}
                color="purple"
              />
              <QuickAction
                icon={DollarSign}
                label={t('recordPayment')}
                onClick={() => navigate('/payments?action=new')}
                color="orange"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('recentActivity')}</span>
                <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
                  {t('viewAll')} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-center text-gray-500 py-8">{t('loading')}</p>
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">{t('noRecentActivity')}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t('noRecentActivity')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('upcomingTasks')}</span>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                  {t('viewAll')} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('noUpcomingTasks')}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {t('allClear')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
