import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Users, ClipboardList, BarChart3, UserPlus } from "lucide-react";
import { useState } from "react";
import { ROLE_LABELS, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@shared/constants";
import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "../../../server/routers";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Employees() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showEvalDialog, setShowEvalDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);

  const { data: employees } = trpc.employees.list.useQuery();
  const { data: tasks } = trpc.employees.tasks.useQuery({});
  const { data: evaluations } = trpc.employees.evaluations.useQuery({});
  const utils = trpc.useUtils();

  const updateRole = trpc.employees.updateRole.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("تم تحديث الدور"); },
    onError: (err) => toast.error(err.message),
  });
  const updateStatus = trpc.employees.updateStatus.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("تم تحديث حالة المستخدم"); },
    onError: (err) => toast.error(err.message),
  });

  const createTask = trpc.employees.createTask.useMutation({
    onSuccess: () => { utils.employees.tasks.invalidate(); setShowTaskDialog(false); toast.success("تم إنشاء المهمة"); },
    onError: (err) => toast.error(err.message),
  });

  const updateTask = trpc.employees.updateTask.useMutation({
    onSuccess: () => { utils.employees.tasks.invalidate(); toast.success("تم تحديث المهمة"); },
    onError: (err) => toast.error(err.message),
  });

  const createEval = trpc.employees.createEvaluation.useMutation({
    onSuccess: () => { utils.employees.evaluations.invalidate(); setShowEvalDialog(false); toast.success("تم حفظ التقييم"); },
    onError: (err) => toast.error(err.message),
  });

  const inviteUser = trpc.employees.createUser.useMutation({
    onSuccess: () => {
      utils.employees.list.invalidate();
      setShowUserDialog(false);
      setUserForm({ name: "", email: "", role: "user" });
      toast.success("تمت إضافة المستخدم بنجاح");
    },
    onError: (err: TRPCClientErrorLike<AppRouter>) => toast.error(err.message),
  });

  const [taskForm, setTaskForm] = useState({ employeeId: 0, taskType: "", description: "", quantity: 0, ratePerUnit: "0" });
  const [evalForm, setEvalForm] = useState({ employeeId: 0, period: "", qualityScore: 5, speedScore: 5, attendanceScore: 5, teamworkScore: 5, notes: "" });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "sales" | "production" | "designer" | "technician" | "user",
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">إدارة الموظفين</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{employees?.length || 0} موظف</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 flex-1 sm:flex-none" disabled={!isAdmin}>
                <UserPlus className="w-4 h-4" />
                إضافة مستخدم
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">إضافة مستخدم جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>الاسم</Label>
                  <Input
                    className="mt-1"
                    value={userForm.name}
                    onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="اسم المستخدم"
                  />
                </div>
                <div>
                  <Label>البريد الإلكتروني *</Label>
                  <Input
                    type="email"
                    className="mt-1"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="example@domain.com"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>الدور</Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(v: "admin" | "sales" | "production" | "designer" | "technician" | "user") =>
                      setUserForm((p) => ({ ...p, role: v }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  بعد الإضافة، يجب على المستخدم تسجيل الدخول بنفس البريد الإلكتروني ليتم ربط حسابه تلقائيًا.
                </p>
                <Button
                  onClick={() => {
                    if (!userForm.email.trim()) {
                      toast.error("يرجى إدخال البريد الإلكتروني");
                      return;
                    }
                    if (!isAdmin) {
                      toast.error("فقط المدير العام يمكنه إضافة المستخدمين");
                      return;
                    }
                    inviteUser.mutate({
                      email: userForm.email,
                      name: userForm.name || undefined,
                      role: userForm.role,
                    });
                  }}
                  className="w-full"
                  disabled={inviteUser.isPending}
                >
                  {inviteUser.isPending ? "جاري الإضافة..." : "إضافة المستخدم"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">إضافة المستخدمين متاحة للمدير العام فقط</p>
          )}
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-none"><ClipboardList className="w-4 h-4" />مهمة جديدة</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">إنشاء مهمة</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>الموظف *</Label>
                  <Select onValueChange={(v) => setTaskForm((p) => ({ ...p, employeeId: Number(v) }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>{(employees || []).map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.name || e.email || `#${e.id}`}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label>نوع المهمة</Label><Input className="mt-1" value={taskForm.taskType} onChange={(e) => setTaskForm((p) => ({ ...p, taskType: e.target.value }))} placeholder="مثال: تجليد / تقطيع / لصق" /></div>
                <div><Label>الوصف</Label><Textarea className="mt-1" value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>الكمية</Label><Input type="number" className="mt-1" value={taskForm.quantity} onChange={(e) => setTaskForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
                  <div><Label>سعر الوحدة (ر.س)</Label><Input type="number" step="0.01" className="mt-1" value={taskForm.ratePerUnit} onChange={(e) => setTaskForm((p) => ({ ...p, ratePerUnit: e.target.value }))} /></div>
                </div>
                <Button onClick={() => {
                  if (!taskForm.employeeId || !taskForm.taskType) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
                  createTask.mutate(taskForm);
                }} className="w-full" disabled={createTask.isPending}>إنشاء المهمة</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showEvalDialog} onOpenChange={setShowEvalDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 flex-1 sm:flex-none"><BarChart3 className="w-4 h-4" />تقييم أداء</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">تقييم أداء الموظف</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>الموظف *</Label>
                    <Select onValueChange={(v) => setEvalForm((p) => ({ ...p, employeeId: Number(v) }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                      <SelectContent>{(employees || []).map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.name || e.email || `#${e.id}`}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>الفترة</Label><Input className="mt-1" value={evalForm.period} onChange={(e) => setEvalForm((p) => ({ ...p, period: e.target.value }))} placeholder="مثال: مارس 2026" /></div>
                </div>
                {[
                  { key: "qualityScore", label: "جودة العمل" },
                  { key: "speedScore", label: "سرعة الإنجاز" },
                  { key: "attendanceScore", label: "الالتزام والحضور" },
                  { key: "teamworkScore", label: "العمل الجماعي" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                    <Label className="text-sm">{label}</Label>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                        <button
                          key={v}
                          onClick={() => setEvalForm((p) => ({ ...p, [key]: v }))}
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded text-[10px] sm:text-xs font-medium transition-colors ${
                            v <= (evalForm as any)[key] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div><Label>ملاحظات</Label><Textarea className="mt-1" value={evalForm.notes} onChange={(e) => setEvalForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
                <Button onClick={() => {
                  if (!evalForm.employeeId || !evalForm.period) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
                  createEval.mutate(evalForm);
                }} className="w-full" disabled={createEval.isPending}>حفظ التقييم</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">الفريق</TabsTrigger>
          <TabsTrigger value="tasks">المهام</TabsTrigger>
          <TabsTrigger value="evaluations">التقييمات</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          {!employees || employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Users className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">لا يوجد موظفين مسجلين</p>
              <p className="text-sm mt-1">سيظهر الموظفون هنا بعد تسجيل الدخول</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {employees.map((emp) => (
                <Card key={emp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{(emp.name || "?").charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{emp.name || "بدون اسم"}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">{emp.email || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Select
                        value={emp.role || "user"}
                        onValueChange={(v: any) => {
                          if (!isAdmin) {
                            toast.error("فقط المدير العام يمكنه تعديل الأدوار");
                            return;
                          }
                          updateRole.mutate({ userId: emp.id, role: v });
                        }}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger className="h-7 text-xs w-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={emp.isActive ?? true}
                          onCheckedChange={(checked) => {
                            if (!isAdmin) {
                              toast.error("فقط المدير العام يمكنه تعديل الحالة");
                              return;
                            }
                            updateStatus.mutate({ userId: emp.id, isActive: checked });
                          }}
                          disabled={!isAdmin || updateStatus.isPending}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {emp.isActive ? "نشط" : "معطل"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {emp.lastSignedIn ? new Date(emp.lastSignedIn).toLocaleDateString("ar-SA") : "-"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          {/* Mobile Task Cards */}
          <div className="space-y-2 sm:hidden">
            {(tasks || []).map((task) => (
              <Card key={task.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.taskType}</p>
                      {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                    </div>
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${TASK_STATUS_COLORS[task.status || "pending"]}`}>
                      {TASK_STATUS_LABELS[task.status || "pending"]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>الكمية: {task.quantity || "-"}</span>
                      <span className="font-medium text-foreground">{Number(task.totalDue || 0).toLocaleString("ar-SA")} ر.س</span>
                    </div>
                    {task.status !== "completed" && task.status !== "cancelled" && (
                      <div className="flex gap-1">
                        {task.status === "pending" && (
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => updateTask.mutate({ id: task.id, status: "in_progress" })}>بدء</Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600" onClick={() => updateTask.mutate({ id: task.id, status: "completed" })}>إكمال</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!tasks || tasks.length === 0) && (
              <div className="text-center py-12 text-muted-foreground text-sm">لا توجد مهام</div>
            )}
          </div>
          {/* Desktop Task Table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">المهمة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الكمية</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">المستحق</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الحالة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tasks || []).map((task) => (
                      <tr key={task.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <p className="text-sm font-medium">{task.taskType}</p>
                          {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                        </td>
                        <td className="p-3 text-sm">{task.quantity || "-"}</td>
                        <td className="p-3 text-sm font-medium">{Number(task.totalDue || 0).toLocaleString("ar-SA")} ر.س</td>
                        <td className="p-3">
                          <Badge variant="secondary" className={`text-[10px] ${TASK_STATUS_COLORS[task.status || "pending"]}`}>
                            {TASK_STATUS_LABELS[task.status || "pending"]}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {task.status !== "completed" && task.status !== "cancelled" && (
                            <div className="flex items-center gap-1">
                              {task.status === "pending" && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateTask.mutate({ id: task.id, status: "in_progress" })}>
                                  بدء
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600" onClick={() => updateTask.mutate({ id: task.id, status: "completed" })}>
                                إكمال
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!tasks || tasks.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground text-sm">لا توجد مهام</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الفترة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الجودة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">السرعة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الحضور</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">العمل الجماعي</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(evaluations || []).map((ev) => (
                      <tr key={ev.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm font-medium">{ev.period}</td>
                        <td className="p-3 text-sm">{ev.qualityScore}/10</td>
                        <td className="p-3 text-sm">{ev.speedScore}/10</td>
                        <td className="p-3 text-sm">{ev.attendanceScore}/10</td>
                        <td className="p-3 text-sm">{ev.teamworkScore}/10</td>
                        <td className="p-3">
                          <Badge variant={ev.overallScore && ev.overallScore >= 7 ? "default" : "secondary"} className="text-xs">
                            {ev.overallScore}/10
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!evaluations || evaluations.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground text-sm">لا توجد تقييمات</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
