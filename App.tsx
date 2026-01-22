
import React, { useState, useEffect } from 'react';
import { GameStatus, GameState, TARGET_DISTANCE, MapMarker, JourneyData } from './types';
import { JOURNEYS, NARRATIVE_LEADS } from './data/journeys';
import Snowfall from './components/Snowfall';
import MapView from './components/MapView';
import JourneyVisualization from './components/JourneyVisualization';

const getInitialState = (): GameState => {
  const randomJourney = JOURNEYS[Math.floor(Math.random() * JOURNEYS.length)];
  return {
    distance: 0,
    day: 1,
    health: 100,
    hunger: 100,
    warmth: 100,
    morale: 100,
    inventory: {
      fish: 5,
      stones: 0,
      wood: 0,
    },
    status: GameStatus.START,
    lastMessage: "You make the decision to head into the mountains and leave your colony behind. Why? Does there need to be a reason?",
    markers: [],
    discoveredLandmarks: [],
    isBlizzard: false,
    nextMilestone: 100,
    activeJourneyId: randomJourney.id,
    narrativeHistory: {
      leads: [],
      travel: [],
      rest: [],
      forage: [],
      env: [],
      status: [],
    }
  };
};

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(getInitialState());
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [view, setView] = useState<'journey' | 'stats' | 'map'>('journey');
  const [lastAction, setLastAction] = useState<string | null>(null);

  const activeJourney = JOURNEYS.find(j => j.id === state.activeJourneyId) || JOURNEYS[0];

  useEffect(() => {
    if (state.health <= 0 || state.hunger <= 0 || state.warmth <= 0) {
      setState(prev => ({ ...prev, status: GameStatus.GAMEOVER }));
    } else if (state.distance >= TARGET_DISTANCE) {
      setState(prev => ({ ...prev, status: GameStatus.WIN }));
    }
  }, [state.health, state.hunger, state.warmth, state.distance]);

  /**
   * High-Entropy Combinatorial Narrator with strict Blacklisting.
   * Ensures every fragment is only used once per journey.
   */
  const generateUniqueNarrative = (state: GameState, action: 'travel' | 'rest' | 'forage', journey: JourneyData) => {
    const history = state.narrativeHistory;

    const pickUnique = (pool: string[], historyKey: keyof typeof history) => {
      const usedIndices = history[historyKey] as number[];
      const availableIndices = pool.map((_, i) => i).filter(i => !usedIndices.includes(i));
      
      // If we somehow run out of unique fragments, reset the history for that pool
      if (availableIndices.length === 0) {
        const index = Math.floor(Math.random() * pool.length);
        return { index, value: pool[index], reset: true };
      }
      
      const index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      return { index, value: pool[index], reset: false };
    };

    const leadRes = pickUnique(NARRATIVE_LEADS, 'leads');
    const actionRes = pickUnique(journey.narrativePool[action], action);
    
    const envKey = state.distance < 150 ? 'lowlands' : state.distance < 350 ? 'highPasses' : 'summit';
    const envRes = pickUnique(journey.environmentalSnippets[envKey], 'env');
    
    // Determine which situational pool to use
    let statusPool = journey.situationalSnippets.thriving;
    if (state.isBlizzard) statusPool = journey.situationalSnippets.blizzard;
    else if (state.health < 30) statusPool = journey.situationalSnippets.lowHealth;
    else if (state.hunger < 30) statusPool = journey.situationalSnippets.starving;
    else if (state.warmth < 30) statusPool = journey.situationalSnippets.freezing;
    else if (state.morale < 30) statusPool = journey.situationalSnippets.lowMorale;

    const statusRes = pickUnique(statusPool, 'status');

    const finalMessage = `${leadRes.value} ${actionRes.value} ${envRes.value} ${statusRes.value}`;

    return {
      message: finalMessage,
      indices: {
        leads: leadRes.index,
        [action]: actionRes.index,
        env: envRes.index,
        status: statusRes.index,
      },
      resets: {
        leads: leadRes.reset,
        [action]: actionRes.reset,
        env: envRes.reset,
        status: statusRes.reset,
      }
    };
  };

  const handleAction = async (action: 'travel' | 'rest' | 'forage') => {
    if (loading || state.status === GameStatus.GAMEOVER || state.status === GameStatus.WIN) return;
    setLoading(true);
    setLastAction(action);

    // Simulated atmospheric delay
    await new Promise(r => setTimeout(r, 600));

    let nextState = { ...state, inventory: { ...state.inventory }, narrativeHistory: { ...state.narrativeHistory } };
    let narrativePrefix = "";

    if (nextState.isBlizzard && Math.random() > 0.6) {
      nextState.isBlizzard = false;
      narrativePrefix = "The screaming winds subside at last, leaving a deafening quiet. ";
    }

    switch (action) {
      case 'travel':
        const dist = Math.floor(Math.random() * 20) + 15;
        nextState.distance += dist;
        nextState.hunger -= 14;
        nextState.warmth -= 12;
        nextState.morale -= 6;
        if (Math.random() > 0.8) nextState.isBlizzard = true;
        break;
      case 'rest':
        nextState.warmth = Math.min(100, nextState.warmth + 35);
        nextState.hunger -= 10;
        nextState.health = Math.min(100, nextState.health + 8);
        nextState.morale = Math.min(100, nextState.morale + 12);
        if (nextState.inventory.fish > 0 && nextState.hunger < 70) {
            nextState.inventory.fish--;
            nextState.hunger = Math.min(100, nextState.hunger + 35);
            narrativePrefix += "The taste of the dried fish is oily and rich, sending a wave of strength through your shivering frame. ";
        }
        break;
      case 'forage':
        const found = Math.floor(Math.random() * 4);
        nextState.inventory.fish += found;
        nextState.hunger -= 12;
        nextState.warmth -= 18;
        narrativePrefix = (found > 0 ? `Your patience is rewarded as you pull ${found} silver-finned fish from the ice. ` : "The hunt is fruit-less; the ice remains stubbornly empty of life. ") + narrativePrefix;
        break;
    }

    nextState.day += 1;

    // Use local combinatorial engine (infinite uniqueness)
    const narrativeResult = generateUniqueNarrative(nextState, action, activeJourney);
    nextState.lastMessage = narrativePrefix + narrativeResult.message;
    
    // Update history indices to prevent reuse
    const h = nextState.narrativeHistory;
    nextState.narrativeHistory = {
      leads: narrativeResult.resets.leads ? [narrativeResult.indices.leads] : [...h.leads, narrativeResult.indices.leads],
      travel: action === 'travel' ? (narrativeResult.resets.travel ? [narrativeResult.indices.travel] : [...h.travel, narrativeResult.indices.travel]) : h.travel,
      rest: action === 'rest' ? (narrativeResult.resets.rest ? [narrativeResult.indices.rest] : [...h.rest, narrativeResult.indices.rest]) : h.rest,
      forage: action === 'forage' ? (narrativeResult.resets.forage ? [narrativeResult.indices.forage] : [...h.forage, narrativeResult.indices.forage]) : h.forage,
      env: narrativeResult.resets.env ? [narrativeResult.indices.env] : [...h.env, narrativeResult.indices.env],
      status: narrativeResult.resets.status ? [narrativeResult.indices.status] : [...h.status, narrativeResult.indices.status],
    };

    const triggeredEventBeat = activeJourney.fixedEvents.find(
      beat => state.distance < beat.distance && nextState.distance >= beat.distance
    );

    if (triggeredEventBeat) {
        setActiveEvent(triggeredEventBeat.event);
        nextState.status = GameStatus.EVENT;
        if (window.innerWidth < 768) setView('journey');
    } else {
        nextState.status = GameStatus.PLAYING;
    }

    setState(nextState);
    setLoading(false);
  };

  const handleChoice = (choice: any) => {
    setState(prev => {
        const nextState = { ...prev, inventory: { ...prev.inventory } };
        nextState.health = Math.min(100, Math.max(0, nextState.health + (choice.statChanges?.health || 0)));
        nextState.hunger = Math.min(100, Math.max(0, nextState.hunger + (choice.statChanges?.hunger || 0)));
        nextState.warmth = Math.min(100, Math.max(0, nextState.warmth + (choice.statChanges?.warmth || 0)));
        nextState.morale = Math.min(100, Math.max(0, nextState.morale + (choice.statChanges?.morale || 0)));
        nextState.inventory.fish = Math.max(0, nextState.inventory.fish + (choice.statChanges?.fish || 0));
        
        nextState.status = GameStatus.PLAYING;
        nextState.lastMessage = choice.detailedOutcome;
        return nextState;
    });
    setActiveEvent(null);
  };

  const onAddMarker = (dist: number) => {
    const newMarker: MapMarker = {
      id: Math.random().toString(36).substring(2, 9),
      distance: dist,
      label: "Expedition Waypoint",
      type: 'waypoint',
    };
    setState(prev => ({ ...prev, markers: [...prev.markers, newMarker] }));
  };

  const onDeleteMarker = (id: string, isLandmark: boolean) => {
    setState(prev => ({
      ...prev,
      markers: prev.markers.filter(m => m.id !== id),
      discoveredLandmarks: prev.discoveredLandmarks.filter(m => m.id !== id),
    }));
  };

  const StatsContent = () => (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 backdrop-blur-md shrink-0 shadow-lg">
        <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Survival Metrics</h3>
        <div className="flex flex-col gap-3">
          <StatBar label="Health" value={state.health} color="bg-rose-500" icon="❤️" />
          <StatBar label="Warmth" value={state.warmth} color="bg-orange-500" icon="🌡️" />
          <StatBar label="Hunger" value={state.hunger} color="bg-amber-500" icon="🍖" />
          <StatBar label="Morale" value={state.morale} color="bg-indigo-500" icon="✨" />
        </div>
      </div>
      
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 backdrop-blur-md shrink-0 shadow-lg">
        <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Inventory</h3>
        <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded-xl border border-white/5 shadow-inner">
            <div className="flex items-center gap-2">
                <span className="text-lg">🐟</span>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Fish Stocks</span>
            </div>
            <span className="font-mono text-base text-sky-400 font-black">{state.inventory.fish}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-950 text-slate-100 font-sans p-2 md:p-3 flex flex-col items-center selection:bg-sky-500/30 overflow-hidden">
      <Snowfall />
      
      <div className="max-w-4xl w-full h-full flex flex-col gap-2 z-10 relative">
        <header className="flex justify-between items-center bg-slate-900/40 p-2 md:p-3 rounded-2xl border border-white/5 backdrop-blur-md shrink-0 shadow-2xl">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-2xl font-black tracking-tighter text-white">PIPS' <span className="text-sky-400">PILGRIMAGE</span></h1>
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[7px] md:text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">{state.distance.toFixed(0)}mi ascended</p>
            </div>
          </div>
          <div className="flex gap-1">
            <NavButton active={view === 'journey'} onClick={() => setView('journey')}>JOURNEY</NavButton>
            <NavButton className="md:hidden" active={view === 'stats'} onClick={() => setView('stats')}>STATS</NavButton>
            <NavButton active={view === 'map'} onClick={() => setView('map')}>MAP</NavButton>
          </div>
        </header>

        <div className="flex-1 overflow-hidden min-h-0">
          {view === 'journey' ? (
            <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2 flex flex-col gap-2 overflow-hidden h-full">
                <div className="shrink-0">
                  <JourneyVisualization 
                    distance={state.distance} 
                    isBlizzard={state.isBlizzard} 
                    isMoving={loading && lastAction === 'travel'}
                    isResting={loading && lastAction === 'rest'}
                  />
                </div>
                
                <div className="flex-1 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col backdrop-blur-lg relative overflow-hidden group min-h-0 shadow-2xl">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                      <span className="text-5xl select-none">🏔️</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                    <div className="relative z-10 mb-6">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        <span className="text-[8px] md:text-[10px] font-black text-sky-500 uppercase tracking-[0.3em]">The Chronicler</span>
                      </div>
                      <div className={`transition-opacity duration-500 ${loading ? 'opacity-40' : 'opacity-100'}`}>
                        <p className="text-slate-200 leading-relaxed italic text-xs md:text-sm font-medium">
                          "{state.lastMessage}"
                        </p>
                      </div>
                    </div>
                    
                    {state.status === GameStatus.EVENT && activeEvent && (
                      <div className="pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[8px] bg-sky-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">{activeEvent.eventType || 'Event'}</span>
                            <h3 className="text-base md:text-xl font-black text-white tracking-tight">{activeEvent.title}</h3>
                        </div>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-6 font-light">{activeEvent.description}</p>
                        <div className="grid grid-cols-1 gap-2.5 mb-6">
                          {activeEvent.options.map((option: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => handleChoice(option)}
                              className="w-full text-left p-4 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-sky-400 hover:bg-sky-600/10 transition-all text-xs group/choice flex items-center justify-between"
                            >
                              <div className="font-bold text-sky-400 group-hover/choice:text-sky-300 uppercase tracking-widest">{option.text}</div>
                              <span className="opacity-0 group-hover/choice:opacity-100 transition-all translate-x-[-10px] group-hover/choice:translate-x-0 text-sky-500">PROCEED →</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[8px] text-slate-500 italic text-center uppercase tracking-widest opacity-50">Every path through the peaks is bought with breath and blood.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 mb-1">
                  {state.status === GameStatus.PLAYING || state.status === GameStatus.START ? (
                    <div className="grid grid-cols-3 gap-2">
                      <ActionButton 
                        label="Travel" 
                        icon="👣" 
                        desc="Forge Ahead" 
                        disabled={loading} 
                        onClick={() => handleAction('travel')} 
                      />
                      <ActionButton 
                        label="Rest" 
                        icon="🔥" 
                        desc="Seek Shelter and Eat" 
                        disabled={loading} 
                        onClick={() => handleAction('rest')} 
                      />
                      <ActionButton 
                        label="Forage" 
                        icon="🎣" 
                        desc="Search for Food" 
                        disabled={loading} 
                        onClick={() => handleAction('forage')} 
                      />
                    </div>
                  ) : state.status === GameStatus.GAMEOVER ? (
                    <GameOverPanel onRestart={() => setState(getInitialState())} />
                  ) : state.status === GameStatus.WIN ? (
                    <WinPanel onRestart={() => setState(getInitialState())} />
                  ) : null}
                </div>
              </div>

              <div className="hidden md:flex flex-col gap-2 overflow-hidden h-full">
                <StatsContent />
              </div>
            </div>
          ) : view === 'stats' ? (
            <div className="h-full animate-in fade-in duration-300">
               <StatsContent />
            </div>
          ) : (
            <div className="h-full animate-in zoom-in-95 fade-in duration-300">
              <MapView 
                state={state} 
                onAddMarker={onAddMarker} 
                onDeleteMarker={onDeleteMarker} 
              />
            </div>
          )}
        </div>
        
        <footer className="shrink-0 text-center pb-1">
            <div className="inline-block px-4 py-1.5 bg-slate-900/60 border border-white/5 rounded-full backdrop-blur-sm shadow-xl">
                <p className="text-[8px] font-mono tracking-[0.3em] uppercase text-slate-400 font-bold">
                    <span className="text-sky-400">§</span> {activeJourney.title} <span className="text-slate-700 mx-2">|</span> DAY {state.day} <span className="text-slate-700 mx-2">|</span> {state.distance.toFixed(0)} / {TARGET_DISTANCE} MILES
                </p>
            </div>
        </footer>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ label: string, icon: string, desc: string, disabled: boolean, onClick: () => void }> = ({ label, icon, desc, disabled, onClick }) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl overflow-hidden"
  >
    <span className={`text-2xl mb-1 group-hover:scale-110 transition-transform duration-300 ${disabled ? 'animate-pulse' : ''}`}>{icon}</span>
    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-sky-400 transition-colors">{label}</span>
    <span className="text-[7px] font-bold text-slate-600 uppercase group-hover:text-slate-400 transition-colors line-clamp-1">{desc}</span>
    
    <div className="absolute inset-0 rounded-2xl bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
  </button>
);

const NavButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode, className?: string }> = ({ active, onClick, children, className = "" }) => (
  <button 
    onClick={onClick}
    className={`${className} px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black transition-all uppercase tracking-[0.2em] ${active ? 'bg-sky-600 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)]' : 'bg-slate-800/50 text-slate-500 hover:text-slate-200 hover:bg-slate-700'}`}
  >
    {children}
  </button>
);

const StatBar: React.FC<{ label: string, value: number, color: string, icon: string }> = ({ label, value, color, icon }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between items-center px-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs">{icon}</span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[10px] font-mono font-black text-slate-300">{Math.round(value)}%</span>
    </div>
    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 shadow-inner p-0.5">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.5)]`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const GameOverPanel: React.FC<{ onRestart: () => void }> = ({ onRestart }) => (
    <div className="p-6 bg-rose-950/30 border border-rose-900/50 rounded-3xl text-center backdrop-blur-xl animate-in zoom-in-95 duration-500 shadow-2xl">
        <div className="text-5xl mb-3">💀</div>
        <h2 className="text-xl font-black text-rose-500 mb-1 uppercase tracking-tighter">Frozen in the Void</h2>
        <p className="text-slate-400 text-[10px] mb-5 leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest font-bold">Pips has become one with the mountain. His journey ends here.</p>
        <button onClick={onRestart} className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black transition-all shadow-2xl uppercase tracking-[0.3em] active:scale-95">Restart Pilgrimage</button>
    </div>
);

const WinPanel: React.FC<{ onRestart: () => void }> = ({ onRestart }) => (
    <div className="p-6 bg-sky-950/30 border border-sky-900/50 rounded-3xl text-center backdrop-blur-xl animate-in zoom-in-95 duration-500 shadow-2xl">
        <div className="text-5xl mb-3">🏔️</div>
        <h2 className="text-xl font-black text-sky-400 mb-1 uppercase tracking-tighter">The World Below</h2>
        <p className="text-slate-400 text-[10px] mb-5 leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest font-bold">The summit is reached. You stand where few have ever breathed.</p>
        <button onClick={onRestart} className="px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[10px] font-black transition-all shadow-2xl uppercase tracking-[0.3em] active:scale-95">Begin New Ascent</button>
    </div>
);

export default App;
