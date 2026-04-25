import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Droplets, 
  Thermometer, 
  TrendingUp, 
  ShieldCheck, 
} from 'lucide-react';

const INITIAL_STATUS_CARDS = [
  { label: '水温', value: 24.5, unit: '°C', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50', jitter: 0.1 },
  { label: '溶解氧', value: 7.8, unit: 'mg/L', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50', jitter: 0.05 },
  { label: 'pH值', value: 8.2, unit: '', icon: Activity, color: 'text-green-500', bg: 'bg-green-50', jitter: 0.02 },
  { label: '系统负载', value: 12, unit: '%', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-50', jitter: 1 },
];

export default function Home() {
  const [cards, setCards] = useState(INITIAL_STATUS_CARDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setCards(prevCards => prevCards.map(card => {
        const change = (Math.random() - 0.5) * card.jitter * 2;
        const newValue = card.value + change;
        
        // Clamp values logic if needed, but simple jitter for now
        return {
          ...card,
          value: parseFloat(newValue.toFixed(2)),
          trend: change >= 0 ? `+${Math.abs((change / card.value) * 100).toFixed(1)}%` : `-${Math.abs((change / card.value) * 100).toFixed(1)}%`,
          trendColor: change >= 0 ? 'text-green-500' : 'text-red-500'
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-8 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white text-[#1D1D1F] p-12 shadow-sm border border-[#E5E5E7] min-h-[440px] flex items-center">
        {/* Background Image with Overlay */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, idx) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-[2rem] border border-[#E5E5E7] shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all group"
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
                      className={`text-[10px] font-bold ${card.trendColor || 'text-green-500'}`}
                    >
                      {card.trend || '+0.0%'}
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

    </div>
  );
}

