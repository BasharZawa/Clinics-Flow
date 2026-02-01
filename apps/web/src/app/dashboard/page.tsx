"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Users, 
  Clock, 
  MessageCircle, 
  Plus, 
  RefreshCw,
  AlertCircle,
  Phone,
  User,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Types
interface DashboardStats {
  appointments: {
    today: number;
    thisWeek: number;
  };
  waitlist: {
    active: number;
    offered: number;
    total: number;
  };
  whatsapp: {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  };
  patients: {
    newThisMonth: number;
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  patient: {
    full_name: string;
    phone: string;
  };
  service: {
    name_ar: string;
    duration_minutes: number;
  };
  staff: {
    full_name_ar: string;
  };
}

interface WaitlistEntry {
  id: string;
  status: string;
  priority: number;
  patient: {
    full_name: string;
    phone: string;
  };
  service: {
    name_ar: string;
  };
  created_at: string;
}

interface Activity {
  id: string;
  type: 'appointment' | 'whatsapp';
  description: string;
  timestamp: string;
  status: string;
  service?: string;
  phone?: string;
}

interface ChartData {
  appointmentsByDay: { name: string; appointments: number }[];
  whatsappStats: { name: string; value: number; color: string }[];
  servicesDistribution: { name: string; count: number }[];
}

// API client
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

async function fetchDashboard(token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  
  const [statsRes, appointmentsRes, waitlistRes, activitiesRes] = await Promise.all([
    fetch(`${API_URL}/dashboard/stats`, { headers }),
    fetch(`${API_URL}/dashboard/appointments/today`, { headers }),
    fetch(`${API_URL}/dashboard/waitlist/stats`, { headers }),
    fetch(`${API_URL}/dashboard/activities`, { headers }),
  ]);

  const [stats, appointments, waitlist, activities] = await Promise.all([
    statsRes.json(),
    appointmentsRes.json(),
    waitlistRes.json(),
    activitiesRes.json(),
  ]);

  return {
    stats: stats.data,
    appointments: appointments.data,
    waitlist: waitlist.data,
    activities: activities.data,
  };
}

// Generate mock chart data (in production, this would come from API)
function generateChartData(): ChartData {
  const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  
  return {
    appointmentsByDay: days.map(day => ({
      name: day,
      appointments: Math.floor(Math.random() * 20) + 5,
    })),
    whatsappStats: [
      { name: 'تم التسليم', value: 85, color: '#22c55e' },
      { name: 'فشل', value: 10, color: '#ef4444' },
      { name: 'قيد الانتظار', value: 5, color: '#f59e0b' },
    ],
    servicesDistribution: [
      { name: 'كشف عام', count: 45 },
      { name: 'ليزر', count: 30 },
      { name: 'تنظيف بشرة', count: 25 },
      { name: 'حقن', count: 15 },
    ],
  };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlistData, setWaitlistData] = useState<{ counts: any; recentEntries: WaitlistEntry[] } | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chartData, setChartData] = useState<ChartData>(generateChartData());
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token') || '';
      
      if (!token) {
        setError('يرجى تسجيل الدخول أولاً');
        return;
      }

      const data = await fetchDashboard(token);
      setStats(data.stats);
      setAppointments(data.appointments);
      setWaitlistData(data.waitlist);
      setActivities(data.activities);
    } catch (err) {
      setError('حدث خطأ أثناء تحميل البيانات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'sent':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confirmed: 'مؤكد',
      pending: 'معلق',
      cancelled: 'ملغي',
      completed: 'مكتمل',
      delivered: 'تم التسليم',
      sent: 'تم الإرسال',
      failed: 'فشل',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">{error}</p>
          <Button onClick={loadData}>إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
              <p className="text-sm text-gray-500">
                {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ar })}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="w-4 h-4 ml-2" />
                تحديث
              </Button>
              <Button className="gap-2" size="sm">
                <Plus className="w-4 h-4" />
                موعد جديد
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                مواعيد اليوم
              </CardTitle>
              <Calendar className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.appointments.today || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                هذا الأسبوع: {stats?.appointments.thisWeek || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                قائمة الانتظار
              </CardTitle>
              <Clock className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.waitlist.active || 0}</div>
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-orange-600">
                  {stats?.waitlist.offered || 0} معروض
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                واتساب (24 ساعة)
              </CardTitle>
              <MessageCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.whatsapp.delivered || 0}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-green-600">
                  {stats?.whatsapp.deliveryRate || 0}% معدل التسليم
                </span>
                {stats?.whatsapp.failed ? (
                  <span className="text-xs text-red-500">
                    ({stats.whatsapp.failed} فشل)
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                مرضى جدد
              </CardTitle>
              <Users className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.patients.newThisMonth || 0}</div>
              <p className="text-xs text-gray-500 mt-1">هذا الشهر</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Appointments by Day Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                المواعيد خلال الأسبوع
              </CardTitle>
              <CardDescription>عدد المواعيد اليومية خلال آخر 7 أيام</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.appointmentsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Stats Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                حالة الرسائل
              </CardTitle>
              <CardDescription>توزيع حالات رسائل واتساب</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.whatsappStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.whatsappStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {chartData.whatsappStats.map((item) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Distribution */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              توزيع الخدمات
            </CardTitle>
            <CardDescription>أكثر الخدمات طلباً هذا الشهر</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.servicesDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-1/2">
            <TabsTrigger value="appointments">المواعيد</TabsTrigger>
            <TabsTrigger value="waitlist">قائمة الانتظار</TabsTrigger>
            <TabsTrigger value="activities">النشاطات</TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>مواعيد اليوم</CardTitle>
                <CardDescription>
                  إدارة مواعيد العيادة لليوم - {appointments.length} موعد
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد مواعيد لهذا اليوم
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-100 rounded-lg flex flex-col items-center justify-center text-blue-700">
                            <span className="text-xs font-medium">
                              {format(new Date(apt.start_time), 'HH:mm')}
                            </span>
                            <span className="text-xs">
                              {apt.service.duration_minutes}د
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <p className="font-medium">{apt.patient.full_name}</p>
                            </div>
                            <p className="text-sm text-gray-500">{apt.service.name_ar}</p>
                            <p className="text-xs text-gray-400">
                              مع {apt.staff.full_name_ar}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(apt.status)}`}>
                            {getStatusLabel(apt.status)}
                          </span>
                          <Button variant="ghost" size="sm">
                            تفاصيل
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500">النشطة</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {waitlistData?.counts.active || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500">المعروضة</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">
                    {waitlistData?.counts.offered || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500">المكتملة</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {waitlistData?.counts.filled || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500">الإجمالي</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-700">
                    {waitlistData?.counts.total || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>آخر طلبات الانتظار</CardTitle>
                <CardDescription>المرضى في قائمة الانتظار</CardDescription>
              </CardHeader>
              <CardContent>
                {waitlistData?.recentEntries?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد طلبات في قائمة الانتظار
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waitlistData?.recentEntries?.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                            ${entry.priority >= 3 ? 'bg-red-100 text-red-700' : 
                              entry.priority >= 2 ? 'bg-orange-100 text-orange-700' : 
                              'bg-blue-100 text-blue-700'}`}>
                            {entry.priority}
                          </div>
                          <div>
                            <p className="font-medium">{entry.patient.full_name}</p>
                            <p className="text-sm text-gray-500">{entry.service.name_ar}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(entry.status)}`}>
                            {getStatusLabel(entry.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>آخر النشاطات</CardTitle>
                <CardDescription>تتبع آخر الأحداث في النظام</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد نشاطات حديثة
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center
                            ${activity.type === 'appointment' ? 'bg-blue-100 text-blue-600' : 
                              'bg-green-100 text-green-600'}`}>
                            {activity.type === 'appointment' ? <Calendar className="w-5 h-5" /> : 
                              <Phone className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{activity.description}</p>
                            {activity.service && (
                              <p className="text-sm text-gray-500">{activity.service}</p>
                            )}
                            {activity.phone && (
                              <p className="text-sm text-gray-500">{activity.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-left">
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(activity.status)}`}>
                            {getStatusLabel(activity.status)}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(activity.timestamp), 'HH:mm', { locale: ar })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
