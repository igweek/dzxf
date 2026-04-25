import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Layers, 
  Target, 
  Info, 
  Video, 
  Play, 
  Pause, 
  Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';

type TabType = 'feed' | 'crab';

interface FeedStage {
  name: string;
  ratio: string;
  px2: string;
  speed: string;
  img: string;
}

const FEED_STAGES: FeedStage[] = [
  { name: 'T=0 投喂初始', ratio: '12.58', px2: '503200', speed: '--', img: '/1.jpg' },
  { name: 'T=60 快速消耗', ratio: '10.66', px2: '426400', speed: '21.33', img: '/2.jpg' },
  { name: 'T=120 阶段判定', ratio: '5.51', px2: '220400', speed: '57.22', img: '/3.jpg' },
  { name: '测试结束', ratio: '0.91', px2: '36400', speed: '51.11', img: '/4.jpg' }
];

const TRACK_CONFIG = [
  { id: 3, distBase: 0.45, speedFactor: 0.25 },
  { id: 4, distBase: 0.02, speedFactor: 0.04 },
  { id: 5, distBase: 0.01, speedFactor: 0.02 }, // Crab #5, very slow movement
  { id: 1, distBase: 0.05, speedFactor: 0.12 },
  { id: 7, distBase: 0.82, speedFactor: 0.18 }
];

export default function VisionModel() {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  
  // Feed Logic State
  const [feedStageIndex, setFeedStageIndex] = useState(-1); // -1 means "Waiting"
  const [isFeedPaused, setIsFeedPaused] = useState(true);
  const feedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Crab Tracking State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [trackingData, setTrackingData] = useState<{
    id: number;
    status: 'ACTIVE' | 'IDLE';
    dist: string;
    speed: string;
  }[]>([]);
  const [activityScore, setActivityScore] = useState('--');
  const [avgSpeed, setAvgSpeed] = useState('--');
  const rafRef = useRef<number | null>(null);

  // --- Feed Handlers ---
  const runNextFeedStage = useCallback(() => {
    setFeedStageIndex(prev => {
      const next = prev + 1;
      if (next >= FEED_STAGES.length) {
        // End of sequence - Reset to start logic
        return 0; 
      }
      return next;
    });
  }, []);

  const toggleFeedSequence = () => {
    if (feedStageIndex === -1 || isFeedPaused) {
      setIsFeedPaused(false);
      setFeedStageIndex(prev => (prev === -1 ? 0 : prev));
      if (feedIntervalRef.current) clearInterval(feedIntervalRef.current);
      feedIntervalRef.current = setInterval(runNextFeedStage, 2000);
    } else {
      setIsFeedPaused(true);
      if (feedIntervalRef.current) clearInterval(feedIntervalRef.current);
    }
  };

  const handleResetFeed = () => {
    if (feedIntervalRef.current) clearInterval(feedIntervalRef.current);
    setFeedStageIndex(-1);
    setIsFeedPaused(true);
  };

  // --- Crab Handlers ---
  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  const updateTrackingUI = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) {
      const time = video.currentTime;
      let totalSpeed = 0;
      
      const newData = TRACK_CONFIG.map(crab => {
        const rawSpeed = crab.speedFactor + (Math.cos(time * 1.5 + crab.id) * 0.05);
        const currentSpeed = Math.max(0, rawSpeed);
        const currentDist = crab.distBase + (time * crab.speedFactor * 0.4);
        const isActive = currentSpeed > 0.06;
        
        totalSpeed += currentSpeed;
        
        return {
          id: crab.id,
          status: (isActive ? 'ACTIVE' : 'IDLE') as 'ACTIVE' | 'IDLE',
          dist: currentDist.toFixed(2),
          speed: currentSpeed.toFixed(2)
        };
      });

      setTrackingData(newData);
      const averageSpeed = totalSpeed / TRACK_CONFIG.length;
      // Refined score logic to stay within 50-90 range
      const score = Math.min(95, Math.max(45, Math.round(averageSpeed * 350 + 40)));
      setActivityScore(String(score));
      setAvgSpeed(averageSpeed.toFixed(3));
    }
    rafRef.current = requestAnimationFrame(updateTrackingUI);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateTrackingUI);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (feedIntervalRef.current) clearInterval(feedIntervalRef.current);
    };
  }, [updateTrackingUI]);

  const currentFeedStage = feedStageIndex === -1 ? null : FEED_STAGES[feedStageIndex];

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-8">
      {/* Tab Selector */}
      <div className="flex space-x-1 bg-white border border-[#E5E5E7] p-1 rounded-2xl w-fit shadow-sm relative overflow-hidden">
        <div 
          className={cn(
            "absolute inset-y-1 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] transition-all duration-300 ease-out",
            activeTab === 'feed' ? "left-1 w-[calc(50%-4px)]" : "left-[50%] w-[calc(50%-4px)]"
          )}
        />
        <button 
          onClick={() => setActiveTab('feed')}
          className={cn(
            "relative flex items-center gap-2 px-8 py-2.5 text-sm font-bold rounded-xl transition-colors z-10",
            activeTab === 'feed' ? "text-[#007AFF]" : "text-[#86868B] hover:text-[#1D1D1F]"
          )}
        >
          <Layers size={18} />
          残饵识别与量化
        </button>
        <button 
          onClick={() => setActiveTab('crab')}
          className={cn(
            "relative flex items-center gap-2 px-8 py-2.5 text-sm font-bold rounded-xl transition-colors z-10",
            activeTab === 'crab' ? "text-[#007AFF]" : "text-[#86868B] hover:text-[#1D1D1F]"
          )}
        >
          <Target size={18} />
          大闸蟹跟踪与活跃度
        </button>
      </div>

      {activeTab === 'feed' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-6">
            <div className="bg-white border border-[#E5E5E7] rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-[#1D1D1F] flex items-center gap-2 mb-6">
                <Info size={22} className="text-[#007AFF]" />
                算法原理
              </h2>
              <div className="space-y-4 text-sm text-[#86868B] leading-relaxed">
                <p>系统采用<strong className="text-[#1D1D1F]">400万像素 (4MP)</strong> 固定视角相机，通过<strong className="text-[#1D1D1F]">分时段采样法</strong>进行残饵量化：</p>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-[#007AFF] font-black">T=0</span>
                    <span>记录初始残饵面积（总像素 4,000,000 px）。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#007AFF] font-black">T=60min</span>
                    <span>计算 3600秒 内的像素消耗速度。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#007AFF] font-black">T=120min</span>
                    <span>判定投喂效果与饲料利用率。</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={toggleFeedSequence}
                className={cn(
                  "w-full py-4 text-sm font-black rounded-2xl border transition-all shadow-xl active:scale-95",
                  (feedStageIndex === -1 || isFeedPaused) ? "bg-[#007AFF] text-white border-[#007AFF] shadow-blue-500/20" : "bg-amber-500 text-white border-amber-500 shadow-amber-500/20"
                )}
              >
                {feedStageIndex === -1 ? '开始模型测试' : isFeedPaused ? '恢复测试' : '暂停测试'}
              </button>
              {feedStageIndex !== -1 && (
                <button 
                  onClick={handleResetFeed}
                  className="w-full py-3 text-xs font-bold text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                >
                  重置测试
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="relative w-full aspect-video bg-[#F5F5F7] rounded-3xl overflow-hidden shadow-sm border border-[#E5E5E7]">
              <img 
                src={currentFeedStage ? currentFeedStage.img : '/1.jpg'} 
                className="absolute inset-0 w-full h-full object-cover"
                alt="监控画面"
              />
              <div className="absolute top-4 left-4 flex gap-2 items-center z-10 text-[10px] font-mono font-black">
                <span className="bg-red-500 px-2 py-0.5 rounded text-white flex items-center gap-1 shadow-sm">
                  <Video size={10} /> REC
                </span>
                <span className="bg-white/80 backdrop-blur-md px-2 py-0.5 rounded border border-[#E5E5E7]">CAM-01 (Feeding Zone)</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-sm">
                <span className="text-[#86868B] text-[10px] font-black uppercase mb-1 block tracking-wider">当前节点</span>
                <span className="text-sm font-bold text-[#1D1D1F]">{currentFeedStage ? currentFeedStage.name : '等待测试...'}</span>
              </div>
              <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-sm">
                <span className="text-[#86868B] text-[10px] font-black uppercase mb-1 block tracking-wider">面积占比</span>
                <div className="flex flex-col">
                  <span className="text-2xl font-black font-mono text-[#1D1D1F]">
                    {currentFeedStage ? currentFeedStage.ratio : '--'}%
                  </span>
                  {currentFeedStage && (
                    <span className="text-xs font-bold text-[#86868B]">
                      {currentFeedStage.px2} px²
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-sm">
                <span className="text-[#86868B] text-[10px] font-black uppercase mb-1 block tracking-wider">消耗速度</span>
                <div className="text-xl font-black font-mono text-[#007AFF]">
                  {currentFeedStage ? (currentFeedStage.speed === '--' ? '--' : `${currentFeedStage.speed} px²/s`) : '-- px²/s'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-6">
            <div className="bg-white border border-[#E5E5E7] rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-[#1D1D1F] flex items-center gap-2 mb-6">
                <Target size={22} className="text-[#007AFF]" />
                跟踪原理
              </h2>
              <div className="text-sm text-[#86868B] leading-relaxed">
                <p>系统实时计算个体位移与频率，基于 <strong className="text-[#1D1D1F]">YOLO</strong> 检测框中心点轨迹生成活跃度评分。</p>
              </div>
            </div>

            <div className="bg-white border border-[#E5E5E7] rounded-3xl p-8 relative overflow-hidden shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#86868B] mb-6">平均实时活跃度</h3>
              <div className="flex items-end gap-3 mb-6">
                <div className="text-7xl font-black font-mono tracking-tighter text-[#007AFF]">{activityScore}</div>
                <div className="text-xs text-[#86868B] font-bold pb-2">/ 100 分</div>
              </div>
              <div className="space-y-3 border-t border-[#F5F5F7] pt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-[#86868B] font-bold">平均位移速度</span>
                  <span className="font-mono text-[#007AFF] font-black">{avgSpeed} m/s</span>
                </div>
              </div>
              <Activity className="absolute -bottom-8 -right-8 w-40 h-40 opacity-[0.03] text-[#007AFF]" />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="relative w-full aspect-video bg-[#000] rounded-3xl border border-[#E5E5E7] overflow-hidden shadow-sm group">
              <video 
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover" 
                autoPlay 
                loop 
                muted 
                playsInline
              >
                <source src="/0424.mp4" type="video/mp4" />
              </video>

              <div className="absolute top-4 left-4 flex gap-2 items-center z-10 text-[10px] font-mono font-black">
                <span className="bg-red-500 px-2 py-0.5 rounded text-white flex items-center gap-1 shadow-sm">
                  <Video size={10} /> REC
                </span>
                <span className="bg-black/40 text-white backdrop-blur-md px-2 py-0.5 rounded border border-white/10">CAM-02 (Tracking Zone)</span>
              </div>

              <button 
                onClick={toggleVideoPlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 backdrop-blur-xl p-5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all scale-95 hover:scale-100 active:scale-90"
              >
                {isVideoPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
            </div>

            <div className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-4 bg-[#F5F5F7] p-4 text-[10px] font-black text-[#86868B] uppercase tracking-widest border-b border-[#E5E5E7]">
                <div>Track ID</div>
                <div>状态</div>
                <div>累计距离 (m)</div>
                <div>即时速度 (m/s)</div>
              </div>
              <div className="divide-y divide-[#F5F5F7]">
                {trackingData.length > 0 ? (
                  trackingData.map(crab => (
                    <div key={crab.id} className="grid grid-cols-4 p-4 text-xs font-mono items-center hover:bg-[#F5F5F7]/50 transition-colors">
                      <div className="text-[#007AFF] font-black">#{crab.id}</div>
                      <div>
                        {crab.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-lg text-[9px] font-black border border-green-100">ACTIVE</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-lg text-[9px] font-black border border-gray-100">IDLE</span>
                        )}
                      </div>
                      <div className="text-[#86868B] font-bold">{crab.dist}</div>
                      <div className="text-[#1D1D1F] font-black">{crab.speed}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-[#86868B] font-bold">
                    等待视频加载...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
