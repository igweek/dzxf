import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Droplets, 
  Thermometer, 
  TrendingUp, 
  ShieldCheck,
  MousePointer2,
  Zap,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

const INITIAL_STATUS_CARDS = [
  { id: 'temp', label: '水温', value: 24.5, unit: '°C', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50', jitter: 0.1 },
  { id: 'do', label: '溶氧', value: 7.8, unit: 'mg/L', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50', jitter: 0.05 },
  { id: 'ph', label: 'pH值', value: 8.2, unit: '', icon: Activity, color: 'text-green-500', bg: 'bg-green-50', jitter: 0.02 },
];

export default function Home() {
  const [cards, setCards] = useState(INITIAL_STATUS_CARDS.map(c => ({ ...c, trend: '+0.0%', trendColor: 'text-green-500' })));
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [activeMetric, setActiveMetric] = useState('temp');

  // Initialize history data
  useEffect(() => {
    const initialData = [];
    const now = new Date();
    for (let i = 20; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      initialData.push({
        time: `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`,
        temp: 24 + Math.random() * 2,
        do: 7 + Math.random() * 2,
        ph: 8 + Math.random() * 0.5
      });
    }
    setHistoryData(initialData);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCards(prevCards => prevCards.map(card => {
        const change = (Math.random() - 0.5) * card.jitter * 2;
        const newValue = card.value + change;
        
        return {
          ...card,
          value: parseFloat(newValue.toFixed(2)),
          trend: change >= 0 ? `+${Math.abs((change / card.value) * 100).toFixed(1)}%` : `-${Math.abs((change / card.value) * 100).toFixed(1)}%`,
          trendColor: change >= 0 ? 'text-green-500' : 'text-red-500'
        };
      }));

      setHistoryData(prev => {
        const nextTime = new Date();
        const newData = {
          time: `${nextTime.getHours()}:${nextTime.getMinutes().toString().padStart(2, '0')}`,
          temp: 24 + Math.random() * 2,
          do: 7 + Math.random() * 2,
          ph: 8 + Math.random() * 0.5
        };
        return [...prev.slice(1), newData];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const distributionData = [
    { name: '正常', value: 85, color: '#22c55e' },
    { name: '预警', value: 12, color: '#eab308' },
    { name: '异常', value: 3, color: '#ef4444' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-8 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white text-[#1D1D1F] p-12 shadow-sm border border-[#E5E5E7] min-h-[440px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://cdn.nodeimage.com/i/sVXW1HmAe4muUMsM1zat4gze25d6YyGH.webp" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-100"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-black tracking-tight mb-6 leading-[1.1]">
              蟹路先锋 <br />
              <span className="text-[#007AFF]">引领水产养殖 <br /> 智慧化革新。</span>
            </h1>
            <p className="text-lg text-[#86868B] font-medium mb-10 max-w-md leading-relaxed">
              集成机器视觉与复杂环境数据清洗算法，为水产养殖提供全方位的精准分析与决策支持。
            </p>
          </motion.div>
        </div>
      </section>

      {/* Real-time Status */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <TrendingUp className="text-[#007AFF]" />
            养殖实时体征
          </h2>
          <span className="text-xs font-bold text-[#86868B] px-3 py-1 bg-white border border-[#E5E5E7] rounded-full">
            每 5 秒自动同步
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setActiveMetric(card.id)}
              className={`bg-white p-8 rounded-[2rem] border transition-all cursor-pointer group ${
                activeMetric === card.id ? 'border-[#007AFF] shadow-lg shadow-blue-50' : 'border-[#E5E5E7] shadow-sm hover:shadow-xl hover:shadow-gray-200/50'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 ${card.bg} ${card.color} rounded-2xl`}>
                  <card.icon size={24} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-[#86868B] uppercase tracking-widest">趋势</span>
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={card.trend}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className={`text-[10px] font-bold ${card.trendColor}`}
                    >
                      {card.trend}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-[#86868B] block mb-1 uppercase tracking-wider">{card.label}</span>
                <div className="flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={card.value}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-4xl font-black tracking-tight"
                    >
                      {card.value}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-sm font-bold text-[#86868B]">{card.unit}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Dynamic Analytics Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Trend Map */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-[#E5E5E7] shadow-sm flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Activity size={20} className="text-[#007AFF]" />
                时序动态监测
              </h3>
              <p className="text-xs font-bold text-[#86868B] uppercase tracking-widest mt-1">
                多指标实时监测趋势
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#86868B]">
                <div className="w-2 h-2 rounded-full bg-orange-500" /> 水温
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#86868B]">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> 溶解氧
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#86868B]">
                <div className="w-2 h-2 rounded-full bg-green-500" /> pH值
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#86868B', fontWeight: 600 }}
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#86868B', fontWeight: 600 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #E5E5E7',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="temp" 
                  name="水温"
                  stroke="#f97316" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTemp)" 
                  animationDuration={1000}
                />
                <Area 
                  type="monotone" 
                  dataKey="do" 
                  name="溶解氧"
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorDO)" 
                  animationDuration={1000}
                />
                <Area 
                  type="monotone" 
                  dataKey="ph" 
                  name="pH值"
                  stroke="#22c55e" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPH)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Stats */}
        <div className="flex flex-col h-[500px]">
          {/* Health Distribution */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-[#E5E5E7] shadow-sm flex flex-col items-center h-full">
            <h3 className="text-sm font-black tracking-widest text-[#86868B] uppercase mb-6 w-full flex items-center gap-2">
              <PieChartIcon size={16} className="text-[#007AFF]" />
              监测状态分布
            </h3>
            <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0">
              <div className="h-[200px] w-full min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-3 mt-6 w-full px-4 overflow-y-auto custom-scrollbar">
                {distributionData.map(d => (
                  <div key={d.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[12px] font-bold text-[#86868B]">{d.name}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color: d.color }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}


