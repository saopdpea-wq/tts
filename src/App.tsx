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
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Hash,
  Download,
  Bell,
  AlertTriangle,
  Sun,
  Check,
  Circle,
  CalendarRange
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
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
  subUnit?: string; // Added for Department Roles
  responsible: string;
  frequency: string;
  taskType: string;
  progress: string;
  deadline: string;
  actualCompletion: string;
  delayDays: string;
  status: 'ก่อนเวลา' | 'ตรงเวลา' | 'ล่าช้า' | 'รอดำเนินการ';
  remarks: string;
  attachments?: string;
  groupId?: string;
  createdAt: string;
}

const UNITS = [
  'หน่วย 1', 'หน่วย 2', 'หน่วย 3', 'หน่วย 4', 'หน่วย 5', 
  'หน่วย 6', 'หน่วย 7', 'หน่วย 17', 'หน่วย 19', 'หน่วย 20', 'หน่วย 21'
];

const DEPARTMENT_ROLES = ['หผ.', 'ชผ.', 'เบียร์', 'เอ', 'เอและเบียร์'];

const STATIONS = [
  'แผนก',
  'สถานีไฟฟ้าท่าทราย 1 (จุดจ่ายไฟชั่วคราว)',
  'สถานีไฟฟ้าบางปลา',
  'สถานีไฟฟ้าสมุทรสาคร 2',
  'สถานีไฟฟ้าท่าทราย 2 (ชั่วคราว)',
  'สถานีไฟฟ้าสมุทรสาคร 16',
  'สถานีไฟฟ้าสมุทรสาคร 16 (ชั่วคราว)',
  'สถานีไฟฟ้ากระทุ่มแบน 2',
  'สถานีไฟฟ้ากระทุ่มแบน 1',
  'สถานีไฟฟ้าสมุทรสาคร 10',
  'สถานีไฟฟ้ากระทุ่มแบน 6',
  'สถานีไฟฟ้ากระทุ่มแบน 6 (ชั่วคราว)',
  'สถานีไฟฟ้าสมุทรสาคร 10 (ชั่วคราว)',
  'สถานีไฟฟ้าสมุทรสาคร 7',
  'สถานีไฟฟ้าสมุทรสาคร 1',
  'สถานีไฟฟ้าสมุทรสาคร 9',
  'สถานีไฟฟ้าสมุทรสาคร 12 (ชั่วคราว)',
  'สถานีไฟฟ้าสมุทรสาคร 17 (ชั่วคราว)',
  'สถานีไฟฟ้าสมุทรสาคร 3',
  'สถานีไฟฟ้าศาลายา',
  'สถานีไฟฟ้าพุทธมณฑล 2',
  'สถานีไฟฟ้าพุทธมณฑล 3',
  'สถานีไฟฟ้าอู่ทอง 1',
  'สถานีไฟฟ้าสองพี่น้อง 1',
  'สถานีไฟฟ้าสองพี่น้อง 2',
  'สถานีไฟฟ้าอู่ทอง 2 (ชั่วคราว)',
  'สถานีไฟฟ้าสุพรรณบุรี 1',
  'สถานีไฟฟ้าบางปลาม้า',
  'สถานีไฟฟ้าสุพรรณบุรี 2',
  'สถานีไฟฟ้าด่านช้าง',
  'สถานีไฟฟ้าเลาขวัญ',
  'สถานีไฟฟ้าเดิมบางนางบวช',
  'สถานีไฟฟ้าบางเลน 1',
  'สถานีไฟฟ้าดอนตูม',
  'สถานีไฟฟ้ากำแพงแสน',
  'สถานีไฟฟ้าบางเลน 3 (ชั่วคราว)',
  'สถานีไฟฟ้านครชัยศรี 1',
  'สถานีไฟฟ้านครชัยศรี 2',
  'สถานีไฟฟ้าสามพราน 3',
  'สถานีไฟฟ้าดอนเจดีย์',
  'สถานีไฟฟ้าสามชุก',
  'สถานีไฟฟ้าศรีประจันต์ (ชั่วคราว)',
  'สถานีไฟฟ้าสมุทรสาคร 5',
  'สถานีไฟฟ้าบ้านแพ้ว',
  'สถานีไฟฟ้าบ้านแพ้ว 2'
];

const TASK_TYPES = [
  'งาน routine',
  'งานสำคัญที่ต้องทำทันที เร่งด่วน',
  'งานสำคัญที่ต้องวางแผน ไม่เร่งด่วน',
  'งานที่มอบหมาย ไม่เร่งด่วน'
];

const STATUSES = [
  'ก่อนเวลา',
  'ตรงเวลา',
  'ล่าช้า',
  'รอดำเนินการ'
];

const STATUS_COLORS = {
  'ก่อนเวลา': '#10b981',
  'ตรงเวลา': '#3b82f6',
  'ล่าช้า': '#ef4444',
  'รอดำเนินการ': '#f59e0b'
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'overdue'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialForwardData, setInitialForwardData] = useState<Partial<Task> | null>(null);
  
  // Login state
  const [employeeId, setEmployeeId] = useState('');
  const [loginError, setLoginError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('ทุกหน่วยงาน');
  const [statusFilter, setStatusFilter] = useState('ทุกสถานะ');
  const [typeFilter, setTypeFilter] = useState('ทุกประเภทงาน');
  
  // Date Range Filters
  const [deadlineStart, setDeadlineStart] = useState('');
  const [deadlineEnd, setDeadlineEnd] = useState('');
  const [completionStart, setCompletionStart] = useState('');
  const [completionEnd, setCompletionEnd] = useState('');
  const [createdStart, setCreatedStart] = useState('');
  const [createdEnd, setCreatedEnd] = useState('');

  // Drill-down
  const [selectedUnitDetail, setSelectedUnitDetail] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'none' | 'unit' | 'type' | 'status'>('none');
  
  // Dashboard Filters
  const [dashMonth, setDashMonth] = useState<string>(format(new Date(), 'MM'));
  const [dashYear, setDashYear] = useState<string>(format(new Date(), 'yyyy'));

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
      logAccess();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeId.length === 6 && /^\d+$/.test(employeeId)) {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('กรุณากรอกรหัสพนักงานให้ครบ 6 หลัก');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setTasks([]);
    setEmployeeId('');
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response from fetchTasks:", text);
        throw new Error(`Server returned non-JSON response: ${res.status}`);
      }
      
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
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': employeeId 
        },
        body: JSON.stringify({ action: 'LOGIN', details: `Employee ${employeeId} logged in` })
      });
    } catch (err) {
      console.error('Failed to log access', err);
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (uploading) return; // Prevent multiple submissions
    setUploading(true);
    let attachments = taskData.attachments || editingTask?.attachments;

    // Handle File Upload if selected
    if (selectedFiles.length > 0) {
      try {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));
        formData.append('taskName', taskData.taskName || '');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          // If a folder was created, use the folder link as the primary attachment
          if (uploadData.folderId) {
            attachments = `https://drive.google.com/drive/folders/${uploadData.folderId}`;
          } else if (uploadData.files && uploadData.files.length > 0) {
            attachments = uploadData.files[0].webViewLink;
          }
        } else {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
        }
      } catch (err: any) {
        alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + err.message);
        setUploading(false);
        return;
      }
    }

    const units = taskData.unit ? taskData.unit.split(', ').filter(Boolean) : [];
    const baseGroupId = taskData.groupId || `G-${Date.now()}`;

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

    if (!editingTask) {
      // CREATE MODE: Use batch creation endpoint
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-email': employeeId
          },
          body: JSON.stringify({ ...taskData, units, status, delayDays, attachments, groupId: baseGroupId })
        });
        
        if (!res.ok) {
          const responseData = await res.json();
          throw new Error(responseData?.error || `เกิดข้อผิดพลาดในการบันทึกข้อมูล (${res.status})`);
        }

        await fetchTasks();
        setIsModalOpen(false);
        setEditingTask(null);
        setSelectedFiles([]);
        alert(`บันทึกข้อมูลสำเร็จ (${units.length} รายการ)`);
      } catch (err: any) {
        console.error('Failed to save tasks', err);
        alert('ไม่สามารถบันทึกได้: ' + err.message);
      } finally {
        setUploading(false);
      }
    } else {
      // EDIT MODE: Update the single task
      const url = `/api/tasks/${editingTask.id}`;
      
      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-email': employeeId
          },
          body: JSON.stringify({ ...taskData, status, delayDays, attachments })
        });
        
        if (!res.ok) {
          const responseData = await res.json();
          throw new Error(responseData?.error || `เกิดข้อผิดพลาดในการบันทึกข้อมูล (${res.status})`);
        }

        await fetchTasks();
        setIsModalOpen(false);
        setEditingTask(null);
        setSelectedFiles([]);
        alert('บันทึกการแก้ไขสำเร็จ');
      } catch (err: any) {
        console.error('Failed to update task', err);
        alert('ไม่สามารถบันทึกได้: ' + err.message);
      } finally {
        setUploading(false);
      }
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
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = task.taskName.toLowerCase().includes(searchLower) ||
                          task.responsible.toLowerCase().includes(searchLower) ||
                          // For unit search, we want to be more specific if it looks like a unit name
                          task.unit.split(',').some(u => u.trim().toLowerCase().includes(searchLower)) ||
                          (task.progress && task.progress.toLowerCase().includes(searchLower));
      
      const matchesGroup = !groupQuery || (task.groupId && task.groupId.toLowerCase().includes(groupQuery.toLowerCase()));
      
      // Exact match for unit filter dropdown
      const taskUnits = task.unit.split(',').map(u => u.trim());
      const matchesUnit = unitFilter === 'ทุกหน่วยงาน' || taskUnits.includes(unitFilter);
      
      const matchesStatus = statusFilter === 'ทุกสถานะ' || task.status === statusFilter;
      const matchesType = typeFilter === 'ทุกประเภทงาน' || task.taskType === typeFilter;
      
      // Deadline Range
      const matchesDeadline = (!deadlineStart || (task.deadline && task.deadline >= deadlineStart)) &&
                             (!deadlineEnd || (task.deadline && task.deadline <= deadlineEnd));
      
      // Completion Range
      const matchesCompletion = (!completionStart || (task.actualCompletion && task.actualCompletion >= completionStart)) &&
                               (!completionEnd || (task.actualCompletion && task.actualCompletion <= completionEnd));
      
      // Created Range
      const matchesCreated = (!createdStart || (task.createdAt && task.createdAt.split('T')[0] >= createdStart)) &&
                             (!createdEnd || (task.createdAt && task.createdAt.split('T')[0] <= createdEnd));
      
      return matchesSearch && matchesGroup && matchesUnit && matchesStatus && matchesType && matchesDeadline && matchesCompletion && matchesCreated;
    });
  }, [tasks, searchQuery, groupQuery, unitFilter, statusFilter, typeFilter, deadlineStart, deadlineEnd, completionStart, completionEnd, createdStart, createdEnd]);

  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return { 'รายการทั้งหมด': filteredTasks };
    
    return filteredTasks.reduce((acc, task) => {
      let key = 'อื่นๆ';
      if (groupBy === 'unit') {
        key = task.unit || 'ไม่ระบุหน่วยงาน';
      } else if (groupBy === 'status') {
        key = task.status;
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [filteredTasks, groupBy]);

  const handleForwardTask = (task: Task) => {
    setEditingTask(null);
    setInitialForwardData({
      taskName: `[ส่งต่อ] ${task.taskName}`,
      progress: task.progress,
      remarks: `ส่งต่อจาก: ${task.unit}`,
      responsible: task.responsible,
      groupId: task.groupId || task.id
    });
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    const exportData = filteredTasks.map((task, index) => ({
      'ลำดับ': index + 1,
      'ชื่องาน': task.taskName,
      'ประเภทงาน': task.taskType,
      'หน่วยงานที่รับผิดชอบ': task.unit,
      'หน่วยย่อย': task.subUnit || '-',
      'ความถี่': task.frequency,
      'ผู้รับผิดชอบ': task.responsible,
      'กำหนดแล้วเสร็จ': task.deadline ? format(parseISO(task.deadline), 'dd/MM/yyyy') : '-',
      'ทำเสร็จจริง': task.actualCompletion ? format(parseISO(task.actualCompletion), 'dd/MM/yyyy') : '-',
      'Update ขั้นตอนการดำเนินงานอย่างละเอียด': task.progress || '-',
      'หมายเหตุ': task.remarks || '-',
      'ไฟล์แนบ': task.attachments || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    
    // Set column widths
    const wscols = [
      {wch: 5},  // ลำดับ
      {wch: 30}, // ชื่องาน
      {wch: 20}, // ประเภทงาน
      {wch: 25}, // หน่วยงานที่รับผิดชอบ
      {wch: 20}, // หน่วยย่อย
      {wch: 15}, // ความถี่
      {wch: 20}, // ผู้รับผิดชอบ
      {wch: 15}, // กำหนดแล้วเสร็จ
      {wch: 15}, // ทำเสร็จจริง
      {wch: 40}, // Update ขั้นตอนการดำเนินงานอย่างละเอียด
      {wch: 20}, // หมายเหตุ
      {wch: 40}  // ไฟล์แนบ
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `รายการงาน_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  // Dashboard Stats
  const filteredDashTasks = useMemo(() => {
    return tasks.filter(t => {
      const d = parseISO(t.createdAt);
      const matchesMonth = dashMonth === 'all' || (d.getMonth() + 1).toString().padStart(2, '0') === dashMonth;
      const matchesYear = dashYear === 'all' || d.getFullYear().toString() === dashYear;
      return matchesMonth && matchesYear;
    });
  }, [tasks, dashMonth, dashYear]);

  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks.filter(t => {
      // 1. Already marked as delayed
      if (t.status === 'ล่าช้า') return true;
      
      // 2. Not completed yet but already past deadline
      if (!t.actualCompletion && t.deadline) {
        const deadlineDate = parseISO(t.deadline);
        return isBefore(deadlineDate, today);
      }
      
      return false;
    });
  }, [tasks]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tks = filteredDashTasks;
    const total = tks.length;
    
    // Updated logic: delayed includes tasks past deadline even if still 'รอดำเนินการ'
    const delayedTasksList = tks.filter(t => {
      if (t.status === 'ล่าช้า') return true;
      if (t.status === 'รอดำเนินการ' && t.deadline) {
        return isBefore(parseISO(t.deadline), today);
      }
      return false;
    });
    
    const delayed = delayedTasksList.length;
    const pending = tks.filter(t => t.status === 'รอดำเนินการ' && !delayedTasksList.includes(t)).length;
    const early = tks.filter(t => t.status === 'ก่อนเวลา').length;
    const onTime = tks.filter(t => t.status === 'ตรงเวลา').length;
    
    return { total, pending, early, onTime, delayed };
  }, [filteredDashTasks]);

  const unitPerformance = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const perf: Record<string, { total: number, completed: number, delayed: number }> = {};
    
    filteredDashTasks.forEach(t => {
      const units = t.unit.split(',').map(u => u.trim());
      units.forEach(u => {
        if (!perf[u]) perf[u] = { total: 0, completed: 0, delayed: 0 };
        perf[u].total += 1;
        if (t.status !== 'รอดำเนินการ') perf[u].completed += 1;
        
        // Match the overdue logic
        const isActuallyDelayed = t.status === 'ล่าช้า' || (t.status === 'รอดำเนินการ' && t.deadline && isBefore(parseISO(t.deadline), today));
        if (isActuallyDelayed) perf[u].delayed += 1;
      });
    });

    return Object.entries(perf)
      .map(([name, data]) => ({
        name,
        ...data,
        rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredDashTasks]);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-planner-bg flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[40px] planner-shadow border border-white/50 w-full max-w-md relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-planner-accent/5 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="flex flex-col items-center mb-12">
            <div className="w-20 h-20 bg-planner-soft-accent text-planner-accent rounded-[28px] flex items-center justify-center mb-6 shadow-sm">
              <Sun size={40} />
            </div>
            <h1 className="text-3xl font-black text-[#1E293B]">Welcome Back</h1>
            <p className="text-[#64748B] text-center mt-3 font-medium">กรุณากรอกรหัสพนักงานเพื่อเข้าใช้งาน Planner</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-planner-accent uppercase tracking-[0.2em] ml-1">Employee ID</label>
              <input 
                type="text"
                maxLength={6}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-6 py-5 rounded-[24px] bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-planner-accent/10 focus:border-planner-accent outline-none transition-all text-center text-4xl tracking-[0.3em] font-black text-[#1E293B]"
                required
              />
            </div>

            {loginError && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-500 text-sm font-bold flex items-center justify-center gap-2"
              >
                <AlertCircle size={16} />
                {loginError}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full h-16 bg-planner-accent text-white rounded-[24px] font-black shadow-xl shadow-planner-accent/30 hover:bg-[#7C3AED] hover:translate-y-[-2px] transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              Sign In
              <ArrowUpRight size={22} />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-planner-bg font-sans text-[#1A1A1A] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-4 left-4 z-50 w-64 bg-white/80 planner-blur border border-white/50 rounded-[32px] planner-shadow flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 lg:ml-4 lg:mb-4 lg:my-4",
        isSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"
      )}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-planner-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-planner-accent/20">
              <Sun size={24} />
            </div>
            <span className="text-xl font-display font-bold tracking-tight bg-gradient-to-br from-planner-accent to-purple-400 bg-clip-text text-transparent">Planner</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-[#6B7280] hover:bg-[#F3F4F6]/50 rounded-full lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2">
          <p className="px-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-4">เมนูหลัก</p>
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 rounded-3xl transition-all duration-300",
              activeTab === 'dashboard' ? "bg-planner-accent text-white shadow-xl shadow-planner-accent/20" : "text-[#64748B] hover:bg-planner-soft-accent hover:text-planner-accent"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="font-semibold">Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('tasks'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 rounded-3xl transition-all duration-300",
              activeTab === 'tasks' ? "bg-planner-accent text-white shadow-xl shadow-planner-accent/20" : "text-[#64748B] hover:bg-planner-soft-accent hover:text-planner-accent"
            )}
          >
            <CalendarRange size={20} />
            <span className="font-semibold">รายการงาน</span>
          </button>
          <button 
            onClick={() => { setActiveTab('overdue'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center justify-between px-6 py-4 rounded-3xl transition-all duration-300",
              activeTab === 'overdue' ? "bg-red-500 text-white shadow-xl shadow-red-200" : "text-[#64748B] hover:bg-red-50 hover:text-red-500"
            )}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              <span className="font-semibold">ค้างส่ง</span>
            </div>
            {overdueTasks.length > 0 && (
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold",
                activeTab === 'overdue' ? "bg-white text-red-500" : "bg-red-500 text-white shadow-sm"
              )}>
                {overdueTasks.length}
              </span>
            )}
          </button>
        </nav>

        <div className="p-6 border-t border-planner-soft-accent/50 space-y-4">
          <div className="bg-planner-soft-accent/30 p-5 rounded-[24px] border border-white/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-planner-accent font-bold text-lg shadow-sm border border-planner-soft-accent">
                {employeeId.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-planner-accent font-bold uppercase tracking-wider mb-0.5">Hello!</p>
                <p className="text-sm font-bold truncate text-[#334155]">{employeeId}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-3xl transition-all duration-300 font-semibold"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-12">
        <header className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 bg-white border border-[#E2E8F0] rounded-2xl text-[#64748B] lg:hidden shadow-sm hover:bg-slate-50 transition-colors"
              >
                <Menu size={24} />
              </button>
            <div className="flex flex-col">
              <p className="text-sm font-bold text-planner-accent uppercase tracking-[0.2em] mb-2">
                {format(new Date(), 'EEEE, d MMMM yyyy', { locale: th })}
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-[#1E293B] leading-tight">
                {activeTab === 'dashboard' ? 'My Dashboard' : 
                 activeTab === 'overdue' ? 'Overdue Tasks' : 'Current Tasks'}
              </h1>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto self-end">
            {activeTab === 'tasks' && (
              <>
                <button 
                  onClick={handleExportExcel}
                  className="flex-1 md:flex-none h-14 px-8 bg-white border-2 border-emerald-100 text-emerald-600 rounded-[20px] flex items-center justify-center gap-3 font-bold hover:bg-emerald-50 hover:border-emerald-200 transition-all active:scale-95 planner-shadow"
                >
                  <Download size={20} />
                  <span>Export</span>
                </button>
                <button 
                  onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                  className="flex-1 md:flex-none h-14 px-8 bg-planner-accent text-white rounded-[20px] flex items-center justify-center gap-3 font-bold shadow-xl shadow-planner-accent/30 hover:bg-[#7C3AED] transition-all active:scale-95"
                >
                  <Plus size={22} />
                  <span>New task</span>
                </button>
              </>
            )}
            
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('overdue')}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative planner-shadow border",
                  activeTab === 'overdue' ? "bg-red-50 text-red-500 border-red-100" : "bg-white text-slate-400 border-slate-100 hover:text-planner-accent"
                )}
              >
                <Bell size={22} />
                {overdueTasks.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-4 border-planner-bg animate-pulse">
                    {overdueTasks.length}
                  </span>
                )}
              </button>
              <button className="w-14 h-14 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-planner-accent transition-all planner-shadow flex items-center justify-center">
                <Settings size={22} />
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-12">
            {/* Dashboard Filters */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-[#E5E7EB] flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#6B7280]" />
                <span className="text-sm font-bold text-[#4B5563]">ช่วงเวลา:</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <select 
                  value={dashMonth}
                  onChange={(e) => setDashMonth(e.target.value)}
                  className="flex-1 sm:flex-none p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">ทุกเดือน</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = (i + 1).toString().padStart(2, '0');
                    return <option key={m} value={m}>{format(new Date(2024, i, 1), 'MMMM', { locale: th })}</option>;
                  })}
                </select>
                <select 
                  value={dashYear}
                  onChange={(e) => setDashYear(e.target.value)}
                  className="flex-1 sm:flex-none p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">ทุกปี</option>
                  {Array.from({ length: 11 }, (_, i) => {
                    const y = (new Date().getFullYear() + 5 - i).toString();
                    return <option key={y} value={y}>{parseInt(y) + 543}</option>;
                  })}
                </select>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
              <StatCard icon={<TrendingUp />} label="งานทั้งหมด" value={stats.total} unit="รายการ" color="purple" />
              <StatCard icon={<Clock />} label="รอดำเนินการ" value={stats.pending} unit="ยังไม่เสร็จ" color="amber" />
              <StatCard icon={<CheckCircle2 />} label="ก่อนเวลา" value={stats.early} unit="ประสิทธิภาพดี" color="emerald" />
              <StatCard icon={<CheckCircle2 />} label="ตรงเวลา" value={stats.onTime} unit="ตามแผนงาน" color="blue" />
              <StatCard 
                icon={<AlertCircle />} 
                label="ล่าช้า" 
                value={stats.delayed} 
                unit="ต้องเร่งรัด" 
                color="red" 
                onClick={() => setActiveTab('overdue')}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
              <div className="xl:col-span-2 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
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

            {/* Unit Performance Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">ประสิทธิภาพรายหน่วยงาน</h3>
                    <p className="text-sm text-[#6B7280]">จำนวนงานและอัตราการดำเนินการสำเร็จ</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unitPerformance.map((unit) => (
                  <div 
                    key={unit.name} 
                    onClick={() => setSelectedUnitDetail(unit.name)}
                    className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] hover:border-purple-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-sm">{unit.name}</span>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full",
                        unit.rate >= 80 ? "bg-emerald-100 text-emerald-700" :
                        unit.rate >= 50 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {unit.rate}% สำเร็จ
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">
                        <span>งานทั้งหมด: {unit.total}</span>
                        <span className="text-red-500">ล่าช้า: {unit.delayed}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#9333EA] transition-all duration-500" 
                          style={{ width: `${unit.rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Tasks Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <ListTodo size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">รายการงานล่าสุด</h3>
                    <p className="text-sm text-[#6B7280]">งานที่เพิ่งอัปเดต 10 รายการล่าสุด</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className="text-sm font-bold text-[#9333EA] hover:underline"
                >
                  ดูทั้งหมด
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
                      <th className="pb-4 px-2">ลำดับ</th>
                      <th className="pb-4 px-2">ชื่องาน</th>
                      <th className="pb-4 px-2">หน่วยงาน</th>
                      <th className="pb-4 px-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {[...tasks].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map((task, index) => (
                      <tr key={task.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-4 px-2 text-xs font-bold text-[#6B7280]">
                          {index + 1}
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-sm font-bold text-[#1A1A1A]">{task.taskName}</p>
                          <p className="text-[10px] text-[#6B7280]">{task.taskType}</p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-xs text-[#4B5563] font-medium">{task.unit}</p>
                          {task.subUnit && <p className="text-[10px] text-planner-accent font-bold mt-0.5">{task.subUnit}</p>}
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-xs text-[#4B5563]">
                            {task.deadline ? format(parseISO(task.deadline), 'dd/MM/yyyy') : '-'}
                          </p>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex justify-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                              task.status === 'ก่อนเวลา' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              task.status === 'ตรงเวลา' ? "bg-blue-50 text-blue-600 border-blue-100" :
                              task.status === 'ล่าช้า' ? "bg-red-50 text-red-600 border-red-100" :
                              "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                              {task.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'overdue' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <AlertTriangle size={32} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-[#1A1A1A]">รายการงานที่เกินกำหนดแล้วเสร็จ</h2>
                    <p className="text-sm md:text-base text-[#6B7280]">ตรวจพบรายการที่ยังไม่สำเร็จและเลยกำหนดส่ง ({overdueTasks.length} รายการ)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className="px-6 py-2.5 bg-[#F3F4F6] text-[#4B5563] rounded-xl font-bold hover:bg-[#E5E7EB] transition-colors flex items-center gap-2"
                >
                  <ListTodo size={18} />
                  จัดการงานทั้งหมด
                </button>
              </div>

              {overdueTasks.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">ยอดเยี่ยม! ไม่มีงานค้างเกินกำหนด</h3>
                  <p className="text-[#6B7280]">คุณจัดการงานได้ตรงตามแผนงานทั้งหมด</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 md:mx-0">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#F9FAFB] text-[#6B7280] text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 rounded-tl-2xl">ลำดับ</th>
                        <th className="px-6 py-4">ชื่องาน / ประเภท</th>
                        <th className="px-6 py-4">หน่วยงาน / ผู้รับผิดชอบ</th>
                        <th className="px-6 py-4">กำหนดเสร็จ</th>
                        <th className="px-6 py-4 text-center">สถานะ</th>
                        <th className="px-6 py-4 text-right rounded-tr-2xl">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {overdueTasks.map((task, index) => (
                        <tr key={task.id} className="hover:bg-red-50/30 transition-colors group">
                          <td className="px-6 py-5 text-sm font-bold text-[#6B7280]">
                            {index + 1}
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-[#1A1A1A]">{task.taskName}</p>
                            <p className="text-[10px] text-[#6B7280] uppercase font-medium mt-1">{task.taskType}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-medium text-[#4B5563] truncate max-w-[200px]">{task.unit}</p>
                            {task.subUnit && <p className="text-[10px] text-planner-accent font-bold mt-0.5">{task.subUnit}</p>}
                            <p className="text-[10px] text-[#6B7280] mt-1 uppercase font-medium">{task.responsible}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-red-600">
                                {task.deadline ? format(parseISO(task.deadline), 'dd/MM/yyyy') : '-'}
                              </span>
                              {task.deadline && (
                                <span className="text-[10px] text-red-400 font-medium">
                                  เกินกำหนด {differenceInDays(new Date(), parseISO(task.deadline))} วัน
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex justify-center">
                              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-600 border-red-100">
                                {task.status === 'รอดำเนินการ' ? 'รอดำเนินการ (เกินกำหนด)' : task.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                                className="p-2 text-[#6B7280] hover:text-[#9333EA] hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-20">
            {/* Filters Section */}
            <div className="bg-white/60 planner-blur rounded-[32px] p-6 md:p-8 planner-shadow border border-white/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-planner-accent transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่องาน, ผู้รับผิดชอบ หรือหน่วยงาน..."
                    className="w-full pl-16 pr-6 py-5 bg-slate-50/50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-planner-accent/10 focus:border-planner-accent transition-all font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-planner-accent transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="ID กลุ่มงาน..."
                    className="w-full pl-16 pr-6 py-5 bg-slate-50/50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-planner-accent/10 focus:border-planner-accent transition-all font-medium"
                    value={groupQuery}
                    onChange={(e) => setGroupQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <select 
                  className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-planner-accent/10 font-bold text-sm text-[#475569] appearance-none"
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                >
                  <option>ทุกหน่วยงาน</option>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                  {STATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                <select 
                  className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-planner-accent/10 font-bold text-sm text-[#475569] appearance-none"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option>ทุกประเภทงาน</option>
                  {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <select 
                  className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-planner-accent/10 font-bold text-sm text-[#475569] appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>ทุกสถานะ</option>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setGroupQuery('');
                    setUnitFilter('ทุกหน่วยงาน');
                    setStatusFilter('ทุกสถานะ');
                    setTypeFilter('ทุกประเภทงาน');
                    setDeadlineStart('');
                    setDeadlineEnd('');
                    setGroupBy('none');
                  }}
                  className="w-full p-4 bg-red-50 text-red-500 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} /> ล้างตัวกรอง
                </button>
              </div>
            </div>

            {/* Task Grid / Planner View */}
            <div className="space-y-12">
              {loading ? (
                <div className="text-center py-32 space-y-4">
                  <div className="w-12 h-12 border-4 border-planner-soft-accent border-t-planner-accent rounded-full animate-spin mx-auto" />
                  <p className="text-planner-accent font-bold animate-pulse uppercase tracking-widest text-xs">Loading Planner...</p>
                </div>
              ) : Object.keys(groupedTasks).length === 0 ? (
                <div className="text-center py-32 bg-white/40 rounded-[40px] border-2 border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ListTodo size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-400">ยังไม่มีรายการงานในขณะนี้</h3>
                  <p className="text-slate-400 text-sm mt-2">กดปุ่ม "New task" ด้านบนเพื่อเริ่มวางแผนงาน</p>
                </div>
              ) : (Object.entries(groupedTasks) as [string, Task[]][]).map(([groupName, groupTasks]) => (
                <div key={groupName} className="space-y-6">
                  {groupBy !== 'none' && (
                    <div className="flex items-center gap-4 px-2">
                      <div className="h-10 w-2 bg-planner-accent rounded-full mb-1" />
                      <h2 className="text-2xl font-black text-[#1E293B]">
                        {groupName} <span className="text-planner-accent opacity-40 ml-2 font-medium">{groupTasks.length}</span>
                      </h2>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groupTasks.map((task, index) => (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white planner-shadow rounded-[32px] p-8 border border-white/50 planner-card-hover group relative overflow-hidden flex flex-col"
                      >
                         {/* Circle Gradient Backdrop */}
                         <div className={cn(
                            "absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full -mr-16 -mt-16 transition-opacity group-hover:opacity-20",
                            task.status === 'ก่อนเวลา' ? "bg-emerald-400" :
                            task.status === 'ตรงเวลา' ? "bg-blue-400" :
                            task.status === 'ล่าช้า' ? "bg-red-400" : "bg-amber-400"
                         )} />

                        <div className="flex justify-between items-start mb-6 z-10">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                            task.status !== 'รอดำเนินการ' ? "bg-planner-accent text-white rotate-[360deg] shadow-lg shadow-planner-accent/20" : "bg-slate-50 text-slate-300 border border-slate-100"
                          )}>
                            {task.status !== 'รอดำเนินการ' ? <Check size={24} strokeWidth={3} /> : <Circle size={24} />}
                          </div>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleForwardTask(task)}
                              className="w-10 h-10 flex items-center justify-center text-[#64748B] hover:bg-planner-soft-accent hover:text-planner-accent rounded-xl transition-all"
                            >
                              <ArrowUpRight size={18} />
                            </button>
                            <button 
                              onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                              className="w-10 h-10 flex items-center justify-center text-[#64748B] hover:bg-planner-soft-accent hover:text-planner-accent rounded-xl transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 flex-1 z-10">
                          <div>
                            <h3 className="text-xl font-bold text-[#1E293B] line-clamp-2 leading-tight mb-2 group-hover:text-planner-accent transition-colors">
                              {task.taskName}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                               <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-100 group-hover:bg-white transition-colors">
                                 {task.taskType}
                               </span>
                               {task.groupId && (
                                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[10px] font-bold text-purple-600 uppercase tracking-wider border border-purple-100">
                                  ID: {task.groupId.slice(-6)}
                                </span>
                               )}
                            </div>
                             </div>
                          </div>

                          <div className="pt-4 border-t border-slate-50 space-y-3 mt-auto">
                             <div className="flex items-center justify-between text-xs font-bold">
                               <span className="text-slate-400 uppercase tracking-widest text-[9px]">Deadline</span>
                               <span className={cn(
                                 "font-display font-black",
                                 task.status === 'ล่าช้า' ? "text-red-500 underline decoration-red-200 decoration-2 underline-offset-4" : "text-slate-600"
                               )}>
                                 {task.deadline ? format(parseISO(task.deadline), 'dd MMM yyyy', { locale: th }) : 'ไม่ระบุ'}
                               </span>
                             </div>
                             <div className="flex items-center justify-between text-xs font-bold">
                               <span className="text-slate-400 uppercase tracking-widest text-[9px]">Unit</span>
                               <div className="text-right">
                                 <p className="text-[#334155] truncate max-w-[150px] font-medium">{task.unit}</p>
                                 {task.subUnit && <p className="text-planner-accent text-[10px] font-bold">{task.subUnit}</p>}
                               </div>
                             </div>
                             {task.progress && (
                               <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mt-4 group-hover:bg-white transition-colors">
                                 <p className="text-[#64748B] text-[11px] leading-relaxed italic line-clamp-3">"{task.progress}"</p>
                               </div>
                             )}
                          </div>
                          
                          <div className="pt-4 flex items-center justify-between mt-auto">
                             <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-planner-soft-accent border-2 border-white flex items-center justify-center text-[10px] font-bold text-planner-accent shadow-sm">
                                  {task.responsible.slice(0, 2).toUpperCase()}
                               </div>
                               <span className="text-[11px] font-bold text-[#64748B]">{task.responsible}</span>
                             </div>
                             
                             <div className="flex flex-col items-end">
                                <span className={cn(
                                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm",
                                  task.status === 'ก่อนเวลา' ? "bg-emerald-500 text-white border-emerald-400" :
                                  task.status === 'ตรงเวลา' ? "bg-blue-500 text-white border-blue-400" :
                                  task.status === 'ล่าช้า' ? "bg-red-500 text-white border-red-400" :
                                  "bg-amber-100 text-amber-700 border-amber-200"
                                )}>
                                  {task.status}
                                </span>
                             </div>
                          </div>
                        
                        {task.attachments && (
                          <a 
                            href={task.attachments} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-6 text-[10px] font-black text-planner-accent hover:underline underline-offset-4 z-10"
                          >
                            <Plus size={12} strokeWidth={3} /> View Attachments
                          </a>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Unit Detail Modal */}
      <AnimatePresence>
        {selectedUnitDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUnitDetail(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F9FAFB]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">รายละเอียดงาน: {selectedUnitDetail}</h2>
                    <p className="text-[#6B7280] text-sm">รายการงานทั้งหมดของหน่วยงานนี้</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUnitDetail(null)} className="p-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {['รอดำเนินการ', 'ก่อนเวลา', 'ตรงเวลา', 'ล่าช้า'].map(status => {
                    const count = tasks.filter(t => t.unit.split(',').map(u => u.trim()).includes(selectedUnitDetail) && t.status === status).length;
                    return (
                      <div key={status} className="p-4 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">{status}</p>
                        <p className="text-2xl font-black">{count}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F9FAFB] text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">ชื่องาน</th>
                        <th className="px-6 py-4">กำหนดเสร็จ</th>
                        <th className="px-6 py-4">ทำเสร็จจริง</th>
                        <th className="px-6 py-4 text-center">สถานะ</th>
                        <th className="px-6 py-4 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {tasks.filter(t => t.unit.split(',').map(u => u.trim()).includes(selectedUnitDetail)).map(task => (
                        <tr key={task.id} className="hover:bg-[#F9FAFB] transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-bold text-sm text-[#1A1A1A]">{task.taskName}</p>
                            <p className="text-[10px] text-[#6B7280] uppercase">{task.taskType}</p>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {task.deadline ? format(parseISO(task.deadline), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {task.actualCompletion ? format(parseISO(task.actualCompletion), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                task.status === 'ก่อนเวลา' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                task.status === 'ตรงเวลา' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                task.status === 'ล่าช้า' ? "bg-red-50 text-red-600 border-red-100" :
                                "bg-amber-50 text-amber-600 border-amber-100"
                              )}>
                                {task.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                                className="p-1.5 text-[#6B7280] hover:text-[#9333EA] hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1.5 text-[#6B7280] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[#E5E7EB] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1A1A1A] rounded-2xl flex items-center justify-center text-white">
                    <ListTodo size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{editingTask ? 'แก้ไขรายการงาน' : (initialForwardData ? 'ส่งต่องาน / สร้างงานใหม่' : 'เพิ่มรายการงานใหม่')}</h2>
                    <p className="text-[#6B7280] text-sm">
                      {editingTask ? 'ปรับปรุงข้อมูลรายการงานเดิม' : 'สร้างงานใหม่จากข้อมูลเดิมเพื่อเริ่มขั้นตอนถัดไป'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                
                // Collect multi-select units
                const selectedUnits = Array.from(e.currentTarget.querySelectorAll('input[name="unit"]:checked')).map((el: any) => el.value);
                const selectedSubUnits = Array.from(e.currentTarget.querySelectorAll('input[name="subUnit"]:checked')).map((el: any) => el.value);
                
                if (selectedUnits.length === 0 && selectedSubUnits.length === 0) {
                  alert('กรุณาเลือกหน่วยงานหรือหน่วยย่อยที่รับผิดชอบ');
                  return;
                }

                (data as any).unit = selectedUnits.join(', ');
                (data as any).subUnit = selectedSubUnits.join(', ');
                handleSaveTask(data);
              }} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      <ListTodo size={14} /> ชื่องาน
                    </label>
                    <input 
                      name="taskName"
                      defaultValue={editingTask?.taskName || initialForwardData?.taskName}
                      required
                      placeholder="เช่น ตรวจสอบระบบไฟฟ้าประจำเดือน..."
                      className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <input type="hidden" name="groupId" defaultValue={editingTask?.groupId || initialForwardData?.groupId} />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      ประเภทงาน
                    </label>
                    <select 
                      name="taskType"
                      defaultValue={editingTask?.taskType || TASK_TYPES[0]}
                      className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                        <Filter size={14} /> หน่วยงานที่รับผิดชอบ (เลือกได้หลายรายการ)
                      </label>
                      <button 
                        type="button"
                        onClick={() => {
                          const checkboxes = document.querySelectorAll('input[name="unit"].unit-checkbox');
                          const allChecked = Array.from(checkboxes).every((cb: any) => cb.checked);
                          checkboxes.forEach((cb: any) => cb.checked = !allChecked);
                        }}
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-700"
                      >
                        เลือกทั้งหมด / ยกเลิก
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {UNITS.map(u => (
                        <label key={u} className="relative cursor-pointer group">
                          <input 
                            type="checkbox" 
                            name="unit" 
                            value={u} 
                            defaultChecked={editingTask?.unit?.split(',').map(item => item.trim()).includes(u)}
                            className="peer sr-only unit-checkbox" 
                          />
                          <div className="p-3 text-center text-[10px] font-bold border border-[#E5E7EB] rounded-xl peer-checked:bg-[#9333EA] peer-checked:text-white peer-checked:border-[#9333EA] hover:bg-[#F9FAFB] transition-all">
                            {u}
                          </div>
                        </label>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">สถานีไฟฟ้า / แผนก</span>
                          <button 
                            type="button"
                            onClick={() => {
                              const checkboxes = document.querySelectorAll('input[name="unit"].station-checkbox');
                              const visibleCheckboxes = Array.from(checkboxes).filter((cb: any) => {
                                const item = cb.closest('.station-item');
                                return item && item.style.display !== 'none';
                              });
                              const allChecked = visibleCheckboxes.every((cb: any) => cb.checked);
                              visibleCheckboxes.forEach((cb: any) => cb.checked = !allChecked);
                            }}
                            className="text-[10px] font-bold text-purple-600 hover:text-purple-700"
                          >
                            เลือกทั้งหมดที่แสดง
                          </button>
                        </div>
                        <div className="relative w-48">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={12} />
                          <input 
                            type="text" 
                            placeholder="ค้นหาสถานี..."
                            className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase();
                              const items = document.querySelectorAll('.station-item');
                              items.forEach((item: any) => {
                                if (item.textContent.toLowerCase().includes(val)) {
                                  item.style.display = 'flex';
                                } else {
                                  item.style.display = 'none';
                                }
                              });
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Department Roles Field */}
                      <div className="mt-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center gap-4">
                        <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider whitespace-nowrap">
                          แผนก:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DEPARTMENT_ROLES.map(role => (
                            <label key={role} className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                name="subUnit" 
                                value={role}
                                defaultChecked={editingTask?.subUnit?.split(',').map(item => item.trim()).includes(role)}
                                className="w-4 h-4 rounded border-[#E5E7EB] text-purple-600 focus:ring-purple-500" 
                              />
                              <span className="text-[10px] font-medium leading-tight group-hover:text-purple-600">{role}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border border-[#E5E7EB] rounded-2xl bg-[#F9FAFB] mt-4">
                        {STATIONS.map(s => (
                          <label key={s} className="station-item flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              name="unit" 
                              value={s} 
                              defaultChecked={editingTask?.unit?.split(',').map(item => item.trim()).includes(s)}
                              className="w-4 h-4 rounded border-[#E5E7EB] text-purple-600 focus:ring-purple-500 station-checkbox" 
                            />
                            <span className="text-[10px] font-medium leading-tight">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      ความถี่
                    </label>
                    <select 
                      name="frequency"
                      defaultValue={editingTask?.frequency || 'ทุกเดือน'}
                      className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option>รายครั้ง</option>
                      <option>ทุกวัน</option>
                      <option>ทุกสัปดาห์</option>
                      <option>ทุกเดือน</option>
                      <option>รายไตรมาส</option>
                      <option>รายปี</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      ผู้รับผิดชอบ
                    </label>
                    <input 
                      name="responsible"
                      defaultValue={editingTask?.responsible || initialForwardData?.responsible || employeeId}
                      required
                      placeholder="ระบุชื่อผู้รับผิดชอบ..."
                      className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
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
                    Update ขั้นตอนการดำเนินงานอย่างละเอียด
                  </label>
                  <textarea 
                    name="progress"
                    defaultValue={editingTask?.progress || initialForwardData?.progress}
                    rows={3}
                    placeholder="ระบุขั้นตอนการดำเนินงานปัจจุบัน..."
                    className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    หมายเหตุ
                  </label>
                  <textarea 
                    name="remarks"
                    defaultValue={editingTask?.remarks || initialForwardData?.remarks}
                    rows={2}
                    placeholder="ระบุข้อมูลเพิ่มเติม..."
                    className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    เพิ่มไฟล์ที่เกี่ยวข้อง (อัปโหลดเข้า Google Drive)
                  </label>
                  <div className="relative">
                    <input 
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setSelectedFiles(prev => [...prev, ...files]);
                        e.target.value = ''; // Reset input value to allow selecting same file again
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="flex items-center justify-center gap-3 w-full p-6 border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F9FAFB] cursor-pointer hover:bg-[#F3F4F6] hover:border-purple-300 transition-all"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-[#6B7280]">
                        <Plus size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-[#1A1A1A]">
                          {selectedFiles.length > 0 ? `เลือกแล้ว ${selectedFiles.length} ไฟล์ (คลิกเพื่อเพิ่มไฟล์เพิ่ม)` : 'คลิกเพื่อเลือกไฟล์'}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          {selectedFiles.length > 0 
                            ? `รวมขนาด ${(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB` 
                            : 'รองรับไฟล์เอกสารและรูปภาพ (กด + เพื่อเพิ่มได้เรื่อยๆ)'}
                        </p>
                      </div>
                    </label>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedFiles.map((f, idx) => (
                        <div key={idx} className="px-2 py-1 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-lg border border-purple-100 flex items-center gap-1">
                          <span className="truncate max-w-[100px]">{f.name}</span>
                          <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}>
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {editingTask?.attachments && selectedFiles.length === 0 && (
                    <p className="text-[10px] text-emerald-600 font-bold">
                      ✓ มีไฟล์แนบเดิมอยู่แล้ว: <a href={editingTask.attachments} target="_blank" rel="noreferrer" className="underline">ดูไฟล์</a>
                    </p>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); setSelectedFiles([]); }}
                    className="flex-1 py-4 text-[#6B7280] font-bold hover:bg-[#F3F4F6] rounded-2xl transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    disabled={uploading}
                    className={cn(
                      "flex-[2] py-4 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                      uploading ? "bg-gray-400 cursor-not-allowed" : "bg-[#1A1A1A] shadow-gray-200 hover:bg-black"
                    )}
                  >
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        กำลังประมวลผล...
                      </>
                    ) : (
                      editingTask ? 'บันทึกการแก้ไข' : 'ยืนยันการส่งต่อ / บันทึก'
                    )}
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

function StatCard({ icon, label, value, unit, color, onClick }: { 
  icon: React.ReactNode, 
  label: string, 
  value: number, 
  unit: string, 
  color: 'purple' | 'amber' | 'emerald' | 'blue' | 'red',
  onClick?: () => void 
}) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white p-6 rounded-3xl shadow-sm border border-[#E5E7EB] flex flex-col gap-4 transition-all",
        onClick && "cursor-pointer hover:border-purple-200 hover:shadow-md active:scale-95"
      )}
    >
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
