"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Clock, MessageCircle, ArrowLeft } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const features = [
    {
      icon: Calendar,
      title: "إدارة المواعيد",
      description: "حجز وإدارة المواعيد بسهولة مع إشعارات تلقائية",
    },
    {
      icon: Users,
      title: "ملفات المرضى",
      description: "حفظ سجلات المرضى والمتابعة بشكل منظم",
    },
    {
      icon: Clock,
      title: "قائمة الانتظار",
      description: "إدارة قائمة الانتظار وملء المواعيد الملغاة تلقائياً",
    },
    {
      icon: MessageCircle,
      title: "واتساب متكامل",
      description: "إرسال تذكيرات وتأكيدات عبر واتساب",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">J</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">JoClinicsFlows</h1>
            </div>
            <Button onClick={() => router.push("/login")}>
              تسجيل الدخول
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            نظام إدارة العيادات الذكي
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            حل متكامل لإدارة مواعيد العيادات والمراكز التجميلية مع تذكيرات واتساب 
            وإدارة قائمة الانتظار
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={() => router.push("/login")}>
              ابدأ الآن
              <ArrowLeft className="mr-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500">
            © 2026 JoClinicsFlows. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
