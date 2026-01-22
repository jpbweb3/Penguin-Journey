
import React, { useMemo, useRef, useEffect } from 'react';
import { GameState, TARGET_DISTANCE, MapMarker, MarkerType } from '../types';

interface MapViewProps {
  state: GameState;
  onAddMarker: (distance: number) => void;
  onDeleteMarker: (id: string, isLandmark: boolean) => void;
}

const getMarkerIcon = (type: MarkerType) => {
  switch (type) {
    case 'shelter': return '🏠';
    case 'fishing': return '🐟';
    case 'hazard': return '⚠️';
    case 'waypoint': return '📍';
    default: return '✨';
  }
};

const MapView: React.FC<MapViewProps> = ({ state, onAddMarker, onDeleteMarker }) => {
  const mapHeight = 2000; 
  const getPos = (dist: number) => (dist / TARGET_DISTANCE) * mapHeight;
  const currentY = getPos(state.distance);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const containerHeight = scrollRef.current.clientHeight;
      // Scroll to current position, inverted because bottom is starting mile 0
      scrollRef.current.scrollTop = (mapHeight - currentY) - containerHeight / 2;
    }
  }, [currentY, mapHeight]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.marker-btn')) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clickedDistance = Math.floor(((mapHeight - y) / mapHeight) * TARGET_DISTANCE);
    if (clickedDistance >= 0 && clickedDistance <= TARGET_DISTANCE) {
      onAddMarker(clickedDistance);
    }
  };

  // Generate simple triangular mountain features
  const mountainFeatures = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => {
      const size = Math.random() * 12 + 8;
      return {
        id: i,
        x: Math.random() * 85 + 7.5, // Keep away from edges
        y: Math.random() * mapHeight,
        size,
        // Triangular path: top center, bottom right, bottom left
        path: `M 0 -${size} L ${size * 0.7} ${size * 0.3} L -${size * 0.7} ${size * 0.3} Z`,
        snowCap: `M 0 -${size} L ${size * 0.25} -${size * 0.65} L -${size * 0.25} -${size * 0.65} Z`,
      };
    });
  }, [mapHeight]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden rounded-2xl border border-slate-800 relative shadow-2xl">
      {/* Map HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-slate-900/80 to-transparent z-40 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 border border-slate-700 px-3 py-2 rounded-xl backdrop-blur-md">
          <h3 className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-0.5">Journey Map</h3>
          <div className="text-xs font-mono text-slate-100">{state.distance.toFixed(1)}mi ASCENDED</div>
        </div>
        
        <div className="pointer-events-auto text-right">
            <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-[9px] text-sky-300 font-bold uppercase tracking-widest backdrop-blur-md">
                Sector: {state.distance < 150 ? 'Lowlands' : state.distance < 350 ? 'High Passes' : 'Summit Range'}
            </div>
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative bg-[#020617] cursor-crosshair select-none scroll-smooth"
        onClick={handleMapClick}
      >
        <div 
          className="relative w-full"
          style={{ height: `${mapHeight}px` }}
        >
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#38bdf8 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }} />

          {/* Simple Vector Mountains */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none" 
            viewBox={`0 0 100 ${mapHeight}`} 
            preserveAspectRatio="none"
          >
            {mountainFeatures.map(f => (
              <g key={f.id} transform={`translate(${f.x}, ${mapHeight - f.y})`}>
                {/* Mountain Body */}
                <path 
                  d={f.path} 
                  fill="#1e293b" 
                  stroke="#334155" 
                  strokeWidth="0.2"
                />
                {/* Snow Cap Tip */}
                <path 
                  d={f.snowCap} 
                  fill="#f1f5f9" 
                  opacity="0.8"
                />
              </g>
            ))}
          </svg>

          {/* Path Traveled Line */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-0.5 border-l border-dashed border-sky-500/30 z-10"
            style={{ bottom: 0, height: `${currentY}px` }}
          />

          {/* Map Markers */}
          {[...state.markers, ...state.discoveredLandmarks].map(m => (
            <div 
              key={m.id}
              className="absolute left-1/2 -translate-x-1/2 group z-20 marker-btn"
              style={{ bottom: `${getPos(m.distance)}px` }}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteMarker(m.id, state.discoveredLandmarks.some(l => l.id === m.id));
              }}
            >
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 cursor-pointer transform hover:scale-110 transition-all shadow-lg
                ${m.type === 'waypoint' ? 'bg-sky-600 border-sky-300' : 'bg-slate-800 border-sky-500/50'}
              `}>
                <span className="text-sm">{getMarkerIcon(m.type)}</span>
              </div>
              
              <div className="absolute left-10 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 p-2 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                <div className="font-bold text-sky-400">{m.label}</div>
                <div className="text-slate-500 text-[8px]">{m.distance.toFixed(1)}mi</div>
              </div>
            </div>
          ))}

          {/* Pips Player Icon */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-700 ease-out"
            style={{ bottom: `${currentY}px` }}
          >
            <div className="relative">
                <div className="absolute -inset-4 bg-sky-500/20 blur-xl animate-pulse rounded-full" />
                <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-sky-400 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                    <span className="text-xl">🐧</span>
                </div>
            </div>
          </div>

          {/* Fog Of War */}
          <div 
            className="absolute top-0 left-0 w-full bg-slate-950/80 backdrop-blur-[1px] pointer-events-none z-40 transition-all duration-1000"
            style={{ height: `${Math.max(0, mapHeight - currentY - 150)}px` }}
          >
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-transparent to-slate-950" />
          </div>

          {/* Goal Marker */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-sky-500/40 animate-[spin_20s_linear_infinite]" />
            <div className="absolute top-2 flex items-center justify-center">
                <span className="text-2xl">🏆</span>
            </div>
            <div className="text-sky-400 font-black text-[8px] uppercase tracking-[0.4em] mt-2">Summit</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
