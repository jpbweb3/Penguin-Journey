
import React, { useMemo } from 'react';
import { TARGET_DISTANCE } from '../types';

interface JourneyVisualizationProps {
  distance: number;
  isBlizzard: boolean;
  isMoving: boolean;
  isResting: boolean;
}

const JourneyVisualization: React.FC<JourneyVisualizationProps> = ({ 
  distance, 
  isBlizzard, 
  isMoving,
  isResting 
}) => {
  const peaks = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: `${i * 12 - 5}%`,
      height: `${30 + Math.random() * 50}%`,
      width: `${25 + Math.random() * 25}%`,
      opacity: 0.05 + (Math.random() * 0.1),
      speed: 0.15 + (Math.random() * 0.15),
      color: Math.random() > 0.5 ? 'bg-slate-800' : 'bg-slate-900',
    }));
  }, []);

  return (
    <div className="relative w-full h-32 md:h-44 bg-[#020617] overflow-hidden rounded-xl border border-slate-700/50 shadow-inner group shrink-0">
      <div className={`absolute inset-0 transition-colors duration-[2000ms] ${isBlizzard ? 'bg-slate-900' : 'bg-gradient-to-b from-slate-900 to-slate-950'}`} />

      {peaks.map((peak) => (
        <div
          key={peak.id}
          className={`absolute bottom-0 ${peak.color} transition-transform duration-[3000ms] ease-linear`}
          style={{
            left: peak.left,
            height: peak.height,
            width: peak.width,
            opacity: peak.opacity,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            transform: isMoving ? `translateX(-${(distance * peak.speed * 5) % 40}px)` : 'none',
          }}
        />
      ))}

      <div className="absolute bottom-0 w-full h-8 bg-slate-100/5 backdrop-blur-sm border-t border-white/5" />
      
      <div 
        className="absolute bottom-3 w-[200%] h-1 flex items-center transition-transform duration-[500ms] linear"
        style={{ transform: isMoving ? `translateX(-${(distance * 50) % 50}%)` : 'none' }}
      >
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="w-4 h-0.5 bg-white/10 rounded-full mx-24" />
        ))}
      </div>

      <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${isResting ? 'scale-y-75' : 'scale-100'}`}>
        <div className={`relative flex flex-col items-center ${isMoving ? 'animate-[waddle_0.6s_ease-in-out_infinite]' : ''}`}>
          <div className="w-8 h-10 bg-slate-950 rounded-[2rem] border border-slate-800 relative shadow-2xl overflow-hidden">
             <div className="absolute inset-x-1.5 top-3.5 bottom-1.5 bg-slate-50 rounded-2xl opacity-95" />
             <div className="absolute top-2.5 left-2 w-1 h-1 bg-white rounded-full flex items-center justify-center">
                <div className="w-0.5 h-0.5 bg-black rounded-full" />
             </div>
             <div className="absolute top-2.5 right-2 w-1 h-1 bg-white rounded-full flex items-center justify-center">
                <div className="w-0.5 h-0.5 bg-black rounded-full" />
             </div>
             <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-1.5 bg-amber-400 rounded-sm shadow-sm" />
          </div>
          <div className="flex gap-2 -mt-1">
             <div className={`w-3 h-1.5 bg-amber-500 rounded-full shadow-md ${isMoving ? 'animate-bounce' : ''}`} />
             <div className={`w-3 h-1.5 bg-amber-500 rounded-full shadow-md ${isMoving ? 'animate-bounce [animation-delay:0.3s]' : ''}`} />
          </div>
        </div>
      </div>

      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isBlizzard ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div 
              key={i}
              className="absolute bg-white rounded-full animate-[snow_1s_linear_infinite]"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                animationDuration: `${Math.random() * 0.4 + 0.2}s`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: Math.random() * 0.5,
              }}
            />
          ))}
        </div>
      </div>

      <div className="absolute top-3 right-4 left-4 h-1 bg-slate-900/60 rounded-full overflow-hidden border border-white/5">
         <div 
           className="h-full bg-gradient-to-r from-sky-600 to-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-all duration-1000 ease-out"
           style={{ width: `${(distance / TARGET_DISTANCE) * 100}%` }}
         />
      </div>

      <style>{`
        @keyframes waddle {
          0%, 100% { transform: rotate(-5deg) translateY(0); }
          50% { transform: rotate(5deg) translateY(-3px); }
        }
        @keyframes snow {
          0% { transform: translateX(0) translateY(0); }
          100% { transform: translateX(-80px) translateY(80px); }
        }
      `}</style>
    </div>
  );
};

export default JourneyVisualization;
