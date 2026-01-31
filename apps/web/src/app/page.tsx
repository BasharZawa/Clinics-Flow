import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Clock, MessageCircle, TrendingUp, Plus } from "lucide-react";

export default function Dashboard() {
  const stats = [
    { title: "مواعيد اليوم", value: "12", icon: Calendar, change: "+2 من الأمس" },
    { title: "المرضى الجدد", value: "5", icon: Users, change: "هذا الشهر" },
    { title: "في الانتظار", value: "3", icon: Clock, change: "يحتاجون تأكيد" },
    { title: "رسائل واتساب", value: "48", icon: MessageCircle, change: "تم إرسالها" },
  ];

  const appointments = [
    { id: 1, patient: "أحمد محمد", service: "كشف عام", time: "10:00", status: "confirmed" },
    { id: 2, patient: "سارة علي", service: "تنظيف بشرة", time: "11:30", status: "pending" },
    { id: 3, patient: "محمد خالد", service: "ليزر", time: "14:00", status: "confirmed" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JoClinicsFlows</h1>
              <p className="text-sm text-gray-500">نظام إدارة العيادات</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">الإعدادات</Button>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                موعد جديد
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.title}
                </CardTitle>
                <stat.icon className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-green-600 mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-1/2">
            <TabsTrigger value="appointments">المواعيد</TabsTrigger>
            <TabsTrigger value="patients">المرضى</TabsTrigger>
            <TabsTrigger value="calendar">التقويم</TabsTrigger>
            <TabsTrigger value="reports">التقارير</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>مواعيد اليوم</CardTitle>
                <CardDescription>إدارة مواعيد العيادة لليوم</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {apt.time}
                        </div>
                        <div>
                          <p className="font-medium">{apt.patient}</p>
                          <p className="text-sm text-gray-500">{apt.service}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            apt.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {apt.status === "confirmed" ? "مؤكد" : "معلق"}
                        </span>
                        <Button variant="ghost" size="sm">
                          تفاصيل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle>قائمة المرضى</CardTitle>
                <CardDescription>إدارة ملفات المرضى</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  سيتم إضافة قائمة المرضى هنا
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>التقويم</CardTitle>
                <CardDescription>عرض المواعيد بالتقويم</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  سيتم إضافة التقويم هنا
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>التقارير</CardTitle>
                <CardDescription>إحصائيات وتحليلات</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">الإشغال الشهري</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-green-500" />
                        <span className="text-2xl font-bold">85%</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">الغيابات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-500">5%</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
