/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import jsPDF from "jspdf";
import logoSquare from "./assets/logo-1.png";
import logoHorizontal from "./assets/logo-horizontal.png";
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  BarChart3, 
  Wallet, 
  User,
  PlusCircle,
  MinusCircle,
  Check,
  Edit2,
  Filter,
  Calendar,
  Hourglass,
  Clock,
  TrendingUp,
  TrendingDown,
  Settings,
  Receipt,
  ShieldCheck,
  Paperclip,
  Camera,
  Trash2,
  RefreshCw,
  ChevronDown,
  File,
} from "lucide-react";

// --- Types ---

type AppScreen = 'onboarding' | 'dashboard' | 'stats' | 'movements' | 'edit-movement' | 'summary' | 'receipt-preview' | 'profile';

interface Movement {
  id: string;
  concept: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'settled' | 'pending';
  date: string;
  notes?: string;
  attachments?: {
    id: string;
    name: string;
    type: 'image' | 'pdf';
    url: string;
  }[];
}

interface ProfileData {
  fullName: string;
  email: string;
  registrationDate: string;
  jobType: string;
  businessName: string;
  employmentType: 'Autónomo' | 'Empresa' | 'Particular';
  autoBackup: boolean;
  backupFrequency: string;
  toolInterest: boolean;
  mgmtInterest: boolean;
  lastAccess: string;
  profilePic: string;
}

// --- Utils ---

const optimizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // JPEG format with 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-outline-variant/30 rounded-3xl p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

// --- Components ---

const TracklyLogoComp = ({ 
  variant = 'light', 
  size = 'md',
  className = "",
  showText = true,
  direction = 'horizontal'
}: { 
  variant?: 'light' | 'dark', 
  size?: 'sm' | 'md' | 'lg',
  className?: string,
  showText?: boolean,
  direction?: 'horizontal' | 'vertical'
}) => {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14"
  };

  const logoSrc = direction === "horizontal" && showText
    ? logoHorizontal
    : logoSquare;

  return (
    <div className={`flex items-center shrink-0 ${className}`}>
      <img
        src={logoSrc}
        alt="Trackly"
        draggable={false}
        loading="eager"
        className={`${sizeClasses[size]} w-auto object-contain select-none block`}
      />
    </div>
  );
};

const ScreenHeader = ({ 
  title, 
  onBack, 
  showStats = false, 
  rightElement,
  customStats
}: { 
  title: string, 
  onBack?: () => void, 
  showStats?: boolean,
  rightElement?: React.ReactNode,
  customStats?: { balance: number, incomes: number, expenses: number }
}) => {
  return (
    <div className="bg-brand-gradient text-white pt-10 pb-16 px-6 relative overflow-hidden">
      <div className="header-shape-1 opacity-20" />
      <div className="header-shape-2 opacity-10" />
      
      <div className="flex justify-between items-center relative z-10 mb-8 gap-4">
        <div className="flex items-center gap-3 shrink-0 min-w-[80px]">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-colors shrink-0">
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
          )}
          <TracklyLogoComp size="sm" className="shrink-0" />
        </div>
        <h1 className="text-lg font-bold tracking-tight truncate flex-1 text-center">{title}</h1>
        <div className="flex justify-end shrink-0 min-w-[80px]">
          {rightElement || (
            <button className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0">
              <User size={22} />
            </button>
          )}
        </div>
      </div>

      {showStats && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 space-y-4"
        >
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] opacity-70 uppercase mb-0.5">Balance Actual</p>
            <p className="text-3xl font-bold font-numeric tracking-tight">
              {customStats ? (customStats.balance >= 0 ? `+${customStats.balance.toLocaleString()}` : customStats.balance.toLocaleString()) : '+1.330,00'} €
            </p>
          </div>
          <div className="flex gap-8 border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase mb-0.5">Ingresos cobrados</p>
              <p className="text-sm font-bold font-numeric">
                +{customStats ? customStats.incomes.toLocaleString() : '2.450,00'} €
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase mb-0.5">Gastos pagados</p>
              <p className="text-sm font-bold font-numeric">
                -{customStats ? customStats.expenses.toLocaleString() : '1.120,00'} €
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const ContentCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-t-[2.5rem] shadow-2xl shadow-black/5 -mt-8 relative z-20 min-h-[70vh] p-6 pb-24 ${className}`}>
    {children}
  </div>
);

const Tabs = [
  { id: 'movements', label: 'Cartera', icon: Wallet },
  { id: 'summary', label: 'Resumen', icon: LayoutDashboard },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'profile', label: 'Perfil', icon: User },
] as const;

const BottomNav = ({ currentScreen, setScreen }: { currentScreen: AppScreen, setScreen: (s: AppScreen) => void }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-outline-variant/30 flex justify-around items-center px-4 z-50">
      {Tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setScreen(tab.id as AppScreen)}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
            currentScreen === tab.id ? 'text-primary' : 'text-on-surface-variant opacity-60 hover:opacity-100'
          }`}
        >
          <tab.icon size={22} className={currentScreen === tab.id ? "text-primary" : ""} fill={currentScreen === tab.id ? "currentColor" : "none"} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

// --- Screens ---

const OnboardingScreen = ({ onNext }: { onNext: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-background">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="mb-10"
    >
      <TracklyLogoComp variant="dark" size="lg" direction="vertical" />
    </motion.div>
    
    <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Bienvenido</h1>
    <p className="text-gray-500 mb-12 max-w-xs">Guarda tus datos para no perder tus cobros si cambias de móvil o reinstalas la app.</p>
    
    <Card className="mb-12 bg-white/50 border-dashed max-w-sm w-full">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white rounded-lg border border-outline-variant/30 shadow-sm">
          <ShieldCheck className="text-primary" size={24} />
        </div>
        <p className="text-left text-sm text-gray-600 leading-snug">
          Tus datos están protegidos bajo estándares de seguridad bancaria.
        </p>
      </div>
    </Card>
    
    <button 
      onClick={onNext}
      className="w-full max-w-sm bg-brand-gradient text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform hover:brightness-110"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" opacity="0.8"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white" opacity="0.6"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" opacity="0.9"/>
      </svg>
      Continuar con Google
    </button>
    
    <div className="mt-12 flex gap-2">
      <div className="w-2 h-2 rounded-full bg-primary"></div>
      <div className="w-2 h-2 rounded-full bg-gray-200"></div>
      <div className="w-2 h-2 rounded-full bg-gray-200"></div>
    </div>
  </div>
);
const StatsScreen = ({ 
  movements, 
  selectedMonth, 
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}: { 
  movements: Movement[], 
  selectedMonth: number,
  setSelectedMonth: (m: number) => void,
  selectedYear: number,
  setSelectedYear: (y: number) => void
}) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  // Helper to filter movements by month/year
  const getMovementsFor = (mIdx: number, year: number) => {
    const monthName = months[mIdx];
    return movements.filter(m => m.date.includes(monthName)); 
    // Note: In a production app with ISO dates, this would be more robust.
  };

  const currentMovements = getMovementsFor(selectedMonth, selectedYear);
  
  const currentIncomes = currentMovements
    .filter(m => m.type === 'income' && m.status === 'settled')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const currentExpenses = currentMovements
    .filter(m => m.type === 'expense' && m.status === 'settled')
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const currentBalance = currentIncomes - currentExpenses;

  // Pending totals (Global)
  const pendingIncomesTotal = movements
    .filter(m => m.type === 'income' && m.status === 'pending')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingExpensesTotal = movements
    .filter(m => m.type === 'expense' && m.status === 'pending')
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  // Comparison with Previous Month
  const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevMovements = getMovementsFor(prevMonthIdx, prevYear);
  
  const prevIncomes = prevMovements
    .filter(m => m.type === 'income' && m.status === 'settled')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const prevExpenses = prevMovements
    .filter(m => m.type === 'expense' && m.status === 'settled')
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const incomeChange = prevIncomes === 0 ? (currentIncomes > 0 ? 100 : 0) : ((currentIncomes - prevIncomes) / prevIncomes) * 100;
  const expenseChange = prevExpenses === 0 ? (currentExpenses > 0 ? 100 : 0) : ((currentExpenses - prevExpenses) / prevExpenses) * 100;

  // Top items
  const topIncome = [...currentMovements]
    .filter(m => m.type === 'income')
    .sort((a, b) => b.amount - a.amount)[0];

  const topExpense = [...currentMovements]
    .filter(m => m.type === 'expense')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

  // Chart Data (Last 4 months)
  const chartData = [3, 2, 1, 0].map(offset => {
    const mIdx = (selectedMonth - offset + 12) % 12;
    const y = selectedMonth - offset < 0 ? selectedYear - 1 : selectedYear;
    const movs = getMovementsFor(mIdx, y);
    const inc = movs.filter(m => m.type === 'income' && m.status === 'settled').reduce((a, c) => a + c.amount, 0);
    const exp = movs.filter(m => m.type === 'expense' && m.status === 'settled').reduce((a, c) => a + Math.abs(c.amount), 0);
    
    // Normalize for height (max 100)
    const maxVal = Math.max(...[0, 1, 2, 3].map(o => {
      const idx = (selectedMonth - o + 12) % 12;
      const yr = selectedMonth - o < 0 ? selectedYear - 1 : selectedYear;
      const m = getMovementsFor(idx, yr);
      return Math.max(
        m.filter(mv => mv.type === 'income' && mv.status === 'settled').reduce((a, c) => a + c.amount, 0),
        m.filter(mv => mv.type === 'expense' && mv.status === 'settled').reduce((a, c) => a + Math.abs(c.amount), 0)
      );
    }), 1);

    return {
      label: months[mIdx],
      inc: (inc / maxVal) * 100,
      exp: (exp / maxVal) * 100,
      current: offset === 0,
      rawInc: inc,
      rawExp: exp
    };
  });

  return (
    <div>
      <ScreenHeader title="Estadísticas" />
      <ContentCard>
        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Monthly Summary Card */}
          <section>
            <div className="bg-gray-50/50 rounded-[2rem] p-6 border border-gray-100/50 shadow-inner">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Resumen de {months[selectedMonth]}</h3>
                <div className="relative inline-flex items-center">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="appearance-none bg-white border-none rounded-xl px-3 py-1.5 pr-8 text-[10px] font-bold text-gray-500 outline-none shadow-sm"
                  >
                    {months.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100/50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Ingresos</p>
                  <p className="text-xs font-bold text-primary">+{currentIncomes.toLocaleString()}€</p>
                </div>
                <div className="text-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100/50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Gastos</p>
                  <p className="text-xs font-bold text-secondary">-{currentExpenses.toLocaleString()}€</p>
                </div>
                <div className="text-center p-3 bg-brand-gradient rounded-2xl shadow-lg shadow-primary/10">
                  <p className="text-[9px] font-bold text-white/70 uppercase mb-1">Balance</p>
                  <p className="text-xs font-bold text-white">{currentBalance >= 0 ? '+' : ''}{currentBalance.toLocaleString()}€</p>
                </div>
              </div>
            </div>
          </section>

          {/* Activity Chart */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Ingresos vs Gastos</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Ing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Gas</span>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between h-44 gap-3 mb-4 px-2">
              {chartData.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
                  <div className="flex gap-1.5 w-full justify-center items-end h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(bar.inc, 5)}%` }}
                      className={`w-4 rounded-t-lg transition-all duration-500 shadow-sm ${bar.current ? 'bg-primary' : 'bg-primary/30'}`} 
                    />
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(bar.exp, 5)}%` }}
                      className={`w-4 rounded-t-lg transition-all duration-500 shadow-sm ${bar.current ? 'bg-secondary' : 'bg-secondary/30'}`} 
                    />
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${bar.current ? 'text-primary' : 'text-gray-400'}`}>
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Pending Totals */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="flex flex-col justify-between p-5 bg-primary/5 border-none">
              <h3 className="font-bold text-[10px] text-primary/60 uppercase tracking-[0.15em] mb-4">A cobrar</h3>
              <div className="flex items-center gap-2 text-primary font-bold">
                <Hourglass size={16} />
                <span className="text-lg font-numeric">+{pendingIncomesTotal.toLocaleString()}€</span>
              </div>
              <p className="text-[9px] text-primary/40 font-bold uppercase mt-2">Total pendiente</p>
            </Card>
            
            <Card className="p-5 bg-secondary/5 border-none">
              <h3 className="font-bold text-[10px] text-secondary/60 uppercase tracking-[0.15em] mb-4">A pagar</h3>
              <div className="flex items-center gap-2 text-secondary font-bold">
                <Clock size={16} />
                <span className="text-lg font-numeric">-{pendingExpensesTotal.toLocaleString()}€</span>
              </div>
              <p className="text-[9px] text-secondary/40 font-bold uppercase mt-2">Total pendiente</p>
            </Card>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 bg-gray-50/50 border-none">
              <h3 className="font-bold text-[10px] text-gray-400 uppercase tracking-[0.15em] mb-4">Ingresos</h3>
              <div className={`flex items-center gap-2 font-bold ${incomeChange >= 0 ? 'text-primary' : 'text-secondary'}`}>
                {incomeChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="text-lg font-numeric">{incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(0)}%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">vs mes anterior</p>
            </Card>
            <Card className="p-5 bg-gray-50/50 border-none">
              <h3 className="font-bold text-[10px] text-gray-400 uppercase tracking-[0.15em] mb-4">Gastos</h3>
              <div className={`flex items-center gap-2 font-bold ${expenseChange <= 0 ? 'text-primary' : 'text-secondary'}`}>
                {expenseChange <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                <span className="text-lg font-numeric">{expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(0)}%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">vs mes anterior</p>
            </Card>
          </div>

          {/* Highlights */}
          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4 px-1">Destacados de {months[selectedMonth]}</h3>
            <div className="space-y-3">
              {topIncome ? (
                <div className="flex items-center gap-4 p-4 bg-gray-50/30 rounded-2xl border border-gray-100/50">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                    <TrendingUp size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{topIncome.concept}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Mayor ingreso</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary font-numeric">+{topIncome.amount.toLocaleString()}€</p>
                  </div>
                </div>
              ) : null}

              {topExpense ? (
                <div className="flex items-center gap-4 p-4 bg-gray-50/30 rounded-2xl border border-gray-100/50">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-secondary">
                    <TrendingDown size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{topExpense.concept}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Mayor gasto</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-secondary font-numeric">-{Math.abs(topExpense.amount).toLocaleString()}€</p>
                  </div>
                </div>
              ) : null}

              {!topIncome && !topExpense && (
                <div className="py-8 text-center bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Sin movimientos este mes</p>
                </div>
              )}
            </div>
          </section>

          <div className="relative h-48 rounded-[2rem] overflow-hidden shadow-2xl shadow-black/5">
            <img 
              src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800" 
              alt="Motivation" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-6">
              <p className="text-white text-xs italic font-medium leading-relaxed opacity-90">"La disciplina financiera te da opciones, la falta de ella te da estrés."</p>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
};

const MovementsScreen = ({ 
  setScreen, 
  movements, 
  onToggleStatus,
  setSelectedMovementId,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  onAddMovement
}: { 
  setScreen: (s: AppScreen) => void, 
  movements: Movement[],
  onToggleStatus: (id: string) => void,
  setSelectedMovementId: (id: string) => void,
  selectedMonth: number,
  setSelectedMonth: (m: number) => void,
  selectedYear: number,
  setSelectedYear: (y: number) => void,
  onAddMovement: (type: 'income' | 'expense') => void
}) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const sliderRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (sliderRef.current) {
      const activeBtn = sliderRef.current.children[selectedMonth] as HTMLElement;
      if (activeBtn) {
        sliderRef.current.scrollTo({
          left: activeBtn.offsetLeft - sliderRef.current.offsetWidth / 2 + activeBtn.offsetWidth / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedMonth]);

  const filteredMovements = movements.filter(m => {
    // For now, our date format is "Ma. 12 May" or similar. 
    // In a real app we'd use ISO dates. Let's assume the date string contains the month name.
    const monthName = months[selectedMonth];
    return m.date.includes(monthName);
  });

  const totalIncomes = filteredMovements
    .filter(m => m.type === 'income' && m.status === 'settled')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = filteredMovements
    .filter(m => m.type === 'expense' && m.status === 'settled')
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const currentBalance = totalIncomes - totalExpenses;

  return (
    <div>
      <ScreenHeader 
        title="Cartera" 
        showStats={true} 
        customStats={{
          balance: currentBalance,
          incomes: totalIncomes,
          expenses: totalExpenses
        }}
      />
      <ContentCard>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* selectors */}
          <div className="space-y-4">
            <div className="flex justify-end px-1">
              <div className="relative inline-flex items-center">
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="appearance-none bg-gray-50 border-none rounded-xl px-4 py-2 pr-9 text-[11px] font-bold text-gray-400 hover:text-gray-900 transition-colors cursor-pointer outline-none shadow-sm"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (sliderRef.current) sliderRef.current.scrollBy({ left: -100, behavior: 'smooth' });
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div 
                ref={sliderRef}
                className="flex-1 flex overflow-x-auto gap-2 pb-2 no-scrollbar px-1"
              >
                {months.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(i)}
                    className={`flex-shrink-0 min-w-[3.5rem] py-2.5 rounded-2xl text-[10px] font-bold uppercase transition-all shadow-sm ${
                      selectedMonth === i 
                        ? 'bg-brand-gradient text-white scale-105 shadow-primary/20' 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => {
                  if (sliderRef.current) sliderRef.current.scrollBy({ left: 100, behavior: 'smooth' });
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-4 px-1">
            <button 
              onClick={() => onAddMovement('income')}
              className="flex-1 bg-brand-gradient text-white py-4 rounded-[1.25rem] font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <PlusCircle size={20} />
              <span className="text-sm">Ingreso</span>
            </button>
            <button 
              onClick={() => onAddMovement('expense')}
              className="flex-1 bg-secondary text-white py-4 rounded-[1.25rem] font-bold flex items-center justify-center gap-3 shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <MinusCircle size={20} />
              <span className="text-sm">Gasto</span>
            </button>
          </div>

          <section>
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Movimientos</h3>
              <Filter size={16} className="text-gray-300 pointer-events-none" />
            </div>
            
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-2">
              {filteredMovements.length > 0 ? filteredMovements.map(item => (
                <div 
                  key={item.id} 
                  className="py-3 px-3 flex items-center gap-3 group border-b border-gray-50 last:border-none hover:bg-gray-50/50 rounded-2xl transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedMovementId(item.id);
                    setScreen('edit-movement');
                  }}
                >
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => onToggleStatus(item.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                        item.status === 'settled' 
                          ? 'bg-primary border-primary shadow-sm shadow-primary/20' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {item.status === 'settled' && <Check size={14} className="text-white" strokeWidth={4} />}
                    </button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                      {item.concept}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider opacity-70">
                      {item.date}
                    </p>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <span className={`text-sm font-bold font-numeric ${item.type === 'income' ? 'text-primary' : 'text-secondary'}`}>
                      {item.amount > 0 ? `+${item.amount}` : item.amount} €
                    </span>
                    <button className="text-gray-200 group-hover:text-primary transition-colors p-1">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-gray-300 text-xs font-bold uppercase tracking-widest">No hay movimientos este mes</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </ContentCard>
    </div>
  );
};

const PendingItem = ({ 
  item, 
  onToggleStatus, 
  onClick 
}: { 
  item: Movement, 
  onToggleStatus: (id: string) => void,
  onClick: () => void 
}) => (
  <div 
    className="py-3 px-2 flex items-center gap-3 border-b border-gray-50 last:border-none hover:bg-gray-50/50 transition-colors cursor-pointer"
    onClick={onClick}
  >
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onToggleStatus(item.id);
      }}
      className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${
        item.status === 'settled' 
          ? 'bg-primary border-primary' 
          : 'bg-white border-gray-200'
      }`}
    >
      {item.status === 'settled' && <Check size={12} className="text-white" strokeWidth={4} />}
    </button>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-gray-900 truncate">{item.concept}</p>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.date}</p>
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold font-numeric ${item.type === 'income' ? 'text-primary' : 'text-secondary'}`}>
        {item.amount > 0 ? `+${item.amount}` : item.amount} €
      </span>
      <Edit2 size={12} className="text-gray-200" />
    </div>
  </div>
);

const SummaryScreen = ({ 
  movements, 
  onToggleStatus, 
  setScreen,
  setSelectedMovementId
}: { 
  movements: Movement[], 
  onToggleStatus: (id: string) => void,
  setScreen: (s: AppScreen) => void,
  setSelectedMovementId: (id: string) => void
}) => {
  const [expandedType, setExpandedType] = React.useState<'income' | 'expense' | null>(null);

  const pendingIncomes = movements.filter(m => m.type === 'income' && m.status === 'pending');
  const pendingExpenses = movements.filter(m => m.type === 'expense' && m.status === 'pending');

  const totalPendingIncome = pendingIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPendingExpense = Math.abs(pendingExpenses.reduce((acc, curr) => acc + curr.amount, 0));

  const totalIncomes = movements.filter(m => m.type === 'income' && m.status === 'settled').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = movements.filter(m => m.type === 'expense' && m.status === 'settled').reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  const historicalBalance = totalIncomes - totalExpenses;

  return (
    <div>
      <ScreenHeader title="Resumen" />
      <ContentCard>
        <div className="max-w-4xl mx-auto space-y-10">
          <section>
            <div className="bg-brand-gradient text-white rounded-[2rem] p-8 relative overflow-hidden flex justify-between items-end shadow-2xl shadow-primary/20">
              <div className="relative z-10">
                <p className="text-[10px] font-bold tracking-[0.2em] opacity-70 uppercase mb-3">Balance Histórico 2026</p>
                <h2 className="text-4xl font-bold tracking-tight font-numeric">
                  {historicalBalance >= 0 ? `+ ${historicalBalance.toLocaleString()}` : `- ${Math.abs(historicalBalance).toLocaleString()}`} €
                </h2>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md relative z-10">
                  <Wallet size={28} strokeWidth={2} />
              </div>
              <div className="header-shape-1 opacity-20" />
              <div className="header-shape-2 opacity-10" />
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-gray-50/50 p-7 group hover:bg-white hover:shadow-2xl transition-all duration-500 rounded-[2rem]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Ingresos Totales</p>
                  <p className="text-3xl font-bold text-primary tracking-tight font-numeric">{totalIncomes.toLocaleString()} €</p>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-primary" 
                />
              </div>
            </Card>
            
            <Card className="border-none bg-gray-50/50 p-7 group hover:bg-white hover:shadow-2xl transition-all duration-500 rounded-[2rem]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Gastos Totales</p>
                  <p className="text-3xl font-bold text-secondary tracking-tight font-numeric">{totalExpenses.toLocaleString()} €</p>
                </div>
                <div className="p-2.5 bg-secondary/10 rounded-xl text-secondary">
                  <TrendingDown size={20} />
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: (totalIncomes > 0 ? (totalExpenses / totalIncomes) * 100 : 0) + '%' }}
                  className="h-full bg-secondary" 
                />
              </div>
            </Card>
          </div>

          {/* New Pendientes Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight px-1">Pendientes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <button 
                  onClick={() => setExpandedType(expandedType === 'income' ? null : 'income')}
                  className={`w-full text-left p-5 rounded-2xl border transition-all flex justify-between items-center ${
                    expandedType === 'income' ? 'bg-primary/5 border-primary/20 ring-4 ring-primary/5' : 'bg-gray-50/50 border-gray-100 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Hourglass size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Pendiente de cobro</p>
                      <p className="text-lg font-bold text-primary font-numeric">+{totalPendingIncome.toLocaleString()} €</p>
                    </div>
                  </div>
                  <ChevronDown size={20} className={`text-gray-300 transition-transform ${expandedType === 'income' ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedType === 'income' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden px-4"
                  >
                    {pendingIncomes.length > 0 ? (
                      pendingIncomes.map(item => (
                        <React.Fragment key={item.id}>
                          <PendingItem 
                            item={item} 
                            onToggleStatus={onToggleStatus}
                            onClick={() => {
                              setSelectedMovementId(item.id);
                              setScreen('edit-movement');
                            }}
                          />
                        </React.Fragment>
                      ))
                    ) : (
                      <p className="py-8 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">No hay cobros pendientes</p>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => setExpandedType(expandedType === 'expense' ? null : 'expense')}
                  className={`w-full text-left p-5 rounded-2xl border transition-all flex justify-between items-center ${
                    expandedType === 'expense' ? 'bg-secondary/5 border-secondary/20 ring-4 ring-secondary/5' : 'bg-gray-50/50 border-gray-100 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Pendiente de pago</p>
                      <p className="text-lg font-bold text-secondary font-numeric">-{totalPendingExpense.toLocaleString()} €</p>
                    </div>
                  </div>
                  <ChevronDown size={20} className={`text-gray-300 transition-transform ${expandedType === 'expense' ? 'rotate-180' : ''}`} />
                </button>

                {expandedType === 'expense' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden px-4"
                  >
                    {pendingExpenses.length > 0 ? (
                      pendingExpenses.map(item => (
                        <React.Fragment key={item.id}>
                          <PendingItem 
                            item={item} 
                            onToggleStatus={onToggleStatus}
                            onClick={() => {
                              setSelectedMovementId(item.id);
                              setScreen('edit-movement');
                            }}
                          />
                        </React.Fragment>
                      ))
                    ) : (
                      <p className="py-8 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">No hay pagos pendientes</p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">Desglose por Trimestres</h3>
              <Calendar size={18} className="text-gray-300" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { q: 'Q1 - Ene-Mar', a: 12400, color: 'bg-primary/5 text-primary' },
                { q: 'Q2 - Abr-Jun', a: 15200, color: 'bg-brand-gradient text-white shadow-lg' },
                { q: 'Q3 - Jul-Sep', a: 14250, color: 'bg-gray-50 text-gray-400' }
              ].map((q, i) => (
                <div key={i} className={`p-5 rounded-2xl flex justify-between items-center transition-all ${q.color}`}>
                  <span className="text-sm font-bold">{q.q}</span>
                  <span className="font-bold font-numeric">+{q.a.toLocaleString()} €</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </ContentCard>
    </div>
  );
};

const ReceiptPreviewScreen = ({ movement, onBack, profile }: { movement: Movement, onBack: () => void, profile: ProfileData }) => {
  const downloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const brandColor = [110, 184, 181]; // Trackly Primary (Teal)
      const secondaryColor = [243, 82, 102]; // For Expenses or Pending (Red)
      const textColor = [31, 41, 55]; // Dark Gray/Black
      const muteColor = [156, 163, 175]; // Light Gray

      // Date Formatting Utility for PDF
      const formatFormalDate = (dateStr: string) => {
        // Simple cleanup: removes day-of-week abbreviations like "Ma. "
        let cleaned = dateStr.replace(/^[A-Za-z]{2}\.\s+/, "");
        // Map months to full names in Spanish
        const monthsMap: Record<string, string> = {
          'Ene': 'Enero', 'Feb': 'Febrero', 'Mar': 'Marzo', 'Abr': 'Abril',
          'May': 'Mayo', 'Jun': 'Junio', 'Jul': 'Julio', 'Ago': 'Agosto',
          'Sep': 'Septiembre', 'Oct': 'Octubre', 'Nov': 'Noviembre', 'Dic': 'Diciembre'
        };
        Object.keys(monthsMap).forEach(m => {
          if (cleaned.includes(m)) cleaned = cleaned.replace(m, monthsMap[m]);
        });
        return cleaned + " 2026"; // App context year
      };

      // 1. CABECERA
      // Stylized Logo Text
      try {
        // We use the imported Logo as a static asset. 
        // Note: For production use with jsPDF, pre-loading as base64 is often better, 
        // but often the path works if handled correctly by Vite's build.
        doc.addImage(logoHorizontal, 'PNG', 20, 15, 40, 12);
      } catch (e) {
        // Fallback to text if image fails
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text("Trackly", 20, 25);
      }

      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("RECIBO", 105, 50, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(muteColor[0], muteColor[1], muteColor[2]);
      doc.text(`#000${movement.id.slice(0, 5).toUpperCase()}`, 105, 58, { align: "center" });
      
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(formatFormalDate(movement.date), 105, 66, { align: "center" });

      // Separator
      doc.setDrawColor(243, 244, 246);
      doc.line(20, 75, 190, 75);

      // 2. BLOQUE DE DATOS (DE / PARA)
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text("DE:", 20, 90);
      doc.text("PARA:", 110, 90);

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(12);
      doc.text(profile.fullName, 20, 98);
      doc.text(movement.concept, 110, 98);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(muteColor[0], muteColor[1], muteColor[2]);
      doc.text(profile.businessName || profile.jobType, 20, 104);
      doc.text(profile.email, 20, 110);
      doc.text("Cliente / Concepto principal", 110, 104);

      // Separator
      doc.line(20, 125, 190, 125);

      // 3. CONCEPTO & DETALLE
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text("CONCEPTO:", 20, 140);
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(13);
      doc.text(movement.concept, 20, 148);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text("DETALLE:", 20, 160);

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const notes = movement.notes || "Sin especificaciones adicionales.";
      const splitNotes = doc.splitTextToSize(notes, 160);
      doc.text(splitNotes, 20, 168);

      // Separator
      doc.line(20, 185, 190, 185);

      // 4. TOTAL (MUY IMPORTANTE)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text("TOTAL", 105, 205, { align: "center" });

      doc.setFontSize(42);
      // Remove negative sign for display, use appropriate color
      const isExpense = movement.type === 'expense';
      const absAmount = Math.abs(movement.amount);
      
      if (isExpense) {
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      } else {
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      }
      doc.text(`${absAmount},00 €`, 105, 222, { align: "center" });

      // 5. ESTADO
      const isSettled = movement.status === 'settled';
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      if (isSettled) {
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text("Estado: COBRADO", 105, 235, { align: "center" });
      } else {
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text("Estado: PENDIENTE", 105, 235, { align: "center" });
      }

      // 9. PIE
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(muteColor[0], muteColor[1], muteColor[2]);
      doc.text("Generado con Trackly", 105, 285, { align: "center" });

      // Filename
      const safeDate = movement.date.replace(/[^a-z0-9]/gi, '_');
      const fileName = `trackly-recibo-${movement.concept.toLowerCase().replace(/\s+/g, '-')}-${safeDate}.pdf`;
      doc.save(fileName);
      alert("Recibo descargado");
    } catch (error) {
      console.error(error);
      alert("No se pudo generar el recibo");
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <ScreenHeader title="Vista previa de recibo" onBack={onBack} />
      <ContentCard className="flex flex-col items-center">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden mb-10 relative">
          {/* Receipt Top Decorative Edge */}
          <div className="h-1.5 bg-primary w-full absolute top-0" />
          
          <div className="p-8 pt-10">
            {/* Receipt Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex flex-col">
                <div className="mb-2">
                  <TracklyLogoComp variant="dark" size="sm" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RECIBO</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900">#000{movement.id}23</p>
                <p className="text-[10px] font-bold text-gray-400">{movement.date}</p>
              </div>
            </div>

            {/* Parties Section */}
            <div className="grid grid-cols-2 gap-6 py-6 border-y border-gray-50 mb-6 font-sans">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">DE:</p>
                <p className="text-sm font-bold text-gray-900 leading-tight">{profile.fullName}</p>
                <p className="text-[10px] font-bold text-gray-400 opacity-70">{profile.businessName || profile.jobType}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">PARA:</p>
                <p className="text-sm font-bold text-gray-900 leading-tight">{movement.concept}</p>
              </div>
            </div>

            {/* Concept/Details */}
            <div className="mb-10">
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">CONCEPTO</p>
                <p className="text-base font-bold text-gray-900">{movement.concept}</p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 italic">
                <p className="text-xs text-gray-500 leading-relaxed text-center">
                  {movement.notes || "Sin notas adicionales para este movimiento."}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center mb-10">
              <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 border shadow-sm ${
                movement.status === 'settled' 
                  ? 'bg-primary/5 border-primary/20 text-primary' 
                  : 'bg-secondary/5 border-secondary/20 text-secondary'
              }`}>
                {movement.status === 'settled' ? <Check size={14} strokeWidth={3} /> : <Clock size={14} strokeWidth={3} />}
                <span className="text-[10px] font-bold uppercase tracking-widest">ESTADO: {movement.status === 'settled' ? 'COBRADO' : 'PENDIENTE'}</span>
              </div>
            </div>

            {/* Total Amount Section */}
            <div className="flex flex-col items-center py-8 border-t border-dashed border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total del Recibo</span>
              <h2 className="text-4xl font-bold text-primary font-numeric">
                {movement.amount > 0 ? `+${movement.amount}` : movement.amount},00 €
              </h2>
            </div>

            {/* Receipt Footer */}
            <div className="mt-4 text-center">
              <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">Generado con Trackly</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-md space-y-4 px-2">
          <button 
            onClick={downloadPDF}
            className="w-full py-5 bg-primary text-white rounded-[1.75rem] text-base font-bold shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
          >
            Descargar PDF
          </button>
          <button className="w-full py-5 border-2 border-primary/20 text-primary rounded-[1.75rem] text-base font-bold bg-white hover:bg-gray-50 active:scale-95 transition-all">
            Compartir
          </button>
          <div className="flex justify-center pt-4">
            <button 
              onClick={onBack}
              className="text-gray-400 font-bold text-[11px] uppercase tracking-widest hover:text-gray-600 transition-colors py-2"
            >
              Volver a detalles
            </button>
          </div>
        </div>
      </ContentCard>
    </div>
  );
};

const ProfileScreen = ({ 
  profile, 
  setProfile, 
  onSave, 
  movements 
}: { 
  profile: ProfileData, 
  setProfile: React.Dispatch<React.SetStateAction<ProfileData>>, 
  onSave: () => void,
  movements: Movement[]
}) => {
  const [showPhotoMenu, setShowPhotoMenu] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const stats = {
    total: movements.length,
    incomes: movements.filter(m => m.type === 'income').length,
    expenses: movements.filter(m => m.type === 'expense').length
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimized = await optimizeImage(file);
        setProfile(prev => ({ ...prev, profilePic: optimized }));
      } catch (err) {
        console.error("Error optimizing image:", err);
        alert("Error al procesar la imagen");
      }
    }
    setShowPhotoMenu(false);
  };

  return (
    <div className="bg-background min-h-screen">
      <ScreenHeader title="Mi Perfil" />
      <ContentCard>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Header Card */}
          <div className="bg-brand-gradient p-6 rounded-[2rem] flex items-center gap-4 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="header-shape-1 opacity-20" />
            
            {/* Hidden Inputs */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <input 
              type="file" 
              ref={cameraInputRef} 
              className="hidden" 
              accept="image/*" 
              capture="user"
              onChange={handleFileChange}
            />

            <div 
              onClick={() => setShowPhotoMenu(true)}
              className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center relative overflow-hidden border-2 border-white/30 backdrop-blur-sm z-10 cursor-pointer group"
            >
              <img 
                alt="Profile" 
                className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                src={profile.profilePic}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
              <div className="absolute bottom-0 right-0 p-1 bg-white/30 backdrop-blur-md rounded-tl-lg scale-0 group-hover:scale-100 origin-bottom-right transition-transform">
                <Edit2 size={10} className="text-white" />
              </div>
            </div>
            <div className="z-10">
              <h2 className="text-xl font-bold tracking-tight">{profile.fullName}</h2>
              <p className="text-xs opacity-80 font-medium font-sans">{profile.email}</p>
            </div>

            {/* Photo Options Menu Overlay */}
            {showPhotoMenu && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center p-6"
                onClick={() => setShowPhotoMenu(false)}
              >
                <motion.div 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden p-2"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-gray-100 text-center">
                    <h3 className="text-sm font-bold text-gray-900">Actualizar foto</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Elige una opción</p>
                  </div>
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-2xl flex items-center justify-center gap-3 transition-colors"
                    >
                      <Camera size={18} className="text-primary" />
                      Tomar foto
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-2xl flex items-center justify-center gap-3 transition-colors"
                    >
                      <Receipt size={18} className="text-primary" />
                      Elegir de galería
                    </button>
                    <div className="h-px bg-gray-100 mx-4 my-1" />
                    <button 
                      onClick={() => setShowPhotoMenu(false)}
                      className="w-full py-4 text-sm font-bold text-secondary hover:bg-gray-50 rounded-2xl transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Section: Datos Básicos */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Datos Básicos</h3>
            <Card className="space-y-5 border-none bg-gray-50/50">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Nombre completo</label>
                <input 
                  type="text" 
                  value={profile.fullName}
                  onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Email</label>
                  <div className="w-full bg-white/50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[11px] font-bold text-gray-400 truncate">
                    {profile.email}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Registro</label>
                  <div className="w-full bg-white/50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[11px] font-bold text-gray-400">
                    {profile.registrationDate}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Section: Información Profesional */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Información Profesional</h3>
            <Card className="space-y-5 border-none bg-gray-50/50">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Tipo de Trabajo</label>
                <div className="relative">
                  <select 
                    value={profile.jobType}
                    onChange={(e) => setProfile(p => ({ ...p, jobType: e.target.value }))}
                    className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                  >
                    <option>Jardinería</option>
                    <option>Electricidad</option>
                    <option>Fontanería</option>
                    <option>Carpintería</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Nombre del Negocio</label>
                <input 
                  type="text" 
                  value={profile.businessName}
                  onChange={(e) => setProfile(p => ({ ...p, businessName: e.target.value }))}
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Trabaja como</label>
                <div className="flex bg-white/50 p-1 rounded-2xl border border-gray-100 gap-1">
                  {(['Autónomo', 'Empresa', 'Particular'] as const).map(type => (
                    <button 
                      key={type}
                      onClick={() => setProfile(p => ({ ...p, employmentType: type }))}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        profile.employmentType === type ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {/* Section: Actividad */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Actividad</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total movimientos', val: stats.total.toString(), color: 'text-gray-900' },
                { label: 'Ingresos', val: stats.incomes.toString(), color: 'text-primary' },
                { label: 'Gastos', val: stats.expenses.toString(), color: 'text-secondary' },
                { label: 'Último acceso', val: profile.lastAccess, color: 'text-gray-900' },
              ].map((stat, i) => (
                <div key={i} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{stat.label}</span>
                  <span className={`text-lg font-bold font-numeric ${stat.color}`}>{stat.val}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Preferencias */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Preferencias</h3>
            <Card className="space-y-6 border-none bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-gray-900 block mb-0.5">Backup automático</span>
                  <span className="text-[10px] font-medium text-gray-400">Protege tus datos en la nube</span>
                </div>
                <div 
                  onClick={() => setProfile(p => ({ ...p, autoBackup: !p.autoBackup }))}
                  className={`w-11 h-6 rounded-full relative p-1 shadow-inner cursor-pointer transition-colors ${profile.autoBackup ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <motion.div 
                    animate={{ x: profile.autoBackup ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-4 h-4 bg-white rounded-full shadow-md" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Frecuencia de Backup</label>
                <div className="relative">
                  <select 
                    value={profile.backupFrequency}
                    onChange={(e) => setProfile(p => ({ ...p, backupFrequency: e.target.value }))}
                    className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                  >
                    <option>Semanal</option>
                    <option>Mensual</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </Card>
          </section>

          {/* Section: Ayúdanos */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Ayúdanos a mejorar</h3>
            <div className="space-y-4 bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-gray-600">¿Te gustaría recibir herramientas o recomendaciones?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setProfile(p => ({ ...p, toolInterest: true }))}
                    className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${profile.toolInterest ? 'border-primary/20 bg-primary/5 text-primary' : 'border-gray-200 text-gray-400'}`}
                  >SÍ</button>
                  <button 
                    onClick={() => setProfile(p => ({ ...p, toolInterest: false }))}
                    className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${!profile.toolInterest ? 'border-secondary/20 bg-secondary/5 text-secondary' : 'border-gray-200 text-gray-400'}`}
                  >NO</button>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-600">¿Te interesa mejorar la gestión de tus cobros?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setProfile(p => ({ ...p, mgmtInterest: true }))}
                    className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${profile.mgmtInterest ? 'border-primary/20 bg-primary/5 text-primary' : 'border-gray-200 text-gray-400'}`}
                  >SÍ</button>
                  <button 
                    onClick={() => setProfile(p => ({ ...p, mgmtInterest: false }))}
                    className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${!profile.mgmtInterest ? 'border-secondary/20 bg-secondary/5 text-secondary' : 'border-gray-200 text-gray-400'}`}
                  >NO</button>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="pt-4 pb-12">
            <button 
              onClick={onSave}
              className="w-full h-16 bg-brand-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Settings size={20} />
              Guardar cambios
            </button>
          </div>
        </div>
      </ContentCard>
    </div>
  );
};

const EditMovementScreen = ({ 
  movement, 
  setScreen,
  onSave,
  onDelete
}: { 
  movement: Movement, 
  setScreen: (s: AppScreen) => void,
  onSave: (m: Movement) => void,
  onDelete: (id: string) => void
}) => {
  const [edited, setEdited] = React.useState<Movement>(movement);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave(edited);
  };

  const handleDelete = () => {
    if (window.confirm('¿Seguro que quieres eliminar este movimiento?')) {
      onDelete(movement.id);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const type: 'image' | 'pdf' = file.type.includes('pdf') ? 'pdf' : 'image';
      if (type === 'pdf' && isCamera) return;

      let resultUrl: string;
      if (type === 'image') {
        resultUrl = await optimizeImage(file);
      } else {
        // For PDFs, we just read as DataURL as before since we can't "canvas-compress" them easily here
        resultUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const newAttachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type,
        url: resultUrl
      };
      setEdited(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment]
      }));
    } catch (err) {
      console.error("Error handling file:", err);
      alert("Error al procesar el archivo");
    }
  };

  const removeAttachment = (id: string) => {
    setEdited(prev => ({
      ...prev,
      attachments: prev.attachments?.filter(a => a.id !== id)
    }));
  };

  return (
    <div className="bg-background min-h-screen">
      <ScreenHeader title="Detalles" onBack={() => setScreen('movements')} />
      <ContentCard>
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Hidden Inputs */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,.pdf" 
            onChange={(e) => handleFile(e, false)} 
          />
          <input 
            type="file" 
            ref={cameraInputRef} 
            className="hidden" 
            accept="image/*" 
            capture="environment" 
            onChange={(e) => handleFile(e, true)} 
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-gradient p-7 rounded-[2rem] text-white shadow-xl shadow-primary/20 relative overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Receipt size={28} />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-lg opacity-90">{edited.concept}</p>
                  <p className="text-xs opacity-60 font-medium">Actualizado recientemente</p>
                </div>
              </div>
              <p className="text-3xl font-bold font-numeric tracking-tight">{edited.amount > 0 ? `+${edited.amount}` : edited.amount} €</p>
            </div>
            <div className="header-shape-1" />
          </motion.div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 opacity-70">Concepto del movimiento</label>
              <input 
                type="text" 
                value={edited.concept}
                onChange={(e) => setEdited(prev => ({ ...prev, concept: e.target.value }))}
                className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-5 text-base font-bold focus:bg-white focus:ring-4 ring-primary/5 outline-none transition-all shadow-inner"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 opacity-70">Cantidad</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-bold">€</span>
                  <input 
                    type="number" 
                    value={Math.abs(edited.amount)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEdited(prev => ({ ...prev, amount: prev.type === 'income' ? val : -val }));
                    }}
                    className="w-full bg-gray-50 border-none rounded-[1.5rem] pl-10 pr-6 py-5 text-lg font-bold text-gray-900 focus:bg-white focus:ring-4 ring-primary/5 outline-none transition-all shadow-inner font-numeric"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 opacity-70">Fecha</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={edited.date}
                    onChange={(e) => setEdited(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-5 text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 ring-primary/5 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 opacity-70">Notas</label>
              <textarea 
                value={edited.notes || ''}
                onChange={(e) => setEdited(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-5 text-sm font-medium text-gray-600 focus:bg-white focus:ring-4 ring-primary/5 outline-none transition-all shadow-inner min-h-[100px]"
                placeholder="Añade notas aquí..."
              />
            </div>
          </div>

          <section className="bg-gray-50/50 p-7 rounded-[2rem] border border-gray-100/50">
            <div className="flex items-center gap-3 mb-6 px-1">
              <div className="p-2 bg-white rounded-xl shadow-sm text-primary">
                <RefreshCw size={18} />
              </div>
              <h3 className="font-bold text-sm text-gray-800">Estado del Movimiento</h3>
            </div>
            <div className="flex bg-white/50 p-2 rounded-2xl border border-gray-100 shadow-inner">
              <button 
                onClick={() => setEdited(prev => ({ ...prev, status: 'settled' }))}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${edited.status === 'settled' ? 'bg-brand-gradient text-white shadow-lg shadow-primary/20' : 'text-gray-300'}`}
              >
                {edited.type === 'income' ? 'Cobrado' : 'Pagado'}
              </button>
              <button 
                onClick={() => setEdited(prev => ({ ...prev, status: 'pending' }))}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${edited.status === 'pending' ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-gray-300'}`}
              >
                Pendiente
              </button>
            </div>
          </section>

          {/* Attachments Display */}
          {(edited.attachments?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {edited.attachments?.map((att) => (
                <div key={att.id} className="relative group bg-white border border-gray-100 rounded-2xl p-2 flex items-center gap-3 shadow-sm">
                  {att.type === 'image' ? (
                    <img src={att.url} alt={att.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">
                      <File size={20} />
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-gray-500 truncate flex-1">{att.name}</span>
                  <button 
                    onClick={() => removeAttachment(att.id)}
                    className="p-1.5 text-gray-400 hover:text-secondary bg-gray-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pb-8">
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="bg-white border-2 border-dashed border-gray-100 py-8 rounded-[2rem] flex flex-col items-center gap-3 text-gray-400 hover:text-primary hover:bg-gray-50 transition-all"
            >
              <Camera size={28} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Cámara</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border-2 border-dashed border-gray-100 py-8 rounded-[2rem] flex flex-col items-center gap-3 text-gray-400 hover:text-primary hover:bg-gray-50 transition-all"
            >
              <PlusCircle size={28} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Adjuntar</span>
            </button>
          </div>

          <div className="space-y-4 pt-10">
            <button 
              onClick={handleSave}
              className="w-full bg-brand-gradient text-white py-5 rounded-[1.75rem] text-base font-bold shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all text-center"
            >
              Guardar cambios
            </button>
            
            <button 
              onClick={() => setScreen('receipt-preview')}
              className="w-full bg-gray-900 text-white py-5 rounded-[1.75rem] text-base font-bold shadow-xl shadow-gray-900/10 hover:brightness-125 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <Receipt size={20} />
              Generar recibo
              <span className="absolute right-6 bg-brand-gradient text-[9px] px-2 py-0.5 rounded-full tracking-widest group-hover:scale-110 transition-transform">PRO</span>
            </button>

            <button 
              onClick={handleDelete}
              className="w-full text-secondary/40 py-3 text-[10px] font-bold uppercase tracking-[0.25em] flex items-center justify-center gap-2 hover:text-secondary hover:bg-secondary/5 rounded-2xl transition-all"
            >
              <Trash2 size={14} />
              Eliminar Registro
            </button>
          </div>
        </div>
      </ContentCard>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [screen, setScreen] = React.useState<AppScreen>('onboarding');
  const [selectedMovementId, setSelectedMovementId] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState(4); // Mayo
  const [selectedYear, setSelectedYear] = React.useState(2026);
  const [toast, setToast] = React.useState<string | null>(null);
  
  const [movements, setMovements] = React.useState<Movement[]>([
    { id: '3', concept: 'Jardín Casa López', amount: 120, type: 'income', status: 'settled', date: 'Ma. 12 May', notes: 'Mantenimiento mensual: Corte de césped, poda de setos y abono trimestral.' },
    { id: '4', concept: 'Jardín Casa Miguel', amount: 90, type: 'income', status: 'pending', date: 'Lu. 10 May', notes: 'Limpieza general de jardín delantero.' },
    { id: '5', concept: 'Combustible Furgón', amount: -45, type: 'expense', status: 'settled', date: 'Vi. 08 May', notes: 'Gasolinera Repsol.' },
    { id: '6', concept: 'Materiales Almacén', amount: -180, type: 'expense', status: 'pending', date: 'Ma. 05 May', notes: 'Compra de fertilizantes y semillas.' },
    { id: '7', concept: 'Reparación Piscina', amount: 350, type: 'income', status: 'settled', date: 'Sa. 02 May', notes: 'Reparación de fuga en sistema de filtrado.' },
  ]);

  const [profile, setProfile] = React.useState<ProfileData>({
    fullName: 'Alejandro Lopez',
    email: 'mail.serinco@gmail.com',
    registrationDate: '12 de Abril, 2026',
    jobType: 'Jardinería',
    businessName: 'López Jardines',
    employmentType: 'Autónomo',
    autoBackup: true,
    backupFrequency: 'Mensual',
    toolInterest: true,
    mgmtInterest: false,
    lastAccess: 'Hoy',
    profilePic: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnregE4Cc8vUrpeFz8mP7GFvDStonKJ8WgdDxyQrbDdUXNKS1COUpMwS58TzEqUtNggN77w7O89UoEmNkhY9yTbj3PgGpK8Ly-6HQW-OCE0enD2uDly124zmuImGiuXo9uhb31Ive731XeOrrhp7ZM6LS6sULohIxwFB_o7cU05eHoFogulkPnrHXLE8sDP7RQh_Pjvh-rR_iUhEht1q5u7LwGywhMFn2_4nhNOkNZt6eSn3Ek1IavczPTKaS0-cGf5ahnAVOV2sTZ'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleMovementStatus = (id: string) => {
    setMovements(prev => prev.map(m => 
      m.id === id ? { ...m, status: m.status === 'settled' ? 'pending' : 'settled' } : m
    ));
  };

  const currentMovement = movements.find(m => m.id === selectedMovementId) || movements[0];

  const handleAddMovement = (type: 'income' | 'expense') => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const newMovement: Movement = {
      id: Math.random().toString(36).substr(2, 9),
      concept: type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Gasto',
      amount: type === 'income' ? 100 : -100,
      type: type,
      status: 'pending',
      date: `Ho. ${new Date().getDate()} ${months[selectedMonth]}`,
      notes: ''
    };
    setMovements(prev => [newMovement, ...prev]);
    setSelectedMovementId(newMovement.id);
    setScreen('edit-movement');
  };

  const handleSaveMovement = (updated: Movement) => {
    setMovements(prev => prev.map(m => m.id === updated.id ? updated : m));
    showToast('Cambios guardados');
  };

  const handleDeleteMovement = (id: string) => {
    setMovements(prev => prev.filter(m => m.id !== id));
    setScreen('movements');
    showToast('Movimiento eliminado');
  };

  const handleSaveProfile = () => {
    showToast('Perfil guardado');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding': return <OnboardingScreen onNext={() => setScreen('movements')} />;
      case 'stats': return (
        <StatsScreen 
          movements={movements} 
          selectedMonth={selectedMonth} 
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />
      );
      case 'movements': return (
        <MovementsScreen 
          setScreen={setScreen} 
          movements={movements} 
          onToggleStatus={toggleMovementStatus} 
          setSelectedMovementId={setSelectedMovementId}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onAddMovement={handleAddMovement}
        />
      );
      case 'summary': return (
        <SummaryScreen 
          movements={movements} 
          onToggleStatus={toggleMovementStatus} 
          setScreen={setScreen} 
          setSelectedMovementId={setSelectedMovementId}
        />
      );
      case 'edit-movement': return (
        <EditMovementScreen 
          movement={currentMovement} 
          setScreen={setScreen}
          onSave={handleSaveMovement}
          onDelete={handleDeleteMovement}
        />
      );
      case 'receipt-preview': return (
        <ReceiptPreviewScreen 
          movement={currentMovement} 
          onBack={() => setScreen('edit-movement')} 
          profile={profile}
        />
      );
      case 'profile': return (
        <ProfileScreen 
          profile={profile} 
          setProfile={setProfile} 
          onSave={handleSaveProfile} 
          movements={movements}
        />
      );
      default: return (
        <MovementsScreen 
          setScreen={setScreen} 
          movements={movements} 
          onToggleStatus={toggleMovementStatus} 
          setSelectedMovementId={setSelectedMovementId}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onAddMovement={handleAddMovement}
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 16 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl"
        >
          {toast}
        </motion.div>
      )}
      <main className="relative">
        <motion.div
           key={screen}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 0.3 }}
        >
          {renderScreen()}
        </motion.div>
      </main>

      {screen !== 'onboarding' && (
        <BottomNav currentScreen={screen} setScreen={setScreen} />
      )}
    </div>
  );
}
