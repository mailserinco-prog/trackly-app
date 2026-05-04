/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import jsPDF from "jspdf";
import { tracklyLogoHorizontalBase64 } from "./assets/tracklyLogoBase64";
import { tracklyLogoSquareBase64 } from "./assets/tracklyLogoSquareBase64";
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
  CreditCard,
} from "lucide-react";

// --- Types ---

type AppScreen = 'onboarding' | 'dashboard' | 'stats' | 'movements' | 'edit-movement' | 'summary' | 'receipt-preview' | 'profile';

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  note?: string;
}

interface Movement {
  id: string;
  concept: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'settled' | 'pending';
  date: string;
  notes?: string;
  paidAmount?: number;
  payments?: Payment[];
  currency?: string;
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
  language?: string;
  currency?: string;
}

// --- Utils ---

const formatCurrency = (amount: number, currency: string = 'EUR', language: string = 'es') => {
  const locale = language === 'en' ? 'en-US' : 'es-ES';
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || 'EUR'
  }).format(amount);
};

const getMovementPaidAmount = (movement: Movement) => {
  if (movement.paidAmount !== undefined) return movement.paidAmount;
  return movement.status === 'settled' ? Math.abs(movement.amount) : 0;
};

const getMovementPendingAmount = (movement: Movement) => {
  const paid = getMovementPaidAmount(movement);
  return Math.max(0, Math.abs(movement.amount) - paid);
};

const getMovementProgress = (movement: Movement) => {
  const paid = getMovementPaidAmount(movement);
  const total = Math.abs(movement.amount);
  if (total === 0) return 0;
  return (paid / total) * 100;
};

const isMovementFullyCompleted = (movement: Movement) => {
  return getMovementPaidAmount(movement) >= Math.abs(movement.amount);
};

const isMovementPartiallyCompleted = (movement: Movement) => {
  const paid = getMovementPaidAmount(movement);
  return paid > 0 && paid < Math.abs(movement.amount);
};

const getPaymentStatus = (movement: Movement) => {
  const paid = getMovementPaidAmount(movement);
  if (paid <= 0) return 'pendiente';
  if (paid < Math.abs(movement.amount)) return 'parcial';
  return 'cobrado';
};

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

const getCurrencySymbol = (currency: string = 'EUR') => {
  switch (currency) {
    case 'USD': return '$';
    case 'GBP': return '£';
    case 'EUR': return '€';
    case 'MXN': return '$';
    case 'ARS': return '$';
    default: return '€';
  }
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
    ? tracklyLogoHorizontalBase64
    : tracklyLogoSquareBase64;

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
  customStats,
  currency = 'EUR',
  language = 'es'
}: { 
  title: string, 
  onBack?: () => void, 
  showStats?: boolean,
  rightElement?: React.ReactNode,
  customStats?: { balance: number, incomes: number, expenses: number },
  currency?: string,
  language?: string
}) => {
  const { t } = useTranslation();
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
            <p className="text-[10px] font-bold tracking-[0.15em] opacity-70 uppercase mb-0.5">{t('wallet.totalBalance')}</p>
            <p className="text-3xl font-bold font-numeric tracking-tight">
              {formatCurrency(customStats ? customStats.balance : 1330, currency, language)}
            </p>
          </div>
          <div className="flex gap-8 border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase mb-0.5">{t('wallet.collected')}</p>
              <p className="text-sm font-bold font-numeric">
                {formatCurrency(customStats ? customStats.incomes : 2450, currency, language)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase mb-0.5">{t('wallet.pending')}</p>
              <p className="text-sm font-bold font-numeric">
                {formatCurrency(customStats ? customStats.expenses : 1120, currency, language)}
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

const BottomNav = ({ currentScreen, setScreen }: { currentScreen: AppScreen, setScreen: (s: AppScreen) => void }) => {
  const { t } = useTranslation();
  
  const Tabs = [
    { id: 'movements', label: t('nav.wallet'), icon: Wallet },
    { id: 'summary', label: t('nav.summary'), icon: LayoutDashboard },
    { id: 'stats', label: t('nav.stats'), icon: BarChart3 },
    { id: 'profile', label: t('nav.profile'), icon: User },
  ] as const;

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

const OnboardingScreen = ({ onNext }: { onNext: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-background">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-10"
      >
        <TracklyLogoComp variant="dark" size="lg" direction="vertical" />
      </motion.div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">{t('onboarding.welcome')}</h1>
      <p className="text-gray-500 mb-12 max-w-xs">{t('onboarding.subtitle')}</p>
      
      <Card className="mb-12 bg-white/50 border-dashed max-w-sm w-full">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-lg border border-outline-variant/30 shadow-sm">
            <ShieldCheck className="text-primary" size={24} />
          </div>
          <p className="text-left text-sm text-gray-600 leading-snug">
            {t('onboarding.securityText')}
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
        {t('onboarding.continueWithGoogle')}
      </button>
      
      <div className="mt-12 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-primary"></div>
        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
      </div>
    </div>
  );
};
const StatsScreen = ({ 
  movements, 
  selectedMonth, 
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  currency = 'EUR',
  language = 'es'
}: { 
  movements: Movement[], 
  selectedMonth: number,
  setSelectedMonth: (m: number) => void,
  selectedYear: number,
  setSelectedYear: (y: number) => void,
  currency?: string,
  language?: string
}) => {
  const { t } = useTranslation();
  const months = [
    t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'), 
    t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'), 
    t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec')
  ];
  
  // Helper to filter movements by month/year
  const getMovementsFor = (mIdx: number, year: number) => {
    // In a real app we'd use a robust date check, for now we keep the concept matching
    const monthNamesES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthName = monthNamesES[mIdx];
    return movements.filter(m => m.date.includes(monthName)); 
  };

  const currentMovements = getMovementsFor(selectedMonth, selectedYear);
  
  const currentIncomes = currentMovements
    .filter(m => m.type === 'income')
    .reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);
    
  const currentExpenses = currentMovements
    .filter(m => m.type === 'expense')
    .reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);

  const currentBalance = currentIncomes - currentExpenses;

  // Pending totals (Global)
  const pendingIncomesTotal = movements
    .filter(m => m.type === 'income' && !isMovementFullyCompleted(m))
    .reduce((acc, curr) => acc + getMovementPendingAmount(curr), 0);

  const pendingExpensesTotal = movements
    .filter(m => m.type === 'expense' && !isMovementFullyCompleted(m))
    .reduce((acc, curr) => acc + getMovementPendingAmount(curr), 0);

  // Comparison with Previous Month
  const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevMovements = getMovementsFor(prevMonthIdx, prevYear);
  
  const prevIncomes = prevMovements
    .filter(m => m.type === 'income')
    .reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);
    
  const prevExpenses = prevMovements
    .filter(m => m.type === 'expense')
    .reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);

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
    const inc = movs.filter(m => m.type === 'income').reduce((a, c) => a + getMovementPaidAmount(c), 0);
    const exp = movs.filter(m => m.type === 'expense').reduce((a, c) => a + getMovementPaidAmount(c), 0);
    
    // Normalize for height (max 100)
    const maxVal = Math.max(...[0, 1, 2, 3].map(o => {
      const idx = (selectedMonth - o + 12) % 12;
      const yr = selectedMonth - o < 0 ? selectedYear - 1 : selectedYear;
      const m = getMovementsFor(idx, yr);
      return Math.max(
        m.filter(mv => mv.type === 'income').reduce((a, c) => a + getMovementPaidAmount(c), 0),
        m.filter(mv => mv.type === 'expense').reduce((a, c) => a + getMovementPaidAmount(c), 0)
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
      <ScreenHeader title={t('stats.title')} currency={currency} language={language} />
      <ContentCard>
        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Monthly Summary Card */}
          <section>
            <div className="bg-gray-50/50 rounded-[2rem] p-6 border border-gray-100/50 shadow-inner">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('summary.title')} {months[selectedMonth]}</h3>
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
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{t('common.income')}</p>
                  <p className="text-xs font-bold text-primary">{formatCurrency(currentIncomes, currency, language)}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100/50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{t('common.expense')}</p>
                  <p className="text-xs font-bold text-secondary">{formatCurrency(currentExpenses, currency, language)}</p>
                </div>
                <div className="text-center p-3 bg-brand-gradient rounded-2xl shadow-lg shadow-primary/10">
                  <p className="text-[9px] font-bold text-white/70 uppercase mb-1">{t('common.balance')}</p>
                  <p className="text-xs font-bold text-white">{formatCurrency(currentBalance, currency, language)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Activity Chart */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('stats.distribution')}</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{t('common.income').slice(0, 3)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{t('common.expense').slice(0, 3)}</span>
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
              <h3 className="font-bold text-[10px] text-primary/60 uppercase tracking-[0.15em] mb-4">{t('status.pending')} ({t('common.income')})</h3>
              <div className="flex items-center gap-2 text-primary font-bold">
                <Hourglass size={16} />
                <span className="text-lg font-numeric">{formatCurrency(pendingIncomesTotal, currency, language)}</span>
              </div>
              <p className="text-[9px] text-primary/40 font-bold uppercase mt-2">{t('common.total')} {t('status.pending')}</p>
            </Card>
            
            <Card className="p-5 bg-secondary/5 border-none">
              <h3 className="font-bold text-[10px] text-secondary/60 uppercase tracking-[0.15em] mb-4">{t('status.pending')} ({t('common.expense')})</h3>
              <div className="flex items-center gap-2 text-secondary font-bold">
                <Clock size={16} />
                <span className="text-lg font-numeric">{formatCurrency(pendingExpensesTotal, currency, language)}</span>
              </div>
              <p className="text-[9px] text-secondary/40 font-bold uppercase mt-2">{t('common.total')} {t('status.pending')}</p>
            </Card>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 bg-gray-50/50 border-none">
              <h3 className="font-bold text-[10px] text-gray-400 uppercase tracking-[0.15em] mb-4">{t('common.income')}</h3>
              <div className={`flex items-center gap-2 font-bold ${incomeChange >= 0 ? 'text-primary' : 'text-secondary'}`}>
                {incomeChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="text-lg font-numeric">{incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(0)}%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">{t('summary.prevMonthComparison')}</p>
            </Card>
            <Card className="p-5 bg-gray-50/50 border-none">
              <h3 className="font-bold text-[10px] text-gray-400 uppercase tracking-[0.15em] mb-4">{t('common.expense')}</h3>
              <div className={`flex items-center gap-2 font-bold ${expenseChange <= 0 ? 'text-primary' : 'text-secondary'}`}>
                {expenseChange <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                <span className="text-lg font-numeric">{expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(0)}%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">{t('summary.prevMonthComparison')}</p>
            </Card>
          </div>

          {/* Highlights */}
          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4 px-1">{t('common.total')} {months[selectedMonth]}</h3>
            <div className="space-y-3">
              {topIncome ? (
                <div className="flex items-center gap-4 p-4 bg-gray-50/30 rounded-2xl border border-gray-100/50">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                    <TrendingUp size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{topIncome.concept}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{t('stats.incomeByCat')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary font-numeric">{formatCurrency(topIncome.amount, currency, language)}</p>
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{t('stats.expenseByCat')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-secondary font-numeric">{formatCurrency(topExpense.amount, currency, language)}</p>
                  </div>
                </div>
              ) : null}

              {!topIncome && !topExpense && (
                <div className="py-8 text-center bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{t('wallet.empty')}</p>
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
  onUpdateMovement,
  setSelectedMovementId,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  onAddMovement,
  currency = 'EUR',
  language = 'es'
}: { 
  setScreen: (s: AppScreen) => void, 
  movements: Movement[],
  onToggleStatus: (id: string) => void,
  onUpdateMovement: (m: Movement) => void,
  setSelectedMovementId: (id: string) => void,
  selectedMonth: number,
  setSelectedMonth: (m: number) => void,
  selectedYear: number,
  setSelectedYear: (y: number) => void,
  onAddMovement: (type: 'income' | 'expense') => void,
  currency?: string,
  language?: string
}) => {
  const { t } = useTranslation();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const sliderRef = React.useRef<HTMLDivElement>(null);
  
  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [selectedMovForPayment, setSelectedMovForPayment] = React.useState<Movement | null>(null);
  const [editingPaymentId, setEditingPaymentId] = React.useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState<number>(0);
  const [paymentMethod, setPaymentMethod] = React.useState('Efectivo');
  const [paymentNote, setPaymentNote] = React.useState('');
  
  // Sub-lists visibility
  const [showPaymentsForId, setShowPaymentsForId] = React.useState<string | null>(null);

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
    const monthName = months[selectedMonth];
    return m.date.includes(monthName);
  });

  const totalIncomes = filteredMovements
    .filter(m => m.type === 'income')
    .reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);

  const totalExpenses = filteredMovements
    .filter(m => m.type === 'expense')
    .reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);

  const currentBalance = totalIncomes - totalExpenses;

  const handleOpenPaymentModal = (m: Movement, p?: Payment) => {
    setSelectedMovForPayment(m);
    if (p) {
      setEditingPaymentId(p.id);
      setPaymentAmount(p.amount);
      setPaymentMethod(p.method);
      setPaymentNote(p.note || '');
    } else {
      setEditingPaymentId(null);
      const pending = getMovementPendingAmount(m);
      setPaymentAmount(pending);
      setPaymentMethod('Efectivo');
      setPaymentNote('');
    }
    setPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    if (!selectedMovForPayment || paymentAmount <= 0) return;
    
    const otherPayments = (selectedMovForPayment.payments || []).filter(p => p.id !== editingPaymentId);
    const otherPaidSum = otherPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalAmount = Math.abs(selectedMovForPayment.amount);
    
    if (otherPaidSum + paymentAmount > totalAmount) {
      alert(t('payment.amountError'));
      return;
    }

    let updatedPayments: Payment[];
    if (editingPaymentId) {
      updatedPayments = (selectedMovForPayment.payments || []).map(p => 
        p.id === editingPaymentId 
          ? { ...p, amount: paymentAmount, method: paymentMethod, note: paymentNote } 
          : p
      );
    } else {
      const newPayment: Payment = {
        id: Math.random().toString(36).substr(2, 9),
        amount: paymentAmount,
        date: new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US'),
        method: paymentMethod,
        note: paymentNote
      };
      updatedPayments = [...(selectedMovForPayment.payments || []), newPayment];
    }

    const updatedPaidAmount = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const isSettled = updatedPaidAmount >= totalAmount;

    const updatedMovement: Movement = {
      ...selectedMovForPayment,
      paidAmount: updatedPaidAmount,
      payments: updatedPayments,
      status: isSettled ? 'settled' : 'pending'
    };

    onUpdateMovement(updatedMovement);
    setPaymentModalOpen(false);
    setSelectedMovForPayment(null);
    setEditingPaymentId(null);
  };

  const handleDeletePayment = (m: Movement, paymentId: string) => {
    if (!confirm(t('payment.deleteConfirm'))) return;

    const updatedPayments = (m.payments || []).filter(p => p.id !== paymentId);
    const updatedPaidAmount = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalAmount = Math.abs(m.amount);
    const isSettled = updatedPaidAmount >= totalAmount;

    const updatedMovement: Movement = {
      ...m,
      paidAmount: updatedPaidAmount,
      payments: updatedPayments,
      status: isSettled ? 'settled' : 'pending'
    };

    onUpdateMovement(updatedMovement);
  };

  const handleMarkAsSettled = (m: Movement) => {
    const pending = getMovementPendingAmount(m);
    const totalAmount = Math.abs(m.amount);
    if (pending <= 0) return;

    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      amount: pending,
      date: new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US'),
      method: 'Efectivo',
      note: t('payment.autoNote', { type: m.type === 'income' ? t('status.collected') : t('status.paid') })
    };

    const updatedMovement: Movement = {
      ...m,
      paidAmount: totalAmount,
      payments: [...(m.payments || []), newPayment],
      status: 'settled'
    };

    onUpdateMovement(updatedMovement);
  };

  return (
    <div>
      <ScreenHeader 
        title={t('wallet.title')}
        showStats={true} 
        customStats={{
          balance: currentBalance,
          incomes: totalIncomes,
          expenses: totalExpenses
        }}
        currency={currency}
        language={language}
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
              <span className="text-sm">{t('movement.income')}</span>
            </button>
            <button 
              onClick={() => onAddMovement('expense')}
              className="flex-1 bg-secondary text-white py-4 rounded-[1.25rem] font-bold flex items-center justify-center gap-3 shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <MinusCircle size={20} />
              <span className="text-sm">{t('movement.expense')}</span>
            </button>
          </div>

          <section>
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{t('wallet.movements')}</h3>
              <Filter size={16} className="text-gray-300 pointer-events-none" />
            </div>
            
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-2">
              {filteredMovements.length > 0 ? filteredMovements.map(item => {
                const paid = getMovementPaidAmount(item);
                const pending = getMovementPendingAmount(item);
                const progress = getMovementProgress(item);
                const isIncome = item.type === 'income';
                const isCompleted = isMovementFullyCompleted(item);
                const isPartial = isMovementPartiallyCompleted(item);

                return (
                  <div key={item.id} className="border-b border-gray-50 last:border-none hover:bg-gray-50/50 rounded-2xl transition-colors">
                    <div 
                      className="py-3 px-3 flex items-center gap-3 group cursor-pointer"
                      onClick={() => {
                        setSelectedMovementId(item.id);
                        setScreen('edit-movement');
                      }}
                    >
                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => onToggleStatus(item.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                            isCompleted 
                              ? 'bg-primary border-primary shadow-sm shadow-primary/20' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          {isCompleted && <Check size={14} className="text-white" strokeWidth={4} />}
                        </button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                            {item.concept}
                          </p>
                          {isPartial && (
                            <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">{t('status.partial')}</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider opacity-70">
                          {item.date}
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold font-numeric ${isIncome ? 'text-primary' : 'text-secondary'}`}>
                            {formatCurrency(item.amount, item.currency || currency, language)}
                          </span>
                        </div>
                        <Edit2 size={16} className="text-gray-200 group-hover:text-primary transition-colors" />
                      </div>
                    </div>

                    {/* Partial Payment UI */}
                    {!isCompleted && (
                      <div className="px-4 pb-4 pt-1 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gray-50 p-2 rounded-xl text-center">
                            <p className="text-[8px] font-bold text-gray-400 uppercase">{t('common.total')}</p>
                            <p className="text-[10px] font-bold text-gray-700">{formatCurrency(Math.abs(item.amount), item.currency || currency, language)}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded-xl text-center">
                            <p className="text-[8px] font-bold text-green-400 uppercase">{isIncome ? t('status.collected') : t('status.paid')}</p>
                            <p className="text-[10px] font-bold text-green-700">{formatCurrency(paid, item.currency || currency, language)}</p>
                          </div>
                          <div className="bg-amber-50 p-2 rounded-xl text-center">
                            <p className="text-[8px] font-bold text-amber-400 uppercase">{t('status.pending')}</p>
                            <p className="text-[10px] font-bold text-amber-700">{formatCurrency(pending, item.currency || currency, language)}</p>
                          </div>
                        </div>

                        {paid > 0 && (
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className="h-full bg-green-500"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPaymentModal(item);
                            }}
                            className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                          >
                            <PlusCircle size={12} />
                            {isIncome ? t('payment.registerIncome') : t('payment.registerExpense')}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsSettled(item);
                            }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                          >
                            <Check size={12} />
                            {isIncome ? t('payment.markCollected') : t('payment.markPaid')}
                          </button>
                          
                          {(item.payments?.length ?? 0) > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPaymentsForId(showPaymentsForId === item.id ? null : item.id);
                              }}
                              className="px-3 py-1.5 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                            >
                              <Receipt size={12} />
                              {showPaymentsForId === item.id ? t('common.hide') : t('payment.history')}
                            </button>
                          )}
                        </div>

                        {/* Payments List */}
                        {showPaymentsForId === item.id && item.payments && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="space-y-2 mt-2 pt-2 border-t border-gray-50"
                          >
                            {item.payments.map(p => (
                              <div key={p.id} className="flex justify-between items-center text-[10px] bg-white p-2 rounded-lg border border-gray-50 shadow-sm group/pay">
                                <div>
                                  <p className="font-bold text-gray-700">{formatCurrency(p.amount, item.currency || currency, language)} • {p.method}</p>
                                  <p className="text-gray-400">{p.date}{p.note ? ` • ${p.note}` : ''}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPaymentModal(item, p);
                                    }}
                                    className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-primary transition-colors"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePayment(item, p.id);
                                    }}
                                    className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-secondary transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    )}
                    
                    {/* Show "Ver pagos" button if completed but has payments */}
                    {isCompleted && (item.payments?.length ?? 0) > 0 && (
                      <div className="px-4 pb-4">
                         <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPaymentsForId(showPaymentsForId === item.id ? null : item.id);
                          }}
                          className="px-3 py-1.5 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                        >
                          <Receipt size={12} />
                          {showPaymentsForId === item.id ? t('common.hide') : t('payment.history')}
                        </button>
                        {showPaymentsForId === item.id && item.payments && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="space-y-2 mt-2 pt-2 border-t border-gray-50"
                          >
                            {item.payments.map(p => (
                              <div key={p.id} className="flex justify-between items-center text-[10px] bg-white p-2 rounded-lg border border-gray-50 shadow-sm group/pay">
                                <div>
                                  <p className="font-bold text-gray-700">{formatCurrency(p.amount, item.currency || currency, language)} • {p.method}</p>
                                  <p className="text-gray-400">{p.date}{p.note ? ` • ${p.note}` : ''}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPaymentModal(item, p);
                                    }}
                                    className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-primary transition-colors"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePayment(item, p.id);
                                    }}
                                    className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-secondary transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="py-12 text-center">
                  <p className="text-gray-300 text-xs font-bold uppercase tracking-widest">{t('wallet.empty')}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </ContentCard>

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setPaymentModalOpen(false);
              setEditingPaymentId(null);
            }}
          />
          <motion.div 
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl overflow-hidden"
          >
            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editingPaymentId 
                  ? (selectedMovForPayment?.type === 'income' ? t('payment.editIncome') : t('payment.editExpense'))
                  : (selectedMovForPayment?.type === 'income' ? t('payment.registerIncome') : t('payment.registerExpense'))
                }
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                {selectedMovForPayment?.concept}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('common.amount')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-300">
                    {getCurrencySymbol(selectedMovForPayment?.currency || currency)}
                  </span>
                  <input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 border-none rounded-2xl pl-8 pr-4 py-3.5 text-base font-bold outline-none shadow-inner focus:ring-4 ring-primary/5 transition-all font-numeric"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('common.method')}</label>
                <div className="relative">
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold outline-none shadow-inner focus:ring-4 ring-primary/5 transition-all cursor-pointer"
                  >
                    {['Efectivo', 'Bizum', 'Transferencia', 'Tarjeta', 'Otro'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('common.note')} ({t('common.optional')})</label>
                <input 
                  type="text" 
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={t('payment.notePlaceholder')}
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-sm font-medium outline-none shadow-inner focus:ring-4 ring-primary/5 transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <button 
                onClick={() => {
                  setPaymentModalOpen(false);
                  setEditingPaymentId(null);
                }}
                className="flex-1 py-4 text-sm font-bold text-gray-400 hover:bg-gray-50 rounded-2xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleSavePayment}
                className="flex-2 py-4 bg-brand-gradient text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/20"
              >
                {t('common.save')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const PendingItem = ({ 
  item, 
  onToggleStatus, 
  onClick,
  currency = 'EUR',
  language = 'es'
}: { 
  item: Movement, 
  onToggleStatus: (id: string) => void,
  onClick: () => void,
  currency?: string,
  language?: string
}) => {
  const { t } = useTranslation();
  const isCompleted = isMovementFullyCompleted(item);
  const paid = getMovementPaidAmount(item);
  const pending = getMovementPendingAmount(item);
  const isPartial = isMovementPartiallyCompleted(item);

  return (
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
          isCompleted 
            ? 'bg-primary border-primary' 
            : 'bg-white border-gray-200'
        }`}
      >
        {isCompleted && <Check size={12} className="text-white" strokeWidth={4} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-gray-900 truncate">{item.concept}</p>
          {isPartial && (
            <span className="bg-amber-100 text-amber-700 text-[7px] font-bold px-1 py-0.5 rounded-full uppercase">{t('status.partial')}</span>
          )}
        </div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.date}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <span className={`text-xs font-bold font-numeric block ${item.type === 'income' ? 'text-primary' : 'text-secondary'}`}>
            {formatCurrency(item.amount, item.currency || currency, language)}
          </span>
          {paid > 0 && pending > 0 && (
            <span className="text-[8px] font-bold text-gray-400 block -mt-1">
              {t('status.pending')}: {formatCurrency(pending, item.currency || currency, language)}
            </span>
          )}
        </div>
        <Edit2 size={12} className="text-gray-200" />
      </div>
    </div>
  );
};

const SummaryScreen = ({ 
  movements, 
  onToggleStatus, 
  setScreen,
  setSelectedMovementId,
  currency = 'EUR',
  language = 'es'
}: { 
  movements: Movement[], 
  onToggleStatus: (id: string) => void,
  setScreen: (s: AppScreen) => void,
  setSelectedMovementId: (id: string) => void,
  currency?: string,
  language?: string
}) => {
  const { t } = useTranslation();
  const [expandedType, setExpandedType] = React.useState<'income' | 'expense' | null>(null);

  const pendingIncomes = movements.filter(m => m.type === 'income' && !isMovementFullyCompleted(m));
  const pendingExpenses = movements.filter(m => m.type === 'expense' && !isMovementFullyCompleted(m));

  const totalPendingIncome = pendingIncomes.reduce((acc, curr) => acc + getMovementPendingAmount(curr), 0);
  const totalPendingExpense = pendingExpenses.reduce((acc, curr) => acc + getMovementPendingAmount(curr), 0);

  const totalIncomes = movements.filter(m => m.type === 'income').reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);
  const totalExpenses = movements.filter(m => m.type === 'expense').reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);
  const historicalBalance = totalIncomes - totalExpenses;

  return (
    <div>
      <ScreenHeader title={t('summary.title')} currency={currency} language={language} />
      <ContentCard>
        <div className="max-w-4xl mx-auto space-y-10">
          <section>
            <div className="bg-brand-gradient text-white rounded-[2rem] p-8 relative overflow-hidden flex justify-between items-end shadow-2xl shadow-primary/20">
              <div className="relative z-10">
                <p className="text-[10px] font-bold tracking-[0.2em] opacity-70 uppercase mb-3">{t('summary.globalBalance')} 2026</p>
                <h2 className="text-4xl font-bold tracking-tight font-numeric">
                  {formatCurrency(historicalBalance, currency, language)}
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">{t('summary.totalIncomes')}</p>
                  <p className="text-3xl font-bold text-primary tracking-tight font-numeric">{formatCurrency(totalIncomes, currency, language)}</p>
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">{t('summary.totalExpenses')}</p>
                  <p className="text-3xl font-bold text-secondary tracking-tight font-numeric">{formatCurrency(totalExpenses, currency, language)}</p>
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
            <h3 className="text-sm font-bold text-gray-900 tracking-tight px-1">{t('summary.pending')}</h3>
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
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t('summary.pendingIncome')}</p>
                      <p className="text-lg font-bold text-primary font-numeric">{formatCurrency(totalPendingIncome, currency, language)}</p>
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
                            currency={currency}
                            language={language}
                            onClick={() => {
                              setSelectedMovementId(item.id);
                              setScreen('edit-movement');
                            }}
                          />
                        </React.Fragment>
                      ))
                    ) : (
                      <p className="py-8 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">{t('summary.noPendingIncomes')}</p>
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
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t('summary.pendingExpense')}</p>
                      <p className="text-lg font-bold text-secondary font-numeric">{formatCurrency(totalPendingExpense, currency, language)}</p>
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
                            currency={currency}
                            language={language}
                            onClick={() => {
                              setSelectedMovementId(item.id);
                              setScreen('edit-movement');
                            }}
                          />
                        </React.Fragment>
                      ))
                    ) : (
                      <p className="py-8 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">{t('summary.noPendingExpenses')}</p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">{t('summary.quarterBreakdown')}</h3>
              <Calendar size={18} className="text-gray-300" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: t('summary.q1'), num: 1 },
                { label: t('summary.q2'), num: 2 },
                { label: t('summary.q3'), num: 3 },
                { label: t('summary.q4'), num: 4 },
              ].map((q) => {
                const monthMap: Record<string, number> = {
                  'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
                  'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11,
                  'Jan': 0, 'Apr': 3, 'Aug': 7, 'Dec': 11
                };

                const minMonth = (q.num - 1) * 3;
                const maxMonth = minMonth + 2;

                const quarterMovements = movements.filter(m => {
                  const parts = m.date.split(' ');
                  const monthAbbr = parts[parts.length - 1];
                  const monthIndex = monthMap[monthAbbr];
                  return monthIndex >= minMonth && monthIndex <= maxMonth;
                });

                const income = quarterMovements
                  .filter(m => m.type === 'income')
                  .reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);
                
                const expense = quarterMovements
                  .filter(m => m.type === 'expense')
                  .reduce((acc, curr) => acc + getMovementPaidAmount(curr), 0);

                const balance = income - expense;
                
                let bgColor = 'bg-gray-50/50 text-gray-400';
                if (balance > 0) bgColor = 'bg-primary/5 text-primary';
                if (balance < 0) bgColor = 'bg-secondary/5 text-secondary';

                return (
                  <div key={q.num} className={`p-5 rounded-2xl flex justify-between items-center transition-all ${bgColor}`}>
                    <span className="text-sm font-bold">{q.label}</span>
                    <span className="font-bold font-numeric">
                      {balance > 0 ? '+' : ''}{formatCurrency(balance, currency, language)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </ContentCard>
    </div>
  );
};

const ReceiptPreviewScreen = ({ 
  movement, 
  onBack, 
  profile,
  currency = 'EUR',
  language = 'es'
}: { 
  movement: Movement, 
  onBack: () => void, 
  profile: ProfileData,
  currency?: string,
  language?: string
}) => {
  const { t } = useTranslation();
  
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
        // Note: Using base64 directly ensures it works in all environments (mobile/prod)
        doc.addImage(tracklyLogoHorizontalBase64, 'PNG', 20, 15, 40, 12);
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
      doc.text(t('receipt.title').toUpperCase(), 105, 50, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(muteColor[0], muteColor[1], muteColor[2]);
      doc.text(`#${t('receipt.number')}000${movement.id.slice(0, 5).toUpperCase()}`, 105, 58, { align: "center" });
      
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
      doc.text(`${t('receipt.from').toUpperCase()}:`, 20, 90);
      doc.text(`${t('receipt.to').toUpperCase()}:`, 110, 90);

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(12);
      doc.text(profile.fullName, 20, 98);
      doc.text(movement.concept, 110, 98);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(muteColor[0], muteColor[1], muteColor[2]);
      doc.text(profile.businessName || profile.jobType, 20, 104);
      doc.text(profile.email, 20, 110);
      doc.text(t('receipt.clientSub'), 110, 104);

      // Separator
      doc.line(20, 125, 190, 125);

      // 3. CONCEPTO & DETALLE
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text(`${t('movement.conceptLabel').toUpperCase()}:`, 20, 140);
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(13);
      doc.text(movement.concept, 20, 148);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text(`${t('receipt.detail').toUpperCase()}:`, 20, 160);

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const notes = movement.notes || t('movement.noNotes');
      const splitNotes = doc.splitTextToSize(notes, 160);
      doc.text(splitNotes, 20, 168);

      // Separator
      doc.line(20, 185, 190, 185);

      // 4. TOTAL (MUY IMPORTANTE)
      const isExpense = movement.type === 'expense';
      const absAmount = Math.abs(movement.amount);
      const paidAmount = getMovementPaidAmount(movement);
      const pendingAmount = getMovementPendingAmount(movement);
      const isPartial = isMovementPartiallyCompleted(movement);
      const isCompleted = isMovementFullyCompleted(movement);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      
      if (isPartial) {
        doc.text(t('receipt.breakdown').toUpperCase(), 105, 195, { align: "center" });
        
        doc.setFontSize(9);
        doc.setTextColor(muteColor[0], muteColor[1], muteColor[2]);
        doc.text(`${t('common.total')}: ${formatCurrency(absAmount, movement.currency || currency, language)}`, 105, 202, { align: "center" });
        
        doc.setFontSize(11);
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text(`${isExpense ? t('status.paid') : t('status.collected')}: ${formatCurrency(paidAmount, movement.currency || currency, language)}`, 105, 210, { align: "center" });
        
        doc.setFontSize(14);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`${t('status.pending').toUpperCase()}: ${formatCurrency(pendingAmount, movement.currency || currency, language)}`, 105, 220, { align: "center" });
      } else {
        doc.text(t('common.total').toUpperCase(), 105, 205, { align: "center" });
        doc.setFontSize(42);
        if (isExpense) {
          doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        } else {
          doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        }
        doc.text(`${formatCurrency(absAmount, movement.currency || currency, language)}`, 105, 222, { align: "center" });
      }

      // 5. ESTADO
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const stateLabel = t('common.status');
      if (isCompleted) {
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text(`${stateLabel}: ${isExpense ? t('status.paid').toUpperCase() : t('status.collected').toUpperCase()}`, 105, 235, { align: "center" });
      } else if (isPartial) {
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`${stateLabel}: ${t('status.partial').toUpperCase()}`, 105, 235, { align: "center" });
      } else {
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`${stateLabel}: ${t('status.pending').toUpperCase()}`, 105, 235, { align: "center" });
      }

      // 6. HISTORIAL DE PAGOS (Si existen)
      if (movement.payments && movement.payments.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text(`${isExpense ? t('movement.paymentsDone') : t('movement.incomesReceived')}:`, 20, 250);
        
        doc.setFontSize(8);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        let currentY = 258;
        movement.payments.forEach((p) => {
          if (currentY > 275) return; // Prevent overflow for now
          const paymentLine = `${p.date} - ${p.method === 'Efectivo' ? t('payment.cash') : t('payment.card')}: ${formatCurrency(p.amount, movement.currency || currency, language)} ${p.note ? `(${p.note})` : ''}`;
          doc.text(paymentLine, 20, currentY);
          currentY += 5;
        });
      }

      // 9. PIE
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(muteColor[0], muteColor[1], muteColor[2]);
      doc.text(t('receipt.generatedWith'), 105, 285, { align: "center" });

      // Filename
      const safeDate = movement.date.replace(/[^a-z0-9]/gi, '_');
      const prefix = t('receipt.filenamePrefix');
      const fileName = `${prefix}-${movement.concept.toLowerCase().replace(/\s+/g, '-')}-${safeDate}.pdf`;
      doc.save(fileName);
      alert(t('receipt.downloaded'));
    } catch (error) {
      console.error(error);
      alert(t('receipt.error'));
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <ScreenHeader title={t('receipt.previewTitle')} onBack={onBack} currency={currency} language={language} />
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
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('receipt.title')}</span>
              </div>
              <div className="text-right font-sans">
                <p className="text-xs font-bold text-gray-900 font-sans">#{t('receipt.number')}000{movement.id.slice(0, 5)}</p>
                <p className="text-[10px] font-bold text-gray-400 font-sans">{movement.date}</p>
              </div>
            </div>

            {/* Parties Section */}
            <div className="grid grid-cols-2 gap-6 py-6 border-y border-gray-50 mb-6 font-sans">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('receipt.from').toUpperCase()}:</p>
                <p className="text-sm font-bold text-gray-900 leading-tight">{profile.fullName}</p>
                <p className="text-[10px] font-bold text-gray-400 opacity-70 font-sans">{profile.businessName || profile.jobType}</p>
              </div>
              <div className="text-right font-sans">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('receipt.to').toUpperCase()}:</p>
                <p className="text-sm font-bold text-gray-900 leading-tight font-sans">{movement.concept}</p>
              </div>
            </div>

            {/* Concept/Details */}
            <div className="mb-10 font-sans">
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-sans">{t('movement.conceptLabel').toUpperCase()}</p>
                <p className="text-base font-bold text-gray-900 font-sans">{movement.concept}</p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 italic">
                <p className="text-xs text-gray-500 leading-relaxed text-center font-sans">
                  {movement.notes || t('movement.noNotes')}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center mb-10">
              <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 border shadow-sm ${
                isMovementFullyCompleted(movement) 
                  ? 'bg-primary/5 border-primary/20 text-primary' 
                  : isMovementPartiallyCompleted(movement)
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-secondary/5 border-secondary/20 text-secondary'
              }`}>
                {isMovementFullyCompleted(movement) ? <Check size={14} strokeWidth={3} /> : <Clock size={14} strokeWidth={3} />}
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t('common.status').toUpperCase()}: {
                    isMovementFullyCompleted(movement) 
                      ? (movement.type === 'income' ? t('status.collected').toUpperCase() : t('status.paid').toUpperCase())
                      : isMovementPartiallyCompleted(movement) ? t('status.partial').toUpperCase() : t('status.pending').toUpperCase()
                  }
                </span>
              </div>
            </div>

            {/* Total Amount Section */}
            <div className="flex flex-col items-center py-8 border-t border-dashed border-gray-100">
              {isMovementPartiallyCompleted(movement) ? (
                <div className="w-full space-y-4 font-sans">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center font-sans">
                      <p className="text-[8px] font-bold text-gray-400 uppercase font-sans">{t('common.total')}</p>
                      <p className="text-sm font-bold text-gray-900 font-sans">{formatCurrency(Math.abs(movement.amount), movement.currency || currency, language)}</p>
                    </div>
                    <div className="text-center font-sans">
                      <p className="text-[8px] font-bold text-primary uppercase font-sans">{movement.type === 'income' ? t('status.collected') : t('status.paid')}</p>
                      <p className="text-sm font-bold text-primary font-sans">{formatCurrency(getMovementPaidAmount(movement), movement.currency || currency, language)}</p>
                    </div>
                    <div className="text-center font-sans">
                      <p className="text-[8px] font-bold text-secondary uppercase font-sans">{t('status.pending')}</p>
                      <p className="text-sm font-bold text-secondary font-sans">{formatCurrency(getMovementPendingAmount(movement), movement.currency || currency, language)}</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${getMovementProgress(movement)}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-sans">{t('receipt.totalLabel')}</span>
                  <h2 className={`text-4xl font-bold font-numeric font-sans ${movement.type === 'income' ? 'text-primary' : 'text-secondary'}`}>
                    {formatCurrency(Math.abs(movement.amount), movement.currency || currency, language)}
                  </h2>
                </>
              )}
            </div>

            {/* Payments List if any */}
            {(movement.payments?.length ?? 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50 font-sans">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 font-sans">{movement.type === 'income' ? t('movement.incomesReceived') : t('movement.paymentsDone')}</p>
                <div className="space-y-2 font-sans">
                  {movement.payments?.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-[10px] bg-gray-50 p-3 rounded-xl border border-gray-100 font-sans">
                      <div className="font-sans">
                        <p className="font-bold text-gray-700 font-sans">{formatCurrency(p.amount, movement.currency || currency, language)} • {p.method === 'Efectivo' ? t('payment.cash') : t('payment.card')}</p>
                        <p className="text-gray-400 font-medium font-sans">{p.date}{p.note ? ` • ${p.note}` : ''}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Receipt Footer */}
            <div className="mt-4 text-center">
              <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em] font-sans">{t('receipt.generatedWith')}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-md space-y-4 px-2">
          <button 
            onClick={downloadPDF}
            className="w-full py-5 bg-primary text-white rounded-[1.75rem] text-base font-bold shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all font-sans"
          >
            {t('receipt.downloadPDF')}
          </button>
          <button className="w-full py-5 border-2 border-primary/20 text-primary rounded-[1.75rem] text-base font-bold bg-white hover:bg-gray-50 active:scale-95 transition-all font-sans">
            {t('common.share')}
          </button>
          <div className="flex justify-center pt-4">
            <button 
              onClick={onBack}
              className="text-gray-400 font-bold text-[11px] uppercase tracking-widest hover:text-gray-600 transition-colors py-2 font-sans"
            >
              {t('receipt.backToDetails')}
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
  const { t, i18n } = useTranslation();
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
        alert(t('common.error'));
      }
    }
    setShowPhotoMenu(false);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setProfile(p => ({ ...p, language: lang }));
    localStorage.setItem('trackly_language', lang);
  };

  return (
    <div className="bg-background min-h-screen">
      <ScreenHeader title={t('profile.title')} />
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
                    <h3 className="text-sm font-bold text-gray-900">{t('profile.updatePhoto')}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{t('profile.chooseOption')}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-2xl flex items-center justify-center gap-3 transition-colors"
                    >
                      <Camera size={18} className="text-primary" />
                      {t('profile.takePhoto')}
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-2xl flex items-center justify-center gap-3 transition-colors"
                    >
                      <Receipt size={18} className="text-primary" />
                      {t('profile.chooseGallery')}
                    </button>
                    <div className="h-px bg-gray-100 mx-4 my-1" />
                    <button 
                      onClick={() => setShowPhotoMenu(false)}
                      className="w-full py-4 text-sm font-bold text-secondary hover:bg-gray-50 rounded-2xl transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Section: Datos Básicos */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">{t('profile.basicData')}</h3>
            <Card className="space-y-5 border-none bg-gray-50/50">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('profile.fullName')}</label>
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
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('profile.registration')}</label>
                  <div className="w-full bg-white/50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[11px] font-bold text-gray-400">
                    {profile.registrationDate}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Section: Información Profesional */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">{t('profile.proInfo')}</h3>
            <Card className="space-y-5 border-none bg-gray-50/50">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('profile.jobType')}</label>
                <div className="relative">
                  <select 
                    value={profile.jobType}
                    onChange={(e) => setProfile(p => ({ ...p, jobType: e.target.value }))}
                    className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                  >
                    <option value="Jardinería">{t('jobs.gardening')}</option>
                    <option value="Electricidad">{t('jobs.electricity')}</option>
                    <option value="Fontanería">{t('jobs.plumbing')}</option>
                    <option value="Carpintería">{t('jobs.carpentry')}</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('profile.businessName')}</label>
                <input 
                  type="text" 
                  value={profile.businessName}
                  onChange={(e) => setProfile(p => ({ ...p, businessName: e.target.value }))}
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('profile.workAs')}</label>
                <div className="flex bg-white/50 p-1 rounded-2xl border border-gray-100 gap-1">
                  {(['Autónomo', 'Empresa', 'Particular'] as const).map(type => (
                    <button 
                      key={type}
                      onClick={() => setProfile(p => ({ ...p, employmentType: type }))}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        profile.employmentType === type ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {t(`employment.${type.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {/* Section: Actividad */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">{t('profile.activity')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t('profile.totalMovements'), val: stats.total.toString(), color: 'text-gray-900' },
                { label: t('summary.totalIncomes'), val: stats.incomes.toString(), color: 'text-primary' },
                { label: t('summary.totalExpenses'), val: stats.expenses.toString(), color: 'text-secondary' },
                { label: t('profile.lastAccess'), val: profile.lastAccess, color: 'text-gray-900' },
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
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">{t('profile.preferences')}</h3>
            <Card className="space-y-6 border-none bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-gray-900 block mb-0.5">{t('profile.autoBackup')}</span>
                  <span className="text-[10px] font-medium text-gray-400">{t('profile.autoBackupDesc')}</span>
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
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100/50">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('profile.language')}</label>
                  <div className="relative">
                    <select 
                      value={profile.language || 'es'}
                      onChange={(e) => changeLanguage(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-[11px] font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('profile.currency')}</label>
                  <div className="relative">
                    <select 
                      value={profile.currency || 'EUR'}
                      onChange={(e) => setProfile(p => ({ ...p, currency: e.target.value }))}
                      className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-[11px] font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                    >
                      {[
                        { code: "EUR" },
                        { code: "USD" },
                        { code: "GBP" },
                        { code: "MXN" },
                        { code: "ARS" },
                        { code: "BOB" },
                        { code: "BRL" },
                        { code: "CLP" },
                        { code: "COP" },
                        { code: "PYG" },
                        { code: "PEN" },
                        { code: "UYU" }
                      ].map(curr => (
                        <option key={curr.code} value={curr.code}>{t(`currency.${curr.code}`)}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-gray-100/50">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('profile.backupFreq')}</label>
                <div className="relative">
                  <select 
                    value={profile.backupFrequency}
                    onChange={(e) => setProfile(p => ({ ...p, backupFrequency: e.target.value }))}
                    className="w-full appearance-none bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 ring-primary/5 outline-none transition-all"
                  >
                    <option value="Semanal">{t('common.weekly')}</option>
                    <option value="Mensual">{t('common.monthly')}</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </Card>
          </section>

          {/* Section: Ayúdanos */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">{t('profile.helpImprove')}</h3>
            <div className="space-y-4 bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-gray-600">{t('profile.improveTools')}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setProfile(p => ({ ...p, toolInterest: true }))}
                    className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${profile.toolInterest ? 'border-primary/20 bg-primary/5 text-primary' : 'border-gray-200 text-gray-400'}`}
                  >{t('common.yes')}</button>
                  <button 
                    onClick={() => setProfile(p => ({ ...p, toolInterest: false }))}
                    className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${!profile.toolInterest ? 'border-secondary/20 bg-secondary/5 text-secondary' : 'border-gray-200 text-gray-400'}`}
                  >{t('common.no')}</button>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-600">{t('profile.improveMgmt')}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setProfile(p => ({ ...p, mgmtInterest: true }))}
                    className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${profile.mgmtInterest ? 'border-primary/20 bg-primary/5 text-primary' : 'border-gray-200 text-gray-400'}`}
                  >{t('common.yes')}</button>
                  <button 
                    onClick={() => setProfile(p => ({ ...p, mgmtInterest: false }))}
                    className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${!profile.mgmtInterest ? 'border-secondary/20 bg-secondary/5 text-secondary' : 'border-gray-200 text-gray-400'}`}
                  >{t('common.no')}</button>
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
              {t('profile.saveChanges')}
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
  onDelete,
  currency = 'EUR',
  language = 'es'
}: { 
  movement: Movement, 
  setScreen: (s: AppScreen) => void,
  onSave: (m: Movement) => void,
  onDelete: (id: string) => void,
  currency?: string,
  language?: string
}) => {
  const { t } = useTranslation();
  const [edited, setEdited] = React.useState<Movement>(movement);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [editingPaymentId, setEditingPaymentId] = React.useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState<number>(0);
  const [paymentMethod, setPaymentMethod] = React.useState('Efectivo');
  const [paymentNote, setPaymentNote] = React.useState('');

  const handleSave = () => {
    onSave(edited);
  };

  const handleOpenPaymentModal = (p?: Payment) => {
    if (p) {
      setEditingPaymentId(p.id);
      setPaymentAmount(p.amount);
      setPaymentMethod(p.method);
      setPaymentNote(p.note || '');
    } else {
      setEditingPaymentId(null);
      const pending = getMovementPendingAmount(edited);
      setPaymentAmount(pending);
      setPaymentMethod('Efectivo');
      setPaymentNote('');
    }
    setPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    if (paymentAmount <= 0) return;
    
    const otherPayments = (edited.payments || []).filter(p => p.id !== editingPaymentId);
    const otherPaidSum = otherPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalAmount = Math.abs(edited.amount);
    
    if (otherPaidSum + paymentAmount > totalAmount) {
      alert(t('payment.totalError'));
      return;
    }

    let updatedPayments: Payment[];
    if (editingPaymentId) {
      updatedPayments = (edited.payments || []).map(p => 
        p.id === editingPaymentId 
          ? { ...p, amount: paymentAmount, method: paymentMethod, note: paymentNote } 
          : p
      );
    } else {
      const newPayment: Payment = {
        id: Math.random().toString(36).substr(2, 9),
        amount: paymentAmount,
        date: new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US'),
        method: paymentMethod,
        note: paymentNote
      };
      updatedPayments = [...(edited.payments || []), newPayment];
    }

    const updatedPaidAmount = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const isSettled = updatedPaidAmount >= totalAmount;

    setEdited(prev => ({
      ...prev,
      paidAmount: updatedPaidAmount,
      payments: updatedPayments,
      status: isSettled ? 'settled' : 'pending'
    }));

    setPaymentModalOpen(false);
    setEditingPaymentId(null);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!confirm(t('common.confirmDelete'))) return;

    const updatedPayments = (edited.payments || []).filter(p => p.id !== paymentId);
    const updatedPaidAmount = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalAmount = Math.abs(edited.amount);
    const isSettled = updatedPaidAmount >= totalAmount;

    setEdited(prev => ({
      ...prev,
      paidAmount: updatedPaidAmount,
      payments: updatedPayments,
      status: isSettled ? 'settled' : 'pending'
    }));
  };

  const handleMarkAsSettled = () => {
    const pending = getMovementPendingAmount(edited);
    const totalAmount = Math.abs(edited.amount);
    if (pending <= 0) return;

    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      amount: pending,
      date: new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US'),
      method: 'Efectivo',
      note: t('payment.autoNote', { type: edited.type === 'income' ? t('status.collected') : t('status.paid') })
    };

    setEdited(prev => ({
      ...prev,
      paidAmount: totalAmount,
      payments: [...(prev.payments || []), newPayment],
      status: 'settled'
    }));
  };

  const handleDelete = () => {
    if (window.confirm(t('common.confirmDelete'))) {
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
      alert(t('common.error'));
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
      <ScreenHeader title={t('movement.details')} onBack={() => setScreen('movements')} currency={currency} language={language} />
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
                  <p className="text-xs opacity-60 font-medium">{t('movement.recentlyUpdated')}</p>
                </div>
              </div>
              <p className="text-3xl font-bold font-numeric tracking-tight">{formatCurrency(edited.amount, edited.currency || currency, language)}</p>
            </div>
            <div className="header-shape-1" />
          </motion.div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 opacity-70">{t('movement.conceptLabel')}</label>
              <input 
                type="text" 
                value={edited.concept}
                onChange={(e) => setEdited(prev => ({ ...prev, concept: e.target.value }))}
                className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-5 text-base font-bold focus:bg-white focus:ring-4 ring-primary/5 outline-none transition-all shadow-inner"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 opacity-70">{t('movement.amountLabel')}</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-bold">{getCurrencySymbol(edited.currency || currency)}</span>
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
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 opacity-70">{t('common.date')}</label>
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

          {/* Payments Breakdown Section */}
          <section className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
                  <CreditCard size={18} />
                </div>
                <h3 className="font-bold text-sm text-gray-800">Desglose de Pagos</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                isMovementFullyCompleted(edited) 
                  ? 'bg-primary/10 text-primary' 
                  : isMovementPartiallyCompleted(edited)
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {isMovementFullyCompleted(edited) 
                  ? (edited.type === 'income' ? 'Cobrado' : 'Pagado')
                  : isMovementPartiallyCompleted(edited) ? 'Parcial' : 'Pendiente'
                }
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
                <p className="text-sm font-bold text-gray-700">{Math.abs(edited.amount)}€</p>
              </div>
              <div className="bg-green-50 p-3 rounded-2xl text-center">
                <p className="text-[9px] font-bold text-green-400 uppercase tracking-wider mb-1">{edited.type === 'income' ? 'Cobrado' : 'Pagado'}</p>
                <p className="text-sm font-bold text-green-700">{getMovementPaidAmount(edited)}€</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-2xl text-center">
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-1">Pendiente</p>
                <p className="text-sm font-bold text-amber-700">{getMovementPendingAmount(edited)}€</p>
              </div>
            </div>

            {getMovementPaidAmount(edited) > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold px-1">
                  <span className="text-gray-400">Progreso</span>
                  <span className="text-primary">{Math.round(getMovementProgress(edited))}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${getMovementProgress(edited)}%` }}
                    className="h-full bg-brand-gradient"
                  />
                </div>
              </div>
            )}

            {!isMovementFullyCompleted(edited) && (
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => handleOpenPaymentModal()}
                  className="flex-1 py-3.5 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle size={14} />
                  {edited.type === 'income' ? t('movement.registerIncome') : t('movement.registerPayment')}
                </button>
                <button 
                  onClick={handleMarkAsSettled}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={14} />
                  {edited.type === 'income' ? t('movement.markAsCollected') : t('movement.markAsPaid')}
                </button>
              </div>
            )}
          </section>

          {/* Payments History Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{edited.type === 'income' ? t('movement.incomesReceived') : t('movement.paymentsDone')}</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">{(edited.payments?.length ?? 0)} {t('movement.records')}</span>
            </div>
            
            {(edited.payments?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {edited.payments?.map((p) => (
                  <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{formatCurrency(p.amount, edited.currency || currency, language)}</p>
                        <p className="text-[10px] font-medium text-gray-400">{p.date} • {p.method === 'Efectivo' ? t('payment.cash') : t('payment.card')}</p>
                        {p.note && <p className="text-[10px] text-gray-400 italic mt-0.5">"{p.note}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleOpenPaymentModal(p)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-2 text-gray-400 hover:text-secondary hover:bg-secondary/5 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <p className="text-xs font-medium text-gray-400">
                  {edited.type === 'income' ? t('movement.noCollections') : t('movement.noPayments')}
                </p>
              </div>
            )}
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
              <span className="text-[10px] font-bold uppercase tracking-widest">{t('movement.camera')}</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border-2 border-dashed border-gray-100 py-8 rounded-[2rem] flex flex-col items-center gap-3 text-gray-400 hover:text-primary hover:bg-gray-50 transition-all"
            >
              <PlusCircle size={28} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{t('movement.addAttachment')}</span>
            </button>
          </div>

          <div className="space-y-4 pt-10">
            <button 
              onClick={handleSave}
              className="w-full bg-brand-gradient text-white py-5 rounded-[1.75rem] text-base font-bold shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all text-center"
            >
              {t('common.saveChanges')}
            </button>
            
            <button 
              onClick={() => {
                onSave(edited);
                setScreen('receipt-preview');
              }}
              className="w-full bg-gray-900 text-white py-5 rounded-[1.75rem] text-base font-bold shadow-xl shadow-gray-900/10 hover:brightness-125 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <Receipt size={20} />
              {t('movement.generateReceipt')}
              <span className="absolute right-6 bg-brand-gradient text-[9px] px-2 py-0.5 rounded-full tracking-widest group-hover:scale-110 transition-transform">PRO</span>
            </button>

            <button 
              onClick={handleDelete}
              className="w-full text-secondary/40 py-3 text-[10px] font-bold uppercase tracking-[0.25em] flex items-center justify-center gap-2 hover:text-secondary hover:bg-secondary/5 rounded-2xl transition-all"
            >
              <Trash2 size={14} />
              {t('movement.deleteMovement')}
            </button>
          </div>
        </div>
      </ContentCard>

      {/* Payment Modal inside EditMovementScreen */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setPaymentModalOpen(false);
              setEditingPaymentId(null);
            }}
          />
          <motion.div 
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl overflow-hidden"
          >
            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editingPaymentId 
                  ? (edited.type === 'income' ? 'Editar Cobro' : 'Editar Pago')
                  : (edited.type === 'income' ? 'Registrar Cobro' : 'Registrar Pago')
                }
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                {edited.concept}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('payment.amountLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-300">{getCurrencySymbol(edited.currency || currency)}</span>
                  <input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    placeholder={t('payment.placeholderAmount')}
                    className="w-full bg-gray-50 border-none rounded-2xl pl-8 pr-4 py-3.5 text-base font-bold outline-none shadow-inner focus:ring-4 ring-primary/5 transition-all font-numeric"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('payment.methodLabel')}</label>
                <div className="relative">
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold outline-none shadow-inner focus:ring-4 ring-primary/5 transition-all cursor-pointer"
                  >
                    {[t('payment.cash'), t('payment.card')].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('payment.noteLabel')}</label>
                <input 
                  type="text" 
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={t('payment.placeholderNote')}
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-sm font-medium outline-none shadow-inner focus:ring-4 ring-primary/5 transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <button 
                onClick={() => {
                  setPaymentModalOpen(false);
                  setEditingPaymentId(null);
                }}
                className="flex-1 py-4 text-sm font-bold text-gray-400 hover:bg-gray-50 rounded-2xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleSavePayment}
                className="flex-2 py-4 bg-brand-gradient text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/20"
              >
                {t('common.save')} {edited.type === 'income' ? t('common.income').toLowerCase() : t('common.expense').toLowerCase()}
              </button>
            </div>
          </motion.div>
        </div>
      )}
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

  const [profile, setProfile] = React.useState<ProfileData>(() => {
    const savedLanguage = localStorage.getItem('trackly_language') || 'es';
    const savedCurrency = localStorage.getItem('trackly_currency') || 'EUR';
    return {
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
      profilePic: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnregE4Cc8vUrpeFz8mP7GFvDStonKJ8WgdDxyQrbDdUXNKS1COUpMwS58TzEqUtNggN77w7O89UoEmNkhY9yTbj3PgGpK8Ly-6HQW-OCE0enD2uDly124zmuImGiuXo9uhb31Ive731XeOrrhp7ZM6LS6sULohIxwFB_o7cU05eHoFogulkPnrHXLE8sDP7RQh_Pjvh-rR_iUhEht1q5u7LwGywhMFn2_4nhNOkNZt6eSn3Ek1IavczPTKaS0-cGf5ahnAVOV2sTZ',
      language: savedLanguage,
      currency: savedCurrency
    };
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleMovementStatus = (id: string) => {
    setMovements(prev => prev.map(m => {
      if (m.id === id) {
        const isSettled = m.status === 'settled';
        const newStatus = isSettled ? 'pending' : 'settled';
        const totalAmount = Math.abs(m.amount);
        const newPaidAmount = newStatus === 'settled' ? totalAmount : 0;
        
        return { 
          ...m, 
          status: newStatus, 
          paidAmount: newPaidAmount,
          // If we mark as settled via toggle, we might want to clear previous partial payments?
          // Actually, let's keep it simple: if toggled to settled, we set paidAmount to total.
          // If toggled to pending, we set paidAmount to 0 for consistency with the UI's simple toggle.
        };
      }
      return m;
    }));
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

  const updateMovement = (updated: Movement) => {
    setMovements(prev => prev.map(m => m.id === updated.id ? updated : m));
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
    const currency = profile.currency || 'EUR';
    const language = profile.language || 'es';

    switch (screen) {
      case 'onboarding': return <OnboardingScreen onNext={() => setScreen('movements')} />;
      case 'stats': return (
        <StatsScreen 
          movements={movements} 
          selectedMonth={selectedMonth} 
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          currency={currency}
          language={language}
        />
      );
      case 'movements': return (
        <MovementsScreen 
          setScreen={setScreen} 
          movements={movements} 
          onToggleStatus={toggleMovementStatus} 
          onUpdateMovement={updateMovement}
          setSelectedMovementId={setSelectedMovementId}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onAddMovement={handleAddMovement}
          currency={currency}
          language={language}
        />
      );
      case 'summary': return (
        <SummaryScreen 
          movements={movements} 
          onToggleStatus={toggleMovementStatus} 
          setScreen={setScreen} 
          setSelectedMovementId={setSelectedMovementId}
          currency={currency}
          language={language}
        />
      );
      case 'edit-movement': return (
        <EditMovementScreen 
          movement={currentMovement} 
          setScreen={setScreen}
          onSave={handleSaveMovement}
          onDelete={handleDeleteMovement}
          currency={currency}
          language={language}
        />
      );
      case 'receipt-preview': return (
        <ReceiptPreviewScreen 
          movement={currentMovement} 
          onBack={() => setScreen('edit-movement')} 
          profile={profile}
          currency={currency}
          language={language}
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
          onUpdateMovement={updateMovement}
          setSelectedMovementId={setSelectedMovementId}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onAddMovement={handleAddMovement}
          currency={currency}
          language={language}
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
