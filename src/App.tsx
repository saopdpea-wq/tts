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
  AlertTriangle
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
  unit: string; // Will store comma-separated units
  responsible: string;
  frequency: string;
  taskType: string;
  progress: string;
  deadline: string;
  actualCompletion: string;
  delayDays: string;
  status: 'ก่อนเวลา' | 'ตรงเวลา' | 'ล่าช้า' | 'รอดำเนินการ';
  remarks: string;
  attachments?: string; // Google Drive link
  groupId?: string; // To track linked tasks
  createdAt: string;
}

const UNITS = [
  'หน่วย 1', 'หน่วย 2', 'หน่วย 3', 'หน่วย 4', 'หน่วย 5', 
  'หน่วย 6', 'หน่วย 7', 'หน่วย 17', 'หน่วย 19', 'หน่วย 20', 'หน่วย 21'
];

const STATIONS = [
  'แผนก',
  'หผ.', 'ชผ.', 'เบียร์', 'เอ', 'เอและเบียร์',
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
      
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setTasks(sortedData);
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
      'ลำดับ': filteredTasks.length - index,
      'ชื่องาน': task.taskName,
      'ประเภทงาน': task.taskType,
      'หน่วยงานที่รับผิดชอบ': task.unit,
      'สถานีไฟฟ้า / แผนก': task.unit, // In this app, unit and station are mixed in the same field
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
      {wch: 25}, // สถานีไฟฟ้า / แผนก
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
      if (t.status === 'รอดำเนินการ' && t.deadline) {
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
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-[#E5E7EB] w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <LayoutDashboard size={32} />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">เข้าสู่ระบบจัดการงาน</h1>
            <p className="text-[#6B7280] text-center mt-2">กรุณากรอกรหัสพนักงาน 6 หลักเพื่อเข้าใช้งาน</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-2">รหัสพนักงาน</label>
              <input 
                type="text"
                maxLength={6}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, ''))}
                placeholder="กรอกรหัสพนักงาน 6 หลัก"
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest font-mono"
                required
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                {loginError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-[#9333EA] text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-[#7E22CE] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              ยืนยัน
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#F3F4F6] text-center">
            <p className="text-xs text-[#9CA3AF]">
              ระบบจะเชื่อมต่อ Google Sheets อัตโนมัติเมื่อเข้าสู่ระบบสำเร็จ
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FE] font-sans text-[#1A1A1A] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E5E7EB] flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#9333EA] rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <ListTodo size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">TaskTracker</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'dashboard' ? "bg-[#9333EA] text-white shadow-md" : "text-[#6B7280] hover:bg-[#F3F4F6]"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('tasks'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'tasks' ? "bg-[#9333EA] text-white shadow-md" : "text-[#6B7280] hover:bg-[#F3F4F6]"
            )}
          >
            <ListTodo size={20} />
            <span className="font-medium">รายการงาน</span>
          </button>
          <button 
            onClick={() => { setActiveTab('overdue'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'overdue' ? "bg-red-500 text-white shadow-md" : "text-[#6B7280] hover:bg-red-50 hover:text-red-600"
            )}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              <span className="font-medium">เกินกำหนด</span>
            </div>
            {overdueTasks.length > 0 && (
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                activeTab === 'overdue' ? "bg-white text-red-500" : "bg-red-500 text-white"
              )}>
                {overdueTasks.length}
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="bg-[#F3F4F6] p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#9333EA] font-bold text-sm shadow-sm">
              {employeeId.slice(-2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">ผู้ใช้งาน</p>
              <p className="text-sm font-semibold truncate">ID: {employeeId}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full mt-4 flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-white border border-[#E5E7EB] rounded-xl text-[#6B7280] lg:hidden shadow-sm"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">
                {activeTab === 'dashboard' ? 'ภาพรวมการดำเนินงาน' : 
                 activeTab === 'overdue' ? 'รายการงานเกินกำหนด' : 'จัดการรายการงาน'}
              </h1>
              <p className="text-sm md:text-base text-[#6B7280] mt-1">
                {activeTab === 'dashboard' ? 'สรุปสถานะงานของทุกหน่วยงาน' : 
                 activeTab === 'overdue' ? 'งานที่รอดำเนินการและเกินกำหนดแล้วเสร็จ' : 'เพิ่ม แก้ไข และติดตามสถานะงานรายหน่วย'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {activeTab === 'tasks' && (
              <>
                <button 
                  onClick={handleExportExcel}
                  className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  <Download size={20} />
                  ส่งออก Excel
                </button>
                <button 
                  onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                  className="flex-1 md:flex-none bg-[#9333EA] text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg shadow-purple-200 hover:bg-[#7E22CE] transition-all active:scale-95"
                >
                  <Plus size={20} />
                  เพิ่มงานใหม่
                </button>
              </>
            )}
            <button 
              onClick={() => setActiveTab('overdue')}
              className={cn(
                "p-3 rounded-xl transition-all relative shadow-sm border",
                activeTab === 'overdue' ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]"
              )}
            >
              <Bell size={20} />
              {overdueTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {overdueTasks.length}
                </span>
              )}
            </button>
            <button className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-[#6B7280] hover:bg-[#F9FAFB] transition-colors shadow-sm">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
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
                    <p className="text-sm text-[#6B7280]">งานที่เพิ่งอัปเดต 5 รายการล่าสุด</p>
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
                      <th className="pb-4 px-2">กำหนดเสร็จ</th>
                      <th className="pb-4 px-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {tasks.slice(0, 10).map((task, index) => (
                      <tr key={task.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-4 px-2 text-xs font-bold text-[#6B7280]">
                          {tasks.length - index}
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-sm font-bold text-[#1A1A1A]">{task.taskName}</p>
                          <p className="text-[10px] text-[#6B7280]">{task.taskType}</p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-xs text-[#4B5563]">{task.unit}</p>
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
                            {overdueTasks.length - index}
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-[#1A1A1A]">{task.taskName}</p>
                            <p className="text-[10px] text-[#6B7280] uppercase font-medium mt-1">{task.taskType}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-medium text-[#4B5563] truncate max-w-[200px]">{task.unit}</p>
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
          <div className="bg-white rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            {/* Filters */}
            <div className="p-6 border-b border-[#E5E7EB] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
                  <input 
                    type="text" 
                    placeholder="ค้นหา Group ID..."
                    className="w-full pl-12 pr-4 py-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    value={groupQuery}
                    onChange={(e) => setGroupQuery(e.target.value)}
                  />
                </div>
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
                      {STATIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 ml-1">ประเภทงาน</label>
                    <select 
                      className="w-full p-3 bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option>ทุกประเภทงาน</option>
                      {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
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
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 ml-1">จัดกลุ่มตาม</label>
                    <select 
                      className="w-full p-3 bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value as any)}
                    >
                      <option value="none">ไม่จัดกลุ่ม</option>
                      <option value="unit">หน่วยงาน</option>
                      <option value="type">ประเภทงาน</option>
                      <option value="status">สถานะ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 ml-1">วันที่เริ่มต้น</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      value={deadlineStart}
                      onChange={(e) => setDeadlineStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 ml-1">วันที่สิ้นสุด</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      value={deadlineEnd}
                      onChange={(e) => setDeadlineEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
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
                    className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 p-2"
                  >
                    <X size={14} /> ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              </div>

            {/* Table (Desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[#6B7280] text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ลำดับ</th>
                    <th className="px-6 py-4">ชื่องาน / ประเภท</th>
                    <th className="px-6 py-4">หน่วยงาน / ผู้รับผิดชอบ</th>
                    <th className="px-6 py-4">ความถี่ / กำหนดเสร็จ</th>
                    <th className="px-6 py-4">ขั้นตอนการดำเนินงาน</th>
                    <th className="px-6 py-4 text-center">สถานะ</th>
                    <th className="px-6 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-20 text-[#6B7280]">กำลังโหลดข้อมูล...</td></tr>
                  ) : Object.keys(groupedTasks).length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-20 text-[#6B7280]">ไม่พบข้อมูลรายการงาน</td></tr>
                  ) : (Object.entries(groupedTasks) as [string, Task[]][]).map(([groupName, groupTasks]) => (
                    <React.Fragment key={groupName}>
                      {groupBy !== 'none' && (
                        <tr className="bg-[#F3F4F6]">
                          <td colSpan={7} className="px-6 py-2 text-sm font-bold text-[#4B5563]">
                            {groupName} ({groupTasks.length})
                          </td>
                        </tr>
                      )}
                      {groupTasks.map((task, index) => (
                        <tr key={task.id} className="hover:bg-[#F9FAFB] transition-colors group">
                          <td className="px-6 py-5 text-xs font-bold text-[#6B7280]">
                            {filteredTasks.length - filteredTasks.indexOf(task)}
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-[#1A1A1A]">{task.taskName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-[#6B7280] uppercase font-medium">{task.taskType}</p>
                              {task.groupId && (
                                <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                                  Group: {task.groupId.slice(-6)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-medium text-[#4B5563] truncate max-w-[150px]">{task.unit}</p>
                            <p className="text-[10px] text-[#6B7280] mt-1 uppercase font-medium">{task.responsible}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-medium">{task.frequency}</p>
                            <p className="text-[10px] text-[#6B7280] mt-1">
                              {task.deadline ? format(parseISO(task.deadline), 'dd/MM/yyyy') : '-'}
                            </p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs text-[#4B5563] line-clamp-2 italic">{task.progress || '-'}</p>
                            {task.attachments && (
                              <a 
                                href={task.attachments} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-purple-600 hover:underline"
                              >
                                <Plus size={10} /> ดูไฟล์แนบ
                              </a>
                            )}
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
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleForwardTask(task)}
                                title="ส่งต่องาน (สร้างรายการใหม่)"
                                className="p-2 text-[#6B7280] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <ArrowUpRight size={18} />
                              </button>
                              <button 
                                onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                                className="p-2 text-[#6B7280] hover:text-[#9333EA] hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card Layout (Mobile) */}
            <div className="md:hidden divide-y divide-[#E5E7EB]">
              {loading ? (
                <div className="text-center py-10 text-[#6B7280]">กำลังโหลดข้อมูล...</div>
              ) : Object.keys(groupedTasks).length === 0 ? (
                <div className="text-center py-10 text-[#6B7280]">ไม่พบข้อมูลรายการงาน</div>
              ) : (Object.entries(groupedTasks) as [string, Task[]][]).map(([groupName, groupTasks]) => (
                <div key={groupName}>
                  {groupBy !== 'none' && (
                    <div className="bg-[#F3F4F6] px-4 py-2 text-xs font-bold text-[#4B5563]">
                      {groupName} ({groupTasks.length})
                    </div>
                  )}
                  <div className="divide-y divide-[#E5E7EB]">
                    {groupTasks.map((task, index) => (
                      <div key={task.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                #{filteredTasks.length - filteredTasks.indexOf(task)}
                              </span>
                              <p className="font-bold text-[#1A1A1A] leading-tight">{task.taskName}</p>
                            </div>
                            <p className="text-[10px] text-[#6B7280] uppercase font-medium mt-1">{task.taskType}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap ml-2",
                            task.status === 'ก่อนเวลา' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            task.status === 'ตรงเวลา' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            task.status === 'ล่าช้า' ? "bg-red-50 text-red-600 border-red-100" :
                            "bg-amber-50 text-amber-600 border-amber-100"
                          )}>
                            {task.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[11px]">
                          <div>
                            <p className="text-[#6B7280] uppercase font-bold text-[9px]">หน่วยงาน</p>
                            <p className="font-medium text-[#4B5563] truncate">{task.unit}</p>
                          </div>
                          <div>
                            <p className="text-[#6B7280] uppercase font-bold text-[9px]">กำหนดเสร็จ</p>
                            <p className="font-medium text-[#4B5563]">
                              {task.deadline ? format(parseISO(task.deadline), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                        </div>

                        {task.progress && (
                          <div className="bg-[#F9FAFB] p-2 rounded-lg border border-[#E5E7EB]">
                            <p className="text-[#6B7280] uppercase font-bold text-[8px] mb-1">ขั้นตอน</p>
                            <p className="text-[11px] text-[#4B5563] italic line-clamp-2">{task.progress}</p>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <div className="flex gap-2">
                            {task.attachments && (
                              <a 
                                href={task.attachments} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-purple-600"
                              >
                                <Plus size={12} /> ไฟล์แนบ
                              </a>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleForwardTask(task)}
                              className="p-2 text-[#6B7280] bg-[#F3F4F6] rounded-lg"
                            >
                              <ArrowUpRight size={16} />
                            </button>
                            <button 
                              onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                              className="p-2 text-[#6B7280] bg-[#F3F4F6] rounded-lg"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-2 text-red-500 bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                
                if (selectedUnits.length === 0) {
                  alert('กรุณาเลือกหน่วยงานที่รับผิดชอบอย่างน้อย 1 แห่ง');
                  return;
                }

                (data as any).unit = selectedUnits.join(', ');
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
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border border-[#E5E7EB] rounded-2xl bg-[#F9FAFB]">
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
