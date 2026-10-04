import { AnimatePresence, motion } from 'framer-motion';
import { Headphones, Images, LockKeyhole, LogOut, Menu, Moon, Plus, RotateCcw, Sparkles, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Memory } from '../config/loveStory';
import { loveStory } from '../config/loveStory';
import type { SharedMemory } from './memoryStore';
import { compressMemoryImage } from './memoryStore';
import type { Movement } from './WorldScene';

export function Intro({ onEnter }: { onEnter: () => void }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setLine(value => Math.min(value + 1, loveStory.intro.lines.length - 1)), 1350);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.main className="intro-screen" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="intro-stars" aria-hidden="true" />
      <motion.div className="intro-star" animate={{ scale: [0.8, 1.35, 1], opacity: [0.5, 1, 0.85] }} transition={{ duration: 3, repeat: Infinity }} />
      <div className="intro-copy">
        <AnimatePresence mode="wait">
          <motion.p key={line} className="eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {loveStory.intro.lines[line]}
          </motion.p>
        </AnimatePresence>
        <h1>{loveStory.intro.title}</h1>
        <h2>{loveStory.intro.subtitle}</h2>
        <p className="soft">{loveStory.intro.note}</p>
        <div className="sound-tip"><Headphones size={16} /> لأحسن تجربة، شغّلي الصوت 🎧</div>
        <button className="primary-button" onClick={onEnter}><Sparkles size={18} /> ادخلي عالمنا</button>
      </div>
    </motion.main>
  );
}

export function Joystick({ movement }: { movement: React.MutableRefObject<Movement> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (event: PointerEvent<HTMLDivElement>) => {
    const rect = base.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const max = 34;
    const length = Math.max(1, Math.hypot(x, y));
    const scale = Math.min(1, max / length);
    const nx = x * scale;
    const ny = y * scale;
    setKnob({ x: nx, y: ny });
    movement.current = { x: nx / max, z: ny / max };
  };

  const reset = () => {
    setKnob({ x: 0, y: 0 });
    movement.current = { x: 0, z: 0 };
  };

  return (
    <div
      ref={base}
      className="joystick"
      role="group"
      aria-label="عصا الحركة"
      onPointerDown={event => {
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) update(event);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

export function Hud({
  count,
  sharedCount,
  sharedTotal,
  sound,
  onSound,
  onMenu,
  onExplore,
  onStars,
  onConstellation,
  onLetter,
  isAdmin,
  onAddMemory,
  onGallery,
  finaleUnlocked,
  onFinale,
}: {
  count: number;
  sharedCount: number;
  sharedTotal: number;
  sound: boolean;
  onSound: () => void;
  onMenu: () => void;
  onExplore: () => void;
  onStars: () => void;
  onConstellation: () => void;
  onLetter: () => void;
  isAdmin: boolean;
  onAddMemory: () => void;
  onGallery: () => void;
  finaleUnlocked: boolean;
  onFinale: () => void;
}) {
  return (
    <div className="hud" dir="rtl">
      <div className="hud-top">
        <div className="progress-pill"><Sparkles size={15} /> {count} / 7 ذكريات {sharedTotal > 0 && <span className="shared-progress">· ذكرياتنا {sharedCount}/{sharedTotal}</span>}</div>
        <div className="hud-actions">
          <button className="icon-button" aria-label={sound ? 'اقفل الصوت' : 'شغّل الصوت'} onClick={onSound}>
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button className="icon-button" aria-label="افتح القائمة" onClick={onMenu}><Menu size={19} /></button>
        </div>
      </div>

      <div className="quest-stack">
        <button className="quest-button" onClick={onExplore}>
          <Sparkles size={16} /> {count < 7 ? 'افتح الذكرى الجاية' : 'كل الذكريات اتجمعت'}
        </button>
        <div className="mini-actions">
          <button onClick={onStars}>لمّ النجوم</button>
          <button onClick={onConstellation}>كوّن كوكبتنا</button>
          <button onClick={onLetter}>رسالة القمر</button>
          <button onClick={onGallery}><Images size={14} /> ذكرياتنا</button>
          {isAdmin && <button className="add-memory-chip" onClick={onAddMemory}><Plus size={14} /> أضف ذكرى</button>}
        </div>
        {finaleUnlocked && <button className="finale-button" onClick={onFinale}><Moon size={17} /> امشي ورا النور</button>}
      </div>
    </div>
  );
}

export function MemoryModal({
  memory,
  alreadyCollected,
  onKeep,
  onClose,
}: {
  memory: Memory;
  alreadyCollected: boolean;
  onKeep: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div className="overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section className="memory-card glass-card" initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }}>
        <button className="close-button" aria-label="اقفل الذكرى" onClick={onClose}><X size={18} /></button>
        <div className="memory-orb-large"><Sparkles size={34} /></div>
        <span className="card-kicker">الذكرى #{memory.id} · {memory.location}</span>
        <h3>{memory.title}</h3>
        <p className="memory-message">“{memory.message}”</p>
        {memory.type === 'love' && (
          <div className="love-grid">
            {loveStory.loveReasons.map(reason => (
              <div key={reason.title}><strong>{reason.title}</strong><span>{reason.text}</span></div>
            ))}
          </div>
        )}
        <button className="primary-button full" onClick={onKeep}>
          {alreadyCollected ? 'ارجع للعالم' : 'احتفظي بالذكرى ❤️'}
        </button>
      </motion.section>
    </motion.div>
  );
}

export function SharedMemoryModal({
  memory,
  alreadyCollected,
  onKeep,
  onClose,
}: {
  memory: SharedMemory;
  alreadyCollected: boolean;
  onKeep: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div className="overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section className="memory-card glass-card" initial={{ scale: 0.94 }} animate={{ scale: 1 }}>
        <button className="close-button" aria-label="اقفل الذكرى" onClick={onClose}><X size={18} /></button>
        <div className="memory-orb-large shared-memory-orb"><Sparkles size={34} /></div>
        <span className="card-kicker">ذكرى ضفناها إحنا</span>
        <h3>{memory.title}</h3>
        {memory.date && <div className="memory-date">{memory.date}</div>}
        {memory.imageDataUrl && <img className="memory-photo" src={memory.imageDataUrl} alt={memory.title} />}
        <p className="memory-message">“{memory.message}”</p>
        <button className="primary-button full" onClick={onKeep}>
          {alreadyCollected ? 'ارجع للعالم' : 'احتفظي بالذكرى ❤️'}
        </button>
      </motion.section>
    </motion.div>
  );
}

export function MemoryStudio({
  memories,
  mode,
  loading,
  error,
  isAdmin,
  onSave,
  onDelete,
  onReload,
  onClose,
}: {
  memories: SharedMemory[];
  mode: 'add' | 'gallery';
  loading: boolean;
  error: string;
  isAdmin: boolean;
  onSave: (input: { title: string; message: string; date?: string; imageDataUrl?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReload: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'add' | 'gallery'>(isAdmin ? mode : 'gallery');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!title.trim() || !message.trim()) {
      setFormError('اكتب عنوان الذكرى وكلمتين عنها الأول.');
      return;
    }
    setSaving(true);
    try {
      const imageDataUrl = file ? await compressMemoryImage(file) : undefined;
      await onSave({ title: title.trim(), message: message.trim(), date: date || undefined, imageDataUrl });
      setTitle('');
      setMessage('');
      setDate('');
      setFile(null);
      setTab('gallery');
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'حصلت مشكلة أثناء حفظ الذكرى.');
    } finally {
      setSaving(false);
    }
  };

  const removeMemory = async (id: string) => {
    setDeleteError('');
    setDeletingId(id);
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
    } catch {
      setDeleteError('مقدرناش نمسح الذكرى دلوقتي. حاول تاني.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div className="overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="memory-studio glass-card">
        <button className="close-button" aria-label="اقفل ذكرياتنا" onClick={onClose}><X size={18} /></button>
        <span className="card-kicker">مساحتنا الخاصة</span>
        <h3>ذكرياتنا</h3>
        <div className="studio-tabs">
          <button className={tab === 'gallery' ? 'active' : ''} onClick={() => setTab('gallery')}><Images size={16} /> الذكريات</button>
          {isAdmin && <button className={tab === 'add' ? 'active' : ''} onClick={() => setTab('add')}><Plus size={16} /> أضف ذكرى</button>}
        </div>

        {tab === 'add' ? (
          <form className="memory-form" onSubmit={submit}>
            <label>عنوان الذكرى<input value={title} maxLength={80} onChange={event => setTitle(event.target.value)} placeholder="مثلاً: أول خروجة لينا" /></label>
            <label>إيه اللي فاكره منها؟<textarea value={message} maxLength={700} onChange={event => setMessage(event.target.value)} placeholder="اكتب الكلام اللي تحب يفضل معاها…" /></label>
            <label>التاريخ <span>اختياري</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
            <label className="file-field">
              صورة <span>اختياري — بتتضغط تلقائياً قبل الحفظ</span>
              <input type="file" accept="image/*" onChange={event => setFile(event.target.files?.[0] ?? null)} />
              <div className="file-choice">{file ? file.name : 'اختار صورة من الموبايل أو الكمبيوتر'}</div>
            </label>
            {formError && <div className="form-error">{formError}</div>}
            <button className="primary-button full" type="submit" disabled={saving}>{saving ? 'بنحفظ الذكرى…' : 'احفظ الذكرى في عالمنا ✨'}</button>
          </form>
        ) : (
          <div className="memory-gallery">
            {loading && <div className="gallery-state">بنجيب الذكريات…</div>}
            {!loading && error && (
              <div className="gallery-state error-state">{error}<button onClick={onReload}>حاول تاني</button></div>
            )}
            {!loading && !error && memories.length === 0 && (
              <div className="gallery-state">لسه مفيش ذكريات مضافة هنا. أول واحدة مستنياك ✨</div>
            )}
            {!loading && deleteError && <div className="form-error">{deleteError}</div>}
            {!loading && memories.map(memory => (
              <article className="gallery-card" key={memory.id}>
                {memory.imageDataUrl && <img src={memory.imageDataUrl} alt={memory.title} />}
                <div className="gallery-card-body">
                  <strong>{memory.title}</strong>
                  {memory.date && <small>{memory.date}</small>}
                  <p>{memory.message}</p>
                  {isAdmin && (confirmDeleteId === memory.id ? (
                    <div className="delete-confirm">
                      <span>تمسح الذكرى دي نهائياً من الموقع؟</span>
                      <div>
                        <button className="danger-button" disabled={deletingId === memory.id} onClick={() => void removeMemory(memory.id)}>
                          {deletingId === memory.id ? 'بنمسح…' : 'تأكيد الحذف'}
                        </button>
                        <button className="cancel-button" disabled={deletingId === memory.id} onClick={() => setConfirmDeleteId(null)}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button className="delete-memory-button" onClick={() => setConfirmDeleteId(memory.id)}>
                      <Trash2 size={14} /> حذف
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}

export function CatchStars({ onClose }: { onClose: () => void }) {
  const words = ['إنتِ', 'بتخلي', 'عالمي', 'مكان', 'أحلى', 'كل', 'يوم'];
  const [caught, setCaught] = useState<number[]>([]);
  const positions = useMemo(() => [[14, 19], [72, 16], [43, 34], [18, 51], [72, 54], [35, 72], [76, 79]], []);

  const catchStar = (index: number) => {
    setCaught(value => value.includes(index) ? value : [...value, index]);
    if ('vibrate' in navigator) navigator.vibrate?.(25);
  };

  return (
    <motion.div className="overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="minigame glass-card">
        <button className="close-button" aria-label="اقفل اللعبة" onClick={onClose}><X size={18} /></button>
        <span className="card-kicker">لعبة صغيرة · 01</span>
        <h3>لمّي النجوم</h3>
        <p>اضغطي على السبع نجوم. كل نجمة شايلة كلمة.</p>
        <div className="star-field">
          {positions.map(([left, top], i) => (
            <button
              key={i}
              aria-label={`خدي النجمة ${i + 1}`}
              className={caught.includes(i) ? 'caught-star' : 'falling-star'}
              style={{ left: `${left}%`, top: `${top}%` }}
              disabled={caught.includes(i)}
              onPointerDown={() => catchStar(i)}
            ><span>✦</span></button>
          ))}
          {caught.map(i => (
            <span className="revealed-word" style={{ left: `${positions[i][0]}%`, top: `${positions[i][1]}%` }} key={`w-${i}`}>{words[i]}</span>
          ))}
        </div>
        {caught.length === 7 ? (
          <motion.div className="game-success" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <strong>إنتِ بتخلي عالمي مكان أحلى كل يوم</strong>
            <span>♡ الكوكبة اكتملت</span>
          </motion.div>
        ) : <div className="game-progress">{caught.length} / 7 نجوم اتجمعت</div>}
      </section>
    </motion.div>
  );
}

export function Constellation({ onClose }: { onClose: () => void }) {
  const points = [[18, 34], [34, 21], [51, 38], [68, 21], [82, 35], [66, 68], [48, 57], [32, 69]];
  const [count, setCount] = useState(0);
  return (
    <motion.div className="overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="minigame glass-card">
        <button className="close-button" aria-label="اقفل اللعبة" onClick={onClose}><X size={18} /></button>
        <span className="card-kicker">لعبة صغيرة · 02</span>
        <h3>كوّني كوكبتنا</h3>
        <p>اضغطي النجوم بالترتيب. النجمة اللي دورها هتنور أكتر.</p>
        <div className="constellation-field">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            {points.slice(0, Math.max(0, count - 1)).map((point, i) => {
              const next = points[i + 1];
              return next ? <line key={i} x1={point[0]} y1={point[1]} x2={next[0]} y2={next[1]} /> : null;
            })}
          </svg>
          {points.map(([left, top], i) => (
            <button
              key={i}
              aria-label={`نجمة الكوكبة ${i + 1}`}
              className={i < count ? 'constellation-star done' : i === count ? 'constellation-star active' : 'constellation-star'}
              style={{ left: `${left}%`, top: `${top}%` }}
              onPointerDown={() => { if (i === count) setCount(value => value + 1); }}
            >✦</button>
          ))}
          {count === points.length && <motion.div className="mm-mark" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}>M + M</motion.div>}
        </div>
        {count === points.length && <div className="game-success"><strong>في ناس بتبص للنجوم.</strong><span>وأنا لقيت نجمتي.</span></div>}
      </section>
    </motion.div>
  );
}

export function Letter({ onClose }: { onClose: () => void }) {
  return (
    <motion.div className="overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="letter-card">
        <button className="close-button dark" aria-label="اقفل الرسالة" onClick={onClose}><X size={18} /></button>
        <span className="letter-seal">M + M</span>
        <h3>{loveStory.letter.title}</h3>
        {loveStory.letter.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        <div className="letter-sign">— مينا</div>
      </section>
    </motion.div>
  );
}

export function AdminModal({
  onLogin,
  onClose,
}: {
  onLogin: (pin: string) => Promise<void>;
  onClose: () => void;
}) {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin.trim()) {
      setErrorMessage('اكتب الـPIN الأول.');
      return;
    }
    setChecking(true);
    setErrorMessage('');
    try {
      await onLogin(pin.trim());
    } catch (caught) {
      setErrorMessage(
        caught instanceof Error ? caught.message : 'مقدرناش نفتح وضع الإدارة.'
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <motion.div className="overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="memory-studio glass-card">
        <button className="close-button" aria-label="اقفل وضع الإدارة" onClick={onClose}><X size={18} /></button>
        <div className="memory-orb-large shared-memory-orb"><LockKeyhole size={30} /></div>
        <span className="card-kicker">خاص بمينا</span>
        <h3>وضع الإدارة</h3>
        <p className="soft">الإضافة والحذف مقفولين للزوار. الـPIN بيتحقق منه على السيرفر ومش موجود في كود الموقع.</p>
        <form className="memory-form" onSubmit={submit}>
          <label>
            Admin PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={event => setPin(event.target.value)}
              placeholder="••••••"
            />
          </label>
          {errorMessage && <div className="form-error">{errorMessage}</div>}
          <button className="primary-button full" type="submit" disabled={checking}>
            {checking ? 'بنتأكد…' : 'افتح وضع الإدارة 🔐'}
          </button>
        </form>
      </section>
    </motion.div>
  );
}

export function PauseMenu({
  sound,
  isAdmin,
  onSound,
  onClose,
  onRestart,
  onGallery,
  onAddMemory,
  onAdmin,
  onAdminLogout,
}: {
  sound: boolean;
  isAdmin: boolean;
  onSound: () => void;
  onClose: () => void;
  onRestart: () => void;
  onGallery: () => void;
  onAddMemory: () => void;
  onAdmin: () => void;
  onAdminLogout: () => void;
}) {
  return (
    <motion.div className="overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="pause-menu glass-card">
        <button className="close-button" aria-label="اقفل القائمة" onClick={onClose}><X size={18} /></button>
        <span className="card-kicker">كوننا الصغير</span>
        <h3>وقفنا شوية تحت النجوم</h3>
        <button onClick={onClose}>كمّلي</button>
        <button onClick={onGallery}><Images size={17} /> ذكرياتنا</button>
        {isAdmin && <button onClick={onAddMemory}><Plus size={17} /> أضف ذكرى</button>}
        {isAdmin ? (
          <button onClick={onAdminLogout}><LogOut size={17} /> خروج من وضع الإدارة</button>
        ) : (
          <button onClick={onAdmin}><LockKeyhole size={17} /> وضع الإدارة</button>
        )}
        <button onClick={onSound}>{sound ? 'الصوت شغال' : 'الصوت مقفول'}</button>
        <button onClick={onRestart}><RotateCcw size={17} /> ابدأ التجربة من الأول</button>
        <div className="about-world">معمول من مينا لميرنا ❤️</div>
      </section>
    </motion.div>
  );
}

export function Finale({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  const lines = loveStory.finale.lines;
  const gift = phase > lines.length - 1;
  return (
    <motion.div className="finale-overlay" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="finale-sky" />
      {!gift ? (
        <motion.div key={phase} className="finale-copy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="constellation-title">مينا <span>+</span> ميرنا</div>
          <p>{lines[phase]}</p>
          <button className="ghost-button" onClick={() => setPhase(value => value + 1)}>كمّلي</button>
        </motion.div>
      ) : (
        <motion.div className="gift-card glass-card" initial={{ scale: 0.84, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="gift-box">✦</div>
          <span className="card-kicker">آخر حاجة…</span>
          <h3>{loveStory.finale.giftTitle}</h3>
          <p>{loveStory.finale.giftMessage}</p>
          <button className="primary-button full" onClick={() => setPhase(value => value + 1)}>
            {phase === lines.length ? 'ابعتِ لمينا حضن 🤍' : 'الحضن وصل · مينا +100 سعادة'}
          </button>
          {phase > lines.length && <button className="ghost-button" onClick={onClose}>ارجع للعالم</button>}
        </motion.div>
      )}
    </motion.div>
  );
}