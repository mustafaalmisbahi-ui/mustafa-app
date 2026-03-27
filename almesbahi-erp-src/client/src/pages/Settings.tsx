import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Building, Palette, Shield, Database, Bell } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold font-heading">الإعدادات</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">إعدادات النظام والتخصيص</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10">
                <Building className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">بيانات المؤسسة</h3>
                <p className="text-sm text-muted-foreground">المصباحي للطباعة والتغليف</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">طباعة أوفست</Badge>
                  <Badge variant="secondary" className="text-xs">تغليف</Badge>
                  <Badge variant="secondary" className="text-xs">تصميم</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-violet-100 dark:bg-violet-950/30">
                <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">المظهر والتخصيص</h3>
                <p className="text-sm text-muted-foreground">الثيم الداكن مفعّل مع دعم RTL</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">عربي</Badge>
                  <Badge variant="outline" className="text-xs">RTL</Badge>
                  <Badge variant="outline" className="text-xs">داكن</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/30">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">الأمان والصلاحيات</h3>
                <p className="text-sm text-muted-foreground">نظام صلاحيات متعدد المستويات</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">مدير عام</Badge>
                  <Badge variant="secondary" className="text-xs">منسق مبيعات</Badge>
                  <Badge variant="secondary" className="text-xs">منسق إنتاج</Badge>
                  <Badge variant="secondary" className="text-xs">مصمم</Badge>
                  <Badge variant="secondary" className="text-xs">فني</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-blue-100 dark:bg-blue-950/30">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">قاعدة البيانات</h3>
                <p className="text-sm text-muted-foreground">TiDB Cloud - متصلة</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">متصل</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-100 dark:bg-amber-950/30">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">الإشعارات</h3>
                <p className="text-sm text-muted-foreground">إشعارات النظام والتنبيهات</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">تنبيه المخزون</Badge>
                  <Badge variant="secondary" className="text-xs">تأخر الطلبات</Badge>
                  <Badge variant="secondary" className="text-xs">فواتير متأخرة</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
                <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">النظام</h3>
                <p className="text-sm text-muted-foreground">إصدار 1.0.0</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">React 19</Badge>
                  <Badge variant="outline" className="text-xs">tRPC 11</Badge>
                  <Badge variant="outline" className="text-xs">Tailwind 4</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
