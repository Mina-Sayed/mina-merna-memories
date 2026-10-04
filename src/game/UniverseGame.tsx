import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { loveStory, type Memory } from '../config/loveStory';
import {
  createSharedMemory,
  deleteSharedMemory,
  listSharedMemories,
  verifyAdminPin,
  type SharedMemory,
} from './memoryStore';
import type { Movement } from './WorldScene';
import {
  AdminModal,
  CatchStars,
  Constellation,
  Finale,
  Hud,
  Intro,
  Joystick,
  Letter,
  MemoryModal,
  MemoryStudio,
  PauseMenu,
  SharedMemoryModal,
} from './ui';

const WorldScene = lazy(() => import('./WorldScene'));

type Overlay =
  | 'memory'
  | 'shared-memory'
  | 'stars'
  | 'constellation'
  | 'letter'
  | 'menu'
  | 'finale'
  | 'studio-add'
  | 'studio-gallery'
  | 'admin'
  | null;

function canUseWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function playChime(enabled: boolean, pitch = 660) {
  if (!enabled) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = pitch;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.58);
    oscillator.addEventListener('ended', () => void ctx.close());
  } catch {
    return;
  }
}

export default function UniverseGame() {
  const movement = useRef<Movement>({ x: 0, z: 0 });
  const [entered, setEntered] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedSharedMemory, setSelectedSharedMemory] = useState<SharedMemory | null>(null);
  const [sharedMemories, setSharedMemories] = useState<SharedMemory[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [collected, setCollected] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem('mm-collected');
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set<number>(
        Array.isArray(parsed)
          ? parsed.filter((value): value is number => typeof value === 'number')
          : []
      );
    } catch {
      return new Set<number>();
    }
  });
  const [sharedCollected, setSharedCollected] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('mm-shared-collected');
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set<string>(
        Array.isArray(parsed)
          ? parsed.filter((value): value is string => typeof value === 'string')
          : []
      );
    } catch {
      return new Set<string>();
    }
  });
  const [sound, setSound] = useState(
    () => sessionStorage.getItem('mm-sound') !== 'off'
  );
  const [webgl] = useState(canUseWebGL);

  const loadMemories = useCallback(async () => {
    setMemoryLoading(true);
    setMemoryError('');
    try {
      const memories = await listSharedMemories();
      const safeMemories = Array.isArray(memories) ? memories : [];
      setSharedMemories(safeMemories);
      setSharedCollected(currentSet => {
        const validIds = new Set(safeMemories.map(memory => memory.id));
        return new Set([...currentSet].filter(id => validIds.has(id)));
      });
    } catch {
      setMemoryError('مقدرناش نجيب الذكريات المضافة. اتأكد من النت وحاول تاني.');
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  useEffect(() => {
    localStorage.setItem('mm-collected', JSON.stringify([...collected]));
  }, [collected]);

  useEffect(() => {
    localStorage.setItem(
      'mm-shared-collected',
      JSON.stringify([...sharedCollected])
    );
  }, [sharedCollected]);

  useEffect(() => {
    sessionStorage.setItem('mm-sound', sound ? 'on' : 'off');
  }, [sound]);

  useEffect(() => {
    if (!entered) return;
    const down = (event: KeyboardEvent) => {
      if (event.key === 'w' || event.key === 'ArrowUp') movement.current.z = -1;
      if (event.key === 's' || event.key === 'ArrowDown') movement.current.z = 1;
      if (event.key === 'a' || event.key === 'ArrowLeft') movement.current.x = -1;
      if (event.key === 'd' || event.key === 'ArrowRight') movement.current.x = 1;
    };
    const up = (event: KeyboardEvent) => {
      if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        movement.current.z = 0;
      }
      if (['a', 'd', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        movement.current.x = 0;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [entered]);

  const openMemory = useCallback(
    (memory: Memory) => {
      if (overlay && overlay !== 'memory') return;
      setSelectedMemory(memory);
      setOverlay('memory');
      playChime(sound, 760);
    },
    [overlay, sound]
  );

  const openSharedMemory = useCallback(
    (memory: SharedMemory) => {
      if (overlay && overlay !== 'shared-memory') return;
      setSelectedSharedMemory(memory);
      setOverlay('shared-memory');
      playChime(sound, 700);
    },
    [overlay, sound]
  );

  const exploreNext = () => {
    const next =
      loveStory.memories.find(memory => !collected.has(memory.id)) ??
      loveStory.memories[6];
    openMemory(next);
  };

  const keepMemory = () => {
    if (!selectedMemory) return;
    if (!collected.has(selectedMemory.id)) {
      setCollected(currentSet => new Set([...currentSet, selectedMemory.id]));
      playChime(sound, 920);
      if ('vibrate' in navigator) navigator.vibrate?.([25, 30, 25]);
    }
    setOverlay(null);
  };

  const keepSharedMemory = () => {
    if (!selectedSharedMemory) return;
    if (!sharedCollected.has(selectedSharedMemory.id)) {
      setSharedCollected(
        currentSet => new Set([...currentSet, selectedSharedMemory.id])
      );
      playChime(sound, 900);
      if ('vibrate' in navigator) navigator.vibrate?.([20, 28, 20]);
    }
    setOverlay(null);
  };

  const enterAdmin = async (pin: string) => {
    await verifyAdminPin(pin);
    setAdminPin(pin);
    setIsAdmin(true);
    setOverlay('menu');
  };

  const leaveAdmin = () => {
    setAdminPin('');
    setIsAdmin(false);
    setOverlay('menu');
  };

  const saveSharedMemory = async (input: {
    title: string;
    message: string;
    date?: string;
    imageDataUrl?: string;
  }) => {
    if (!isAdmin || !adminPin) throw new Error('افتح وضع الإدارة الأول.');
    const memory = await createSharedMemory(input, adminPin);
    setSharedMemories(currentMemories =>
      [...currentMemories, memory].sort((a, b) => a.createdAt - b.createdAt)
    );
    playChime(sound, 880);
    if ('vibrate' in navigator) navigator.vibrate?.(35);
  };

  const removeSharedMemory = async (id: string) => {
    if (!isAdmin || !adminPin) throw new Error('افتح وضع الإدارة الأول.');
    await deleteSharedMemory(id, adminPin);
    setSharedMemories(currentMemories =>
      currentMemories.filter(memory => memory.id !== id)
    );
    setSharedCollected(currentSet => {
      const next = new Set(currentSet);
      next.delete(id);
      return next;
    });
    if (selectedSharedMemory?.id === id) {
      setSelectedSharedMemory(null);
      setOverlay(null);
    }
    playChime(sound, 520);
  };

  const restart = () => {
    setCollected(new Set());
    setSharedCollected(new Set());
    localStorage.removeItem('mm-collected');
    localStorage.removeItem('mm-shared-collected');
    setOverlay(null);
    setSelectedMemory(null);
    setSelectedSharedMemory(null);
    setEntered(false);
  };

  if (!entered) {
    return (
      <Intro
        onEnter={() => {
          setEntered(true);
          playChime(sound, 540);
        }}
      />
    );
  }

  const finaleUnlocked = collected.size >= 7;

  return (
    <main className="game-shell" dir="rtl">
      <div className="world-layer">
        {webgl ? (
          <Suspense
            fallback={
              <div className='world-loading'>
                <div className='world-loading-star'>✦</div>
                <span>بنجهّز عالمنا…</span>
              </div>
            }
          >
            <WorldScene
              movement={movement}
              collected={collected}
              sharedCollected={sharedCollected}
              memories={loveStory.memories}
              sharedMemories={sharedMemories}
              finaleUnlocked={finaleUnlocked}
              onMemory={openMemory}
              onSharedMemory={openSharedMemory}
            />
          </Suspense>
        ) : (
          <div className="fallback-world">
            <div className="fallback-moon" />
            <h2>كوننا الصغير لسه هنا.</h2>
            <p>الجهاز ده شغّال بالوضع البصري الخفيف علشان التجربة ماتقفش.</p>
          </div>
        )}
      </div>

      <div className="vignette" />
      <motion.div
        className="world-title"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span>مينا وميرنا</span>
        <small>كوننا الصغير</small>
      </motion.div>

      <Hud
        count={collected.size}
        sharedCount={sharedCollected.size}
        sharedTotal={sharedMemories.length}
        sound={sound}
        onSound={() => setSound(value => !value)}
        onMenu={() => setOverlay('menu')}
        onExplore={exploreNext}
        onStars={() => setOverlay('stars')}
        onConstellation={() => setOverlay('constellation')}
        onLetter={() => setOverlay('letter')}
        isAdmin={isAdmin}
        onAddMemory={() => setOverlay(isAdmin ? 'studio-add' : 'admin')}
        onGallery={() => setOverlay('studio-gallery')}
        finaleUnlocked={finaleUnlocked}
        onFinale={() => {
          setOverlay('finale');
          playChime(sound, 1040);
        }}
      />

      <Joystick movement={movement} />
      <div className="desktop-hint">
        اتحرك بـ WASD أو الأسهم · النجوم الذهبية والوردية بتتجمع لما تقرب منها
      </div>

      <AnimatePresence>
        {overlay === 'memory' && selectedMemory && (
          <MemoryModal
            memory={selectedMemory}
            alreadyCollected={collected.has(selectedMemory.id)}
            onKeep={keepMemory}
            onClose={() => setOverlay(null)}
          />
        )}

        {overlay === 'shared-memory' && selectedSharedMemory && (
          <SharedMemoryModal
            memory={selectedSharedMemory}
            alreadyCollected={sharedCollected.has(selectedSharedMemory.id)}
            onKeep={keepSharedMemory}
            onClose={() => setOverlay(null)}
          />
        )}

        {(overlay === 'studio-add' || overlay === 'studio-gallery') && (
          <MemoryStudio
            memories={sharedMemories}
            mode={overlay === 'studio-add' ? 'add' : 'gallery'}
            loading={memoryLoading}
            error={memoryError}
            isAdmin={isAdmin}
            onSave={saveSharedMemory}
            onDelete={removeSharedMemory}
            onReload={() => void loadMemories()}
            onClose={() => setOverlay(null)}
          />
        )}

        {overlay === 'admin' && (
          <AdminModal onLogin={enterAdmin} onClose={() => setOverlay(null)} />
        )}
        {overlay === 'stars' && <CatchStars onClose={() => setOverlay(null)} />}
        {overlay === 'constellation' && (
          <Constellation onClose={() => setOverlay(null)} />
        )}
        {overlay === 'letter' && <Letter onClose={() => setOverlay(null)} />}
        {overlay === 'menu' && (
          <PauseMenu
            sound={sound}
            isAdmin={isAdmin}
            onSound={() => setSound(value => !value)}
            onClose={() => setOverlay(null)}
            onRestart={restart}
            onGallery={() => setOverlay('studio-gallery')}
            onAddMemory={() => setOverlay(isAdmin ? 'studio-add' : 'admin')}
            onAdmin={() => setOverlay('admin')}
            onAdminLogout={leaveAdmin}
          />
        )}
        {overlay === 'finale' && <Finale onClose={() => setOverlay(null)} />}
      </AnimatePresence>
    </main>
  );
}