import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { format, differenceInDays, parseISO, isBefore, isAfter, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Task {
  id: string;
  taskName: string;
  unit: string;
  responsible: string;
  frequency: string;
  deadline: string;
  actualCompletion: string;
  delayDays: string;
  status: 'ก่อนเวลา' | 'ตรงเวลา' | 'ล่าช้า' | 'รอดำเนินการ';
  remarks: string;
  createdAt: string;
}

const UNITS = [
  'หน่วย 1', 'หน่วย 2', 'หน่วย 3', 'หน่วย 4', 'หน่วย 5', 
  'หน่วย 6', 'หน่วย 7', 'หน่วย 8', 'หน่วย 9', 'หน่วย 10', 'หน่วย 11'
];

const STATUS_COLORS = {
  'ก่อนเวลา': '#10b981',
  'ตรงเวลา': '#3b82f6',
  'ล่าช้า': '#ef4444',
  'รอดำเนินการ': '#f59e0b'
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('ทุกหน่วยงาน');
  const [statusFilter, setStatusFilter] = useState('ทุกสถานะ');

  useEffect(() => {
    fetchTasks();
    logAccess();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถดึงข้อมูลได้');
      }
      
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch tasks', err);
      // Don't alert on initial load to avoid annoying popups if not configured yet
      if (tasks.length > 0) alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const logAccess = async () => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACCESS_APP', details: 'User accessed the application' })
      });
    } catch (err) {
      console.error('Failed to log access', err);
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    const method = editingTask ? 'PUT' : 'POST';
    const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
    
    // Calculate status and delay
    let status: Task['status'] = 'รอดำเนินการ';
    let delayDays = '0';
    
    if (taskData.actualCompletion && taskData.deadline) {
      const actual = parseISO(taskData.actualCompletion);
      const deadline = parseISO(taskData.deadline);
      const diff = differenceInDays(actual, deadline);
      delayDays = diff.toString();
      
      if (diff < 0) status = 'ก่อนเวลา';
      else if (diff === 0) status = 'ตรงเวลา';
      else status = 'ล่าช้า';
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, status, delayDays })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      await fetchTasks();
      setIsModalOpen(false);
      setEditingTask(null);
      alert('บันทึกข้อมูลสำเร็จ');
    } catch (err: any) {
      console.error('Failed to save task', err);
      alert('ไม่สามารถบันทึกได้: ' + err.message + '\n\nกรุณาตรวจสอบว่าได้ตั้งค่า Secrets และ Share Sheet ให้ Service Account เรียบร้อยแล้ว');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('ยืนยันการลบงานนี้?')) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.responsible.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUnit = unitFilter === 'ทุกหน่วยงาน' || task.unit === unitFilter;
      const matchesStatus = statusFilter === 'ทุกสถานะ' || task.status === statusFilter;
      return matchesSearch && matchesUnit && matchesStatus;
    });
  }, [tasks, searchQuery, unitFilter, statusFilter]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'รอดำเนินการ').length;
    const early = tasks.filter(t => t.status === 'ก่อนเวลา').length;
    const onTime = tasks.filter(t => t.status === 'ตรงเวลา').length;
    const delayed = tasks.filter(t => t.status === 'ล่าช้า').length;
    
    return { total, pending, early, onTime, delayed };
  }, [tasks]);

  const chartData = useMemo(() => {
    const last12Months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date()
    });

    return last12Months.map(month => {
      const monthStr = format(month, 'MMM yy', { locale: th });
      const monthTasks = tasks.filter(t => {
        const d = parseISO(t.createdAt);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
      });
      return {
        name: monthStr,
        count: monthTasks.length
      };
    });
  }, [tasks]);

  const pieData = [
    { name: 'ก่อนเวลา', value: stats.early, color: STATUS_COLORS['ก่อนเวลา'] },
    { name: 'ตรงเวลา', value: stats.onTime, color: STATUS_COLORS['ตรงเวลา'] },
    { name: 'ล่าช้า', value: stats.delayed, color: STATUS_COLORS['ล่าช้า'] },
    { name: 'รอดำเนินการ', value: stats.pending, color: STATUS_COLORS['รอดำเนินการ'] },
  ].filter(d => d.value > 0);

  return (
    <div className="flex h-screen bg-[#F8F9FE] font-sans text-[#1A1A1A]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#9333EA] rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <ListTodo size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">TaskTracker</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'dashboard' ? "bg-[#9333EA] text-white shadow-md" : "text-[#6B7280] hover:bg-[#F3F4F6]"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'tasks' ? "bg-[#9333EA] text-white shadow-md" : "text-[#6B7280] hover:bg-[#F3F4F6]"
            )}
          >
            <ListTodo size={20} />
            <span className="font-medium">รายการงาน</span>
          </button>
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="bg-[#F3F4F6] p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#9333EA] font-bold text-sm shadow-sm">
              46
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">ผู้ใช้งาน</p>
              <p className="text-sm font-semibold truncate">ID: 654646</p>
            </div>
          </div>
          <button className="w-full mt-4 flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium">
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">
              {activeTab === 'dashboard' ? 'ภาพรวมการดำเนินงาน' : 'จัดการรายการงาน'}
            </h1>
            <p className="text-[#6B7280] mt-1">
              {activeTab === 'dashboard' ? 'สรุปสถานะงานของทุกหน่วยงาน' : 'เพิ่ม แก้ไข และติดตามสถานะงานรายหน่วย'}
            </p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'tasks' && (
              <button 
                onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                className="bg-[#9333EA] text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-purple-200 hover:bg-[#7E22CE] transition-all active:scale-95"
              >
                <Plus size={20} />
                เพิ่มงานใหม่
              </button>
            )}
            <button className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-[#6B7280] hover:bg-[#F9FAFB] transition-colors shadow-sm">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-5 gap-6">
              <StatCard icon={<TrendingUp />} label="งานทั้งหมด" value={stats.total} unit="รายการ" color="purple" />
              <StatCard icon={<Clock />} label="รอดำเนินการ" value={stats.pending} unit="ยังไม่เสร็จ" color="amber" />
              <StatCard icon={<CheckCircle2 />} label="ก่อนเวลา" value={stats.early} unit="ประสิทธิภาพดี" color="emerald" />
              <StatCard icon={<CheckCircle2 />} label="ตรงเวลา" value={stats.onTime} unit="ตามแผนงาน" color="blue" />
              <StatCard icon={<AlertCircle />} label="ล่าช้า" value={stats.delayed} unit="ต้องเร่งรัด" color="red" />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">แนวโน้มภาระงาน 12 เดือน</h3>
                    <p className="text-sm text-[#6B7280]">เปรียบเทียบงานที่ได้รับมอบหมายและงานที่เสร็จสิ้น</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        cursor={{fill: '#F9FAFB'}}
                      />
                      <Bar dataKey="count" fill="#9333EA" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">สัดส่วนสถานะงาน</h3>
                    <p className="text-sm text-[#6B7280]">ภาพรวมทั้งหมด</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}} />
                        <span className="text-[#6B7280]">{item.name}</span>
                      </div>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            {/* Filters */}
            <div className="p-6 border-b border-[#E5E7EB] space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่องาน, ผู้รับผิดชอบ, หน่วยงาน หรือขั้นตอน..."
                  className="w-full pl-12 pr-4 py-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 ml-1">หน่วยงาน</label>
                  <select 
                    className="w-full p-3 bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                  >
                    <option>ทุกหน่วยงาน</option>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 ml-1">สถานะ</label>
                  <select 
                    className="w-full p-3 bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option>ทุกสถานะ</option>
                    <option>รอดำเนินการ</option>
                    <option>ก่อนเวลา</option>
                    <option>ตรงเวลา</option>
                    <option>ล่าช้า</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[#6B7280] text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ชื่องาน / หน่วยงาน</th>
                    <th className="px-6 py-4">ผู้รับผิดชอบ / ความถี่</th>
                    <th className="px-6 py-4">กำหนดเสร็จ</th>
                    <th className="px-6 py-4">ทำเสร็จจริง</th>
                    <th className="px-6 py-4">ช้า/เร็ว (วัน)</th>
                    <th className="px-6 py-4 text-center">สถานะ</th>
                    <th className="px-6 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-20 text-[#6B7280]">กำลังโหลดข้อมูล...</td></tr>
                  ) : filteredTasks.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-20 text-[#6B7280]">ไม่พบข้อมูลรายการงาน</td></tr>
                  ) : filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-bold text-[#1A1A1A]">{task.taskName}</p>
                        <p className="text-xs text-[#6B7280] mt-1">{task.unit}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-medium">{task.responsible}</p>
                        <p className="text-xs text-[#6B7280] mt-1">{task.frequency}</p>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium">
                        {task.deadline ? format(parseISO(task.deadline), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-6 py-5 text-sm font-medium">
                        {task.actualCompletion ? format(parseISO(task.actualCompletion), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-6 py-5 text-sm font-bold">
                        <span className={cn(
                          Number(task.delayDays) > 0 ? "text-red-500" : 
                          Number(task.delayDays) < 0 ? "text-emerald-500" : "text-blue-500"
                        )}>
                          {task.delayDays || '0'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            task.status === 'ก่อนเวลา' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            task.status === 'ตรงเวลา' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            task.status === 'ล่าช้า' ? "bg-red-50 text-red-600 border-red-100" :
                            "bg-amber-50 text-amber-600 border-amber-100"
                          )}>
                            {task.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                            className="p-2 text-[#6B7280] hover:text-[#9333EA] hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 text-[#6B7280] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Placeholder */}
            <div className="p-6 bg-[#F9FAFB] flex justify-between items-center text-sm text-[#6B7280]">
              <p>แสดง {filteredTasks.length} รายการ</p>
              <div className="flex gap-2">
                <button className="p-2 border border-[#E5E7EB] rounded-lg bg-white hover:bg-[#F3F4F6] disabled:opacity-50" disabled><ChevronLeft size={16}/></button>
                <button className="p-2 border border-[#E5E7EB] rounded-lg bg-white hover:bg-[#F3F4F6] disabled:opacity-50" disabled><ChevronRight size={16}/></button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[#E5E7EB] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1A1A1A] rounded-2xl flex items-center justify-center text-white">
                    <ListTodo size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{editingTask ? 'แก้ไขรายการงาน' : 'เพิ่มรายการงานใหม่'}</h2>
                    <p className="text-[#6B7280] text-sm">สร้างงานใหม่จากข้อมูลเดิมเพื่อเริ่มขั้นตอนถัดไป</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSaveTask(Object.fromEntries(formData.entries()));
              }} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    <ListTodo size={14} /> ชื่องาน
                  </label>
                  <input 
                    name="taskName"
                    defaultValue={editingTask?.taskName}
                    required
                    placeholder="เช่น ตรวจสอบระบบไฟฟ้าประจำเดือน..."
                    className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    <Filter size={14} /> หน่วยงานที่รับผิดชอบ
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {UNITS.map(u => (
                      <label key={u} className="relative cursor-pointer group">
                        <input 
                          type="radio" 
                          name="unit" 
                          value={u} 
                          defaultChecked={editingTask?.unit === u}
                          required
                          className="peer sr-only" 
                        />
                        <div className="p-3 text-center text-sm font-medium border border-[#E5E7EB] rounded-xl peer-checked:bg-[#1A1A1A] peer-checked:text-white peer-checked:border-[#1A1A1A] hover:bg-[#F9FAFB] transition-all">
                          {u}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      ผู้รับผิดชอบ
                    </label>
                    <input 
                      name="responsible"
                      defaultValue={editingTask?.responsible}
                      required
                      placeholder="ระบุชื่อ-นามสกุล"
                      className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      ความถี่
                    </label>
                    <select 
                      name="frequency"
                      defaultValue={editingTask?.frequency || 'ทุกเดือน'}
                      className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option>ทุกวัน</option>
                      <option>ทุกสัปดาห์</option>
                      <option>ทุกเดือน</option>
                      <option>รายไตรมาส</option>
                      <option>รายปี</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      <Calendar size={14} /> กำหนดแล้วเสร็จ
                    </label>
                    <input 
                      type="date"
                      name="deadline"
                      defaultValue={editingTask?.deadline}
                      required
                      className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      <CheckCircle2 size={14} /> ทำเสร็จจริง
                    </label>
                    <input 
                      type="date"
                      name="actualCompletion"
                      defaultValue={editingTask?.actualCompletion}
                      className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    หมายเหตุ
                  </label>
                  <textarea 
                    name="remarks"
                    defaultValue={editingTask?.remarks}
                    rows={3}
                    placeholder="ระบุข้อมูลเพิ่มเติม..."
                    className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-[#6B7280] font-bold hover:bg-[#F3F4F6] rounded-2xl transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-[#1A1A1A] text-white font-bold rounded-2xl shadow-xl shadow-gray-200 hover:bg-black transition-all active:scale-95"
                  >
                    ยืนยันการส่งต่อ / บันทึก
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, unit, color }: { icon: React.ReactNode, label: string, value: number, unit: string, color: 'purple' | 'amber' | 'emerald' | 'blue' | 'red' }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E5E7EB] flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          {React.cloneElement(icon as React.ReactElement, { size: 20 })}
        </div>
        <span className="text-sm font-medium text-[#6B7280]">{label}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tight">{value}</span>
          <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">{unit}</span>
        </div>
      </div>
    </div>
  );
}
