import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Square, 
  Info, 
  Activity, 
  Table as TableIcon, 
  LineChart as LineChartIcon,
  Circle,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend, 
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { cn } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const METRICS = {
  temp: { label: '水温', unit: '°C', color: '#f87171' },
  ph: { label: 'pH值', unit: '', color: '#22c55e' },
  do: { label: '溶氧', unit: 'mg/L', color: '#60a5fa' },
};

const STEPS = [
  { id: 0, title: '① 原始数据', desc: '包含因设备抖动产生的异常值和网络造成的缺失片段。' },
  { id: 1, title: '② 筛查异常 (3σ + IQR)', desc: '识别出明显的偏离数值（红色标注），确保对偏态和极端值稳健。' },
  { id: 2, title: '③ 缺失插补 (线性)', desc: '利用序列连续性，对空缺与异常点所在时间刻进行线性插补（黄色标注）。' },
  { id: 3, title: '④ 序列平滑', desc: '通过滑动平均滤波，消除微小噪点，还原真实环境的连续波动趋势。' }
];

// --- Processing Algorithms ---
function getBounds(values: (number | null)[]) {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return { mean: 0, std: 0, q1: 0, q3: 0, iqr: 0, lower: 0, upper: 0 };
  
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const std = Math.sqrt(valid.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / valid.length);
  const sigmaLower = mean - 3 * std;
  const sigmaUpper = mean + 3 * std;

  const sorted = [...valid].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const iqrLower = q1 - 1.5 * iqr;
  const iqrUpper = q3 + 1.5 * iqr;

  const lower = Math.max(sigmaLower, iqrLower);
  const upper = Math.min(sigmaUpper, iqrUpper);

  return { lower, upper };
}

function interpolate(arr: (number | null)[]) {
  const result = [...arr];
  for (let i = 0; i < result.length; i++) {
    if (result[i] === null) {
      let prevIdx = i - 1;
      while (prevIdx >= 0 && result[prevIdx] === null) prevIdx--;
      let nextIdx = i + 1;
      while (nextIdx < result.length && result[nextIdx] === null) nextIdx++;

      if (prevIdx >= 0 && nextIdx < result.length) {
        const prevVal = result[prevIdx]!;
        const nextVal = result[nextIdx]!;
        const slope = (nextVal - prevVal) / (nextIdx - prevIdx);
        result[i] = +(prevVal + slope * (i - prevIdx)).toFixed(2);
      } else if (prevIdx >= 0) {
        result[i] = result[prevIdx];
      } else if (nextIdx < result.length) {
        result[i] = result[nextIdx];
      }
    }
  }
  return result;
}

function smoothArray(arr: (number | null)[], windowSize = 3) {
  const result = [...arr];
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < arr.length; i++) {
    if (result[i] === null) continue;
    if (i < half || i >= arr.length - half) continue;
    let sum = 0;
    let count = 0;
    for (let j = -half; j <= half; j++) {
      if (arr[i + j] !== null) {
        sum += arr[i + j]!;
        count++;
      }
    }
    if (count > 0) result[i] = +(sum / count).toFixed(2);
  }
  return result;
}

export default function DataCleaning() {
  const [activeStep, setActiveStep] = useState(0);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [isPlaying, setIsPlaying] = useState(false);
  const [dataSeed, setDataSeed] = useState(0);

  // Generate stable raw data
  const rawDataset = useMemo(() => {
    const data = [];
    const baseT = 27.5;
    const baseD = 6.5;
    const baseP = 7.3;
    const startHour = 14;
    const startMinute = 30;

    for (let i = 0; i < 40; i++) {
      const hh = startHour.toString().padStart(2, '0');
      const mm = startMinute.toString().padStart(2, '0');
      const ss = i.toString().padStart(2, '0');
      const time = `${hh}:${mm}:${ss}`;
      
      let temp: number | null = +(baseT + Math.sin(i * 0.2) + (Math.random() * 0.4 - 0.2)).toFixed(2);
      let d: number | null = +(baseD + Math.sin(i * 0.1) * 0.5 + (Math.random() * 0.2 - 0.1)).toFixed(2);
      let ph: number | null = +(baseP + Math.cos(i * 0.3) * 0.2 + (Math.random() * 0.1 - 0.05)).toFixed(2);

      if (i === 6) temp = null; 
      if (i === 15) temp = 12.3; 
      if (i === 28) temp = 35.1; 
      if (i === 34) temp = null; 

      if (i === 12) d = 2.1; 
      if (i === 19) d = null;
      if (i === 20) d = null;
      if (i === 35) d = 9.8; 

      if (i === 8) ph = null;
      if (i === 22) ph = 9.5;
      if (i === 30) ph = 4.2;

      data.push({ time, temp, do: d, ph });
    }
    return data;
  }, [dataSeed]);

  const processedDataMap = useMemo(() => {
    const process = (metricKey: 'temp' | 'do' | 'ph') => {
      const rawValues = rawDataset.map(d => d[metricKey]);
      const bounds = getBounds(rawValues);

      const points = rawDataset.map(point => {
        const val = point[metricKey];
        const isMissingOriginal = val === null;
        let isAnomaly = false;

        if (val !== null && (val < bounds.lower || val > bounds.upper)) {
          isAnomaly = true;
        }

        return {
          time: point.time,
          raw: val,
          isMissingOriginal,
          isAnomaly,
          value: val,
          isImputed: false,
        };
      });

      if (activeStep >= 2) {
        const valuesForImputation = points.map(d => (d.isAnomaly || d.isMissingOriginal) ? null : d.value);
        const interpolated = interpolate(valuesForImputation);
        
        points.forEach((d, i) => {
          d.value = interpolated[i];
          if (d.isAnomaly || d.isMissingOriginal) {
            d.isImputed = true;
          }
        });

        if (activeStep >= 3) {
          const smoothed = smoothArray(points.map(d => d.value));
          points.forEach((d, i) => {
            d.value = smoothed[i];
          });
        }
      } else {
         points.forEach(d => { d.value = d.raw; });
      }

      return { 
        points, 
        bounds, 
        anomalyCount: points.filter(d => d.isAnomaly).length, 
        missingCount: points.filter(d => d.isMissingOriginal).length 
      };
    };

    return {
      temp: process('temp'),
      do: process('do'),
      ph: process('ph')
    };
  }, [rawDataset, activeStep]);

  const totalAnomalies = useMemo(() => 
    Object.values(processedDataMap).reduce((acc, m) => acc + m.anomalyCount, 0), 
  [processedDataMap]);

  const totalMissing = useMemo(() => 
    Object.values(processedDataMap).reduce((acc, m) => acc + m.missingCount, 0), 
  [processedDataMap]);

  // Autoplay Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveStep(prev => {
          if (prev < STEPS.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const chartOptions = (key: keyof typeof METRICS) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1D1D1F',
        bodyColor: '#424245',
        borderColor: '#E5E5E7',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        usePointStyle: true,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#86868B', font: { size: 10 }, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: '#F5F5F7' },
        ticks: { color: '#86868B', font: { size: 10 }, padding: 8, maxTicksLimit: 5 },
      }
    },
    animation: { duration: activeStep === 0 ? 0 : 400 }
  });

  const getChartData = (key: keyof typeof METRICS) => {
    const data = processedDataMap[key];
    const color = METRICS[key].color;
    
    return {
      labels: data.points.map(p => p.time),
      datasets: [
        {
          label: '原始基准',
          data: activeStep >= 2 ? data.points.map(p => p.raw) : [],
          borderColor: '#9CA3AF',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.4,
          fill: false,
        },
        {
          label: '处理后数据',
          data: data.points.map(p => p.value),
          borderColor: color,
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: (ctx: any) => {
            const p = data.points[ctx.dataIndex];
            if (!p) return 2;
            if (activeStep === 1 && p.isAnomaly) return 4;
            if (activeStep >= 2 && p.isImputed) return 4;
            return 2;
          },
          pointBackgroundColor: (ctx: any) => {
            const p = data.points[ctx.dataIndex];
            if (!p) return color;
            if (activeStep === 1 && p.isAnomaly) return '#EF4444';
            if (activeStep >= 2 && p.isImputed) return '#FACC15';
            return color;
          },
          fill: false,
          spanGaps: activeStep >= 2,
        }
      ]
    };
  };

  return (
    <div className="w-full lg:h-full p-4 md:p-8 flex flex-col lg:min-h-0">
      <div className="flex flex-col xl:flex-row gap-8 flex-1 lg:min-h-0">
        {/* Left Panel */}
        <aside className="w-full xl:w-[320px] shrink-0 lg:h-full lg:min-h-0">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#E5E5E7] shadow-sm flex flex-col h-full lg:overflow-y-auto custom-scrollbar">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#86868B] mb-8">处理步骤</h2>
            
            <div className="space-y-8 flex-1">
              {STEPS.map((step, idx) => {
                const isActive = activeStep === step.id;
                const isCompleted = activeStep > step.id;
                return (
                  <div 
                    key={step.id}
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveStep(step.id);
                    }}
                    className={cn(
                      "relative pl-10 cursor-pointer transition-all group",
                      isActive ? "opacity-100" : "opacity-40 hover:opacity-100"
                    )}
                  >
                    {idx !== STEPS.length - 1 && (
                      <div className={cn(
                        "absolute left-[11px] top-8 bottom-[-32px] w-0.5 transition-colors",
                        isCompleted ? "bg-[#007AFF]" : "bg-gray-100"
                      )} />
                    )}
                    <div className={cn(
                      "absolute left-0 top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-all z-10",
                      isActive ? "border-[#007AFF] ring-8 ring-blue-50" : isCompleted ? "border-[#007AFF] bg-[#007AFF]" : "border-gray-200"
                    )}>
                      {isCompleted && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <div>
                      <h3 className={cn("text-base font-bold mb-1.5 transition-colors", isActive && "text-[#007AFF]")}>{step.title}</h3>
                      {isActive && <p className="text-xs text-[#86868B] leading-relaxed font-medium">{step.desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 space-y-6">
              <div className="p-6 bg-gray-50 rounded-[1.5rem] space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                  <div className="flex items-center gap-3 text-[#1D1D1F] text-sm font-black uppercase tracking-wider">
                    <Info size={18} className="text-[#007AFF]" />
                    数据洞察总览
                  </div>
                  <button 
                    onClick={() => {
                      setDataSeed(prev => prev + 1);
                      setActiveStep(0);
                      setIsPlaying(false);
                    }}
                    className="p-2 hover:bg-white rounded-full transition-colors text-[#86868B] hover:text-[#007AFF]"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#86868B]">检测出异常点:</span>
                    <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-md">{totalAnomalies}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#86868B]">数据缺失统计:</span>
                    <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">{totalMissing}</span>
                  </div>
                  {activeStep >= 2 && (
                    <div className="flex justify-between text-xs font-bold pt-2">
                      <span className="text-[#86868B]">插补修复状态:</span>
                      <span className="text-green-500 flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> 100% 成功
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  "w-full py-4.5 rounded-2xl flex items-center justify-center gap-2 text-base font-black transition-all active:scale-[0.96] shadow-xl",
                  isPlaying 
                    ? "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 shadow-red-500/10" 
                    : "bg-[#007AFF] text-white shadow-[#007AFF]/20 hover:bg-[#0066CC] border border-[#007AFF]"
                )}
              >
                {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                {isPlaying ? "停止演示" : "开始数据清洗"}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white p-6 md:p-10 rounded-[2.5rem] border border-[#E5E5E7] shadow-sm flex flex-col lg:h-full lg:min-h-0 min-w-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 lg:mb-10 gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-blue-50 text-[#007AFF] rounded-2xl border border-blue-100 shadow-inner">
                <Activity size={32} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-black text-[#1D1D1F] tracking-tight">传感器综合数据趋势</h2>
                <div className="flex items-center gap-3">
                   {activeStep >= 1 && (
                     <span className="flex items-center gap-1.5 text-[11px] font-black text-red-500 uppercase bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                        <AlertCircle size={12} /> 异常检测激活
                     </span>
                   )}
                   {activeStep >= 2 && (
                     <span className="text-[11px] font-black text-yellow-600 uppercase bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100">
                        智能线性插补
                     </span>
                   )}
                   {activeStep >= 3 && (
                     <span className="text-[11px] font-black text-[#007AFF] uppercase bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                        滑模滤波执行中
                     </span>
                   )}
                </div>
              </div>
            </div>

            <div className="flex items-center bg-[#F5F5F7] p-1.5 rounded-2xl border border-[#E5E5E7]">
              <button 
                onClick={() => setViewMode('chart')}
                className={cn(
                  "px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-black",
                  viewMode === 'chart' ? "bg-white shadow-md text-[#007AFF]" : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                <LineChartIcon size={20} />
                可视化视图
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-black",
                  viewMode === 'table' ? "bg-white shadow-md text-[#007AFF]" : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                <TableIcon size={20} />
                原始数据表
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar lg:pr-2 lg:pb-0 pb-4 min-h-0">
            {viewMode === 'chart' ? (
              <div className="flex flex-col gap-6 lg:gap-4 h-[900px] lg:h-full">
                {(Object.keys(METRICS) as Array<keyof typeof METRICS>).map((key) => (
                  <div key={key} className="flex-1 min-h-[250px] lg:min-h-0 bg-white border border-[#E5E5E7] rounded-[2rem] px-6 py-4 lg:p-6 relative group hover:border-[#007AFF]/30 transition-all shadow-sm flex flex-col">
                    <div className="absolute top-4 lg:top-6 left-6 lg:left-8 z-10 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: METRICS[key].color }} />
                        <span className="text-sm font-black text-[#1D1D1F] uppercase tracking-[0.1em]">
                          {METRICS[key].label}{METRICS[key].unit ? ` (${METRICS[key].unit})` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 pt-6 lg:pt-8 min-h-0 relative">
                      <Line data={getChartData(key)} options={chartOptions(key)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[600px] lg:h-auto lg:min-h-full border border-[#E5E5E7] rounded-[2rem] overflow-hidden flex flex-col shadow-inner">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 bg-[#F5F5F7] border-b border-[#E5E5E7] z-10">
                      <tr>
                        <th className="px-8 py-5 font-black text-[#86868B] uppercase tracking-[0.2em] text-[11px]">时间刻(Time Step)</th>
                        {Object.keys(METRICS).map(k => (
                          <th key={k} className="px-8 py-5 font-black text-[#86868B] uppercase tracking-[0.2em] text-[11px]">
                            {METRICS[k as keyof typeof METRICS].label}{METRICS[k as keyof typeof METRICS].unit ? ` (${METRICS[k as keyof typeof METRICS].unit})` : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F5F7]">
                      {rawDataset.map((raw, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-8 py-4 font-mono font-bold text-[#86868B] group-hover:text-[#007AFF]">{raw.time}</td>
                          {(Object.keys(METRICS) as Array<keyof typeof METRICS>).map(k => {
                            const p = processedDataMap[k].points[i];
                            return (
                              <td key={k} className="px-8 py-4 font-mono">
                                {p.isImputed && activeStep >= 2 ? (
                                  <span className="text-yellow-600 font-black bg-yellow-50 px-3 py-1 rounded-xl border border-yellow-100 shadow-sm">{p.value} <span className="text-[9px] font-medium">(CL)</span></span>
                                ) : activeStep >= 1 && p.isAnomaly ? (
                                  <span className="text-red-500 font-black bg-red-50 px-3 py-1 rounded-xl border border-red-100 shadow-sm">{p.raw} <span className="text-[9px] font-medium">(AN)</span></span>
                                ) : p.raw === null ? (
                                  <span className="text-gray-300 italic font-medium">缺失(NULL)</span>
                                ) : (
                                  <span className="text-[#1D1D1F] font-bold">{p.value}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>

  );
}
