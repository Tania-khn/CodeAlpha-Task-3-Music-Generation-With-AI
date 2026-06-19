'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Play, Square, Volume2, Settings, Brain, Database,
  ChevronRight, Sparkles, Piano, Disc3, Loader2, Download,
  Mic, RefreshCw, CheckCircle2, AlertCircle, Waves, Guitar,
  Music2, Drum, Zap, Activity, FileMusic, Trash2, Pause,
  SkipForward, SkipBack, Repeat, VolumeX, X, Info, FolderOpen,
  Headphones, Radio, Volume1, ArrowRight, Sun, Moon, History,
  Library, Sliders, Home, Clock, BookOpen, Cog, Palette
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

// ============ Types ============
interface NoteData {
  pitch: number;
  duration: number;
  velocity: number;
  time: number;
}

interface GenerationResult {
  genre: string;
  notes: NoteData[];
  total_notes: number;
  tempo: number;
  key: string;
  instrument: string;
  temperature: number;
  midi_file: string;
  model_type: string;
  error?: string;
  statistics?: {
    pitch_range: string;
    duration_distribution: Record<string, number>;
    total_duration_beats: number;
  };
}

interface GenreInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// ============ Modal Component ============
function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-lg rounded-2xl shadow-2xl shadow-black/50 overflow-hidden border"
            style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--ms-border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ms-text)' }}>{title}</h3>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--ms-input-bg)', color: 'var(--ms-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============ Constants ============
const GENRE_ICONS: Record<string, React.ReactNode> = {
  classical: <Music2 className="w-6 h-6" />,
  jazz: <Waves className="w-6 h-6" />,
  blues: <Guitar className="w-6 h-6" />,
  pop: <Mic className="w-6 h-6" />,
  electronic: <Disc3 className="w-6 h-6" />,
};

const GENRE_COLORS: Record<string, string> = {
  classical: 'from-amber-500 to-orange-600',
  jazz: 'from-purple-500 to-fuchsia-600',
  blues: 'from-sky-500 to-cyan-600',
  pop: 'from-rose-500 to-pink-600',
  electronic: 'from-emerald-500 to-teal-600',
};

const GENRE_BG_COLORS: Record<string, string> = {
  classical: 'bg-amber-500/10 border-amber-500/30',
  jazz: 'bg-purple-500/10 border-purple-500/30',
  blues: 'bg-sky-500/10 border-sky-500/30',
  pop: 'bg-rose-500/10 border-rose-500/30',
  electronic: 'bg-emerald-500/10 border-emerald-500/30',
};

const KEY_OPTIONS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const INSTRUMENT_OPTIONS = [
  { value: 'piano', label: 'Piano', icon: <Piano className="w-4 h-4" /> },
  { value: 'guitar', label: 'Guitar', icon: <Guitar className="w-4 h-4" /> },
  { value: 'violin', label: 'Violin', icon: <Music2 className="w-4 h-4" /> },
  { value: 'saxophone', label: 'Saxophone', icon: <Music className="w-4 h-4" /> },
  { value: 'synth', label: 'Synthesizer', icon: <Disc3 className="w-4 h-4" /> },
];

// ============ Navigation Items ============
const NAV_ITEMS = [
  { id: 'studio', label: 'Studio', icon: Home },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Cog },
] as const;

type PageId = 'studio' | 'history' | 'library' | 'settings';

// ============ Piano Roll Canvas Component ============
function PianoRoll({ notes, isPlaying, currentBeat }: { notes: NoteData[]; isPlaying: boolean; currentBeat: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const isDark = document.documentElement.classList.contains('dark');

    ctx.fillStyle = isDark ? '#0f0f14' : '#f0f0f6';
    ctx.fillRect(0, 0, width, height);

    if (notes.length === 0) {
      ctx.fillStyle = isDark ? '#555' : '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generate music to see the piano roll', width / 2, height / 2);
      return;
    }

    const pitches = notes.map(n => n.pitch);
    const minPitch = Math.min(...pitches) - 2;
    const maxPitch = Math.max(...pitches) + 2;
    const pitchRange = maxPitch - minPitch;
    const totalTime = Math.max(...notes.map(n => n.time + n.duration));
    const rowHeight = Math.max(3, Math.min(12, height / pitchRange));
    const pixelsPerBeat = Math.max(8, width / totalTime);

    ctx.strokeStyle = isDark ? '#1a1a24' : '#e0e0ea';
    ctx.lineWidth = 0.5;
    for (let p = minPitch; p <= maxPitch; p++) {
      const y = height - (p - minPitch) * rowHeight;
      if (p % 12 === 0) {
        ctx.strokeStyle = isDark ? '#2a2a3a' : '#c8c8d8';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = isDark ? '#1a1a24' : '#e0e0ea';
        ctx.lineWidth = 0.5;
      }
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    notes.forEach((note) => {
      const x = note.time * pixelsPerBeat;
      const w = Math.max(2, note.duration * pixelsPerBeat - 1);
      const y = height - (note.pitch - minPitch) * rowHeight - rowHeight;
      const hue = ((note.pitch % 12) / 12) * 360;
      const saturation = 70;
      const lightness = isPlaying && Math.abs(note.time - currentBeat) < 0.5 ? 70 : 50;
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.beginPath();
      ctx.roundRect(x, y, w, rowHeight - 1, 1);
      ctx.fill();
      if (isPlaying && Math.abs(note.time - currentBeat) < 0.5) {
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.beginPath();
        ctx.roundRect(x, y, w, rowHeight - 1, 1);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    if (isPlaying) {
      const cursorX = currentBeat * pixelsPerBeat;
      ctx.strokeStyle = '#ffffff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
    }
  }, [notes, isPlaying, currentBeat]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// ============ Waveform Visualizer ============
function WaveformVisualizer({ isPlaying, audioContextRef, analyserRef }: {
  isPlaying: boolean;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;
      const isDark = document.documentElement.classList.contains('dark');

      ctx.fillStyle = isDark ? '#0f0f14' : '#f0f0f6';
      ctx.fillRect(0, 0, width, height);

      if (isPlaying && analyserRef.current) {
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#8b5cf6';
        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * height / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        const freqData = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(freqData);
        const barWidth = width / 64;
        for (let i = 0; i < 64; i++) {
          const barHeight = (freqData[i * Math.floor(bufferLength / 64)] / 255) * height * 0.4;
          const hue = (i / 64) * 280 + 180;
          ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.3)`;
          ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
        }
      } else {
        ctx.strokeStyle = isDark ? '#333' : '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.02 + Date.now() * 0.001) * 5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, analyserRef, audioContextRef]);

  return <canvas ref={canvasRef} className="w-full h-full rounded-lg" />;
}

// ============ Landing Page Component ============
function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [hoverEnter, setHoverEnter] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [floatingNotes, setFloatingNotes] = useState<Array<{
    id: number; x: number; size: number; delay: number; duration: number;
    symbol: string; offsetX: number[]; offsetY: number[];
  }>>([]);

  useEffect(() => {
    const symbols = ['\u2669', '\u266A', '\u266B', '\u266C', '\uD834\uDD1E', '\uD834\uDD22'];
    setFloatingNotes(Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 12 + Math.random() * 24,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 12,
      symbol: symbols[Math.floor(Math.random() * 6)],
      offsetX: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
      offsetY: [0, Math.random() * 30 - 15, Math.random() * 50 - 25],
    })));
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'var(--ms-landing-bg)' }}>
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -80, 50, 0], y: [0, 60, -80, 0], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -40, 80, 0], scale: [1.1, 0.9, 1.3, 1.1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[100px]"
        />
      </div>

      {/* Floating music notes */}
      <div className="absolute inset-0 pointer-events-none">
        {mounted && floatingNotes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: [0, 0.15, 0.15, 0], y: [100, -20, -100], x: note.offsetX, rotate: [0, 180, 360] }}
            transition={{ duration: note.duration, delay: note.delay, repeat: Infinity, ease: 'easeOut' }}
            className="absolute select-none"
            style={{ left: `${note.x}%`, bottom: 0, fontSize: `${note.size}px`, color: 'var(--ms-text-muted)', opacity: 0.15 }}
          >
            {note.symbol}
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 1.2, bounce: 0.4 }}
          className="relative mb-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 w-36 h-36 rounded-full border-2 border-dashed border-violet-500/30"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 w-32 h-32 rounded-full border border-fuchsia-500/20"
          />
          <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-violet-500/40">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              <Headphones className="w-16 h-16 text-white" />
            </motion.div>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} className="absolute inset-0">
              <Music className="w-5 h-5 text-white/80 absolute -top-2 left-1/2 -translate-x-1/2" />
            </motion.div>
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} className="absolute inset-0">
              <Music2 className="w-4 h-4 text-white/60 absolute top-1/2 -right-2 -translate-y-1/2" />
            </motion.div>
          </div>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 w-36 h-36 rounded-full bg-violet-500/20 blur-xl"
          />
        </motion.div>

        {/* Name */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-3">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Music Studio
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}
          className="text-lg md:text-xl mb-4 max-w-lg"
          style={{ color: 'var(--ms-text-muted)' }}
        >
          AI-Powered Music Generation with LSTM Deep Learning
        </motion.p>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {[
            { icon: <Brain className="w-4 h-4" />, label: 'LSTM Neural Network', color: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/30' },
            { icon: <Music className="w-4 h-4" />, label: '5 Genres', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30' },
            { icon: <Waves className="w-4 h-4" />, label: 'Web Audio Playback', color: 'from-sky-500/20 to-cyan-500/20 border-sky-500/30' },
            { icon: <Download className="w-4 h-4" />, label: 'MIDI Export', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30' },
          ].map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + idx * 0.1, duration: 0.5 }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${feat.color} border text-xs`}
              style={{ color: 'var(--ms-text-secondary)' }}
            >
              {feat.icon}
              {feat.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Enter Button */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.8 }}>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(139, 92, 246, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setHoverEnter(true)}
            onMouseLeave={() => setHoverEnter(false)}
            onClick={onEnter}
            className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-bold text-lg shadow-2xl shadow-violet-500/30 cursor-pointer overflow-hidden transition-all"
          >
            <motion.div
              animate={{ x: hoverEnter ? '200%' : '-200%' }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
            <span className="relative flex items-center gap-3">
              Enter Studio
              <motion.div animate={{ x: hoverEnter ? 5 : 0 }} transition={{ duration: 0.2 }}>
                <ArrowRight className="w-5 h-5" />
              </motion.div>
            </span>
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1 }}
          className="mt-12 text-xs"
          style={{ color: 'var(--ms-text-muted)' }}
        >
          Built with LSTM Deep Learning &bull; Powered by PyTorch &bull; Created by Tanoo
        </motion.p>
      </div>
    </div>
  );
}

// ============ Main Page Component ============
export default function MusicGenerationPage() {
  const { toast } = useToast();

  // Landing page state
  const [showLanding, setShowLanding] = useState(true);

  // Navigation
  const [currentPage, setCurrentPage] = useState<PageId>('studio');

  // Theme
  const [isDark, setIsDark] = useState(true);

  // State
  const [selectedGenre, setSelectedGenre] = useState<string>('classical');
  const [genres, setGenres] = useState<GenreInfo[]>([]);
  const [tempo, setTempo] = useState(120);
  const [noteLength, setNoteLength] = useState(64);
  const [temperature, setTemperature] = useState(1.0);
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedInstrument, setSelectedInstrument] = useState('piano');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [generatedMusic, setGeneratedMusic] = useState<GenerationResult | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationResult[]>([]);

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainedModels, setTrainedModels] = useState<string[]>([]);
  const [pipelineStep, setPipelineStep] = useState(0);

  // Modal state
  const [serviceHealth, setServiceHealth] = useState<{status: string; models_trained: string[]; genres_available: string[]} | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sample music library state
  const [sampleLibrary, setSampleLibrary] = useState<Record<string, Array<{id: string; name: string; genre: string; tempo: number; key: string; instrument: string; description: string; duration: string}>>>({});
  const [playingSample, setPlayingSample] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scheduledNotesRef = useRef<number[]>([]);
  const playbackStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const isPlayingRef = useRef(false);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchGenres();
    checkServiceHealth();
    fetchSampleLibrary();
  }, []);

  const fetchSampleLibrary = async () => {
    try {
      const res = await fetch('/api/music/samples');
      const data = await res.json();
      if (data.samples) setSampleLibrary(data.samples);
    } catch {}
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch('/api/music/genres');
      const data = await res.json();
      if (data.genres) setGenres(data.genres);
    } catch {
      setGenres([
        { id: 'classical', name: 'Classical', description: 'Baroque, Classical, and Romantic era', icon: '\uD83C\uDFBB' },
        { id: 'jazz', name: 'Jazz', description: 'Swing, bebop, and modal jazz', icon: '\uD83C\uDFB7' },
        { id: 'pop', name: 'Pop', description: 'Contemporary pop progressions', icon: '\uD83C\uDFA4' },
        { id: 'blues', name: 'Blues', description: '12-bar blues and delta blues', icon: '\uD83C\uDFB8' },
        { id: 'electronic', name: 'Electronic', description: 'Synthesizer and EDM patterns', icon: '\uD83C\uDFB9' },
      ]);
    }
  };

  const checkServiceHealth = async () => {
    try {
      const res = await fetch('/api/music/health');
      const data = await res.json();
      setServiceHealth(data);
      if (data.models_trained) setTrainedModels(data.models_trained);
    } catch {
      setServiceHealth(null);
    }
  };

  // ============ Audio Playback ============
  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentBeat(0);

    scheduledNotesRef.current.forEach(id => {
      try { window.clearTimeout(id); } catch {}
    });
    scheduledNotesRef.current = [];

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const playMusicWithNotes = useCallback((music: GenerationResult) => {
    if (!music || music.notes.length === 0) return;
    stopPlayback();

    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    analyser.connect(ctx.destination);

    const startTime = ctx.currentTime + 0.1;
    playbackStartTimeRef.current = startTime;
    isPlayingRef.current = true;
    setIsPlaying(true);

    const beatDuration = 60 / music.tempo;
    const getOscillatorType = (instrument: string): OscillatorType => {
      switch (instrument) {
        case 'guitar': return 'sawtooth';
        case 'violin': return 'sawtooth';
        case 'saxophone': return 'square';
        case 'synth': return 'sawtooth';
        default: return 'triangle';
      }
    };

    const oscType = getOscillatorType(music.instrument);
    music.notes.forEach((noteData) => {
      const noteStart = startTime + noteData.time * beatDuration;
      const noteDuration = noteData.duration * beatDuration;
      const freq = 440 * Math.pow(2, (noteData.pitch - 69) / 12);
      if (noteStart > ctx.currentTime - 0.01) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, noteStart);
        const volume = (noteData.velocity / 127) * 0.3;
        gainNode.gain.setValueAtTime(0, noteStart);
        gainNode.gain.linearRampToValueAtTime(volume, noteStart + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, noteStart + 0.05);
        gainNode.gain.setValueAtTime(volume * 0.7, noteStart + noteDuration - 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);
        osc.connect(gainNode);
        gainNode.connect(analyser);
        osc.start(noteStart);
        osc.stop(noteStart + noteDuration + 0.01);
      }
    });

    const animate = () => {
      if (!isPlayingRef.current) return;
      const elapsed = ctx.currentTime - startTime;
      const currentBeatVal = elapsed / beatDuration;
      setCurrentBeat(currentBeatVal);
      const totalDuration = Math.max(...music.notes.map(n => n.time + n.duration));
      if (currentBeatVal > totalDuration) { stopPlayback(); return; }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    const totalDuration = Math.max(...music.notes.map(n => n.time + n.duration));
    const totalTime = totalDuration * beatDuration;
    const endTimeout = window.setTimeout(() => { stopPlayback(); }, totalTime * 1000 + 500);
    scheduledNotesRef.current.push(endTimeout as unknown as number);
  }, [stopPlayback]);

  const playGeneratedMusic = useCallback(() => {
    if (!generatedMusic) return;
    playMusicWithNotes(generatedMusic);
  }, [generatedMusic, playMusicWithNotes]);

  // ============ Music Generation ============
  const generateMusic = async (useModel: boolean = false) => {
    setIsGenerating(true);
    stopPlayback();
    try {
      const endpoint = useModel ? '/api/music/generate' : '/api/music/quick-generate';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: selectedGenre, length: noteLength, tempo, key: selectedKey, instrument: selectedInstrument, temperature }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Generation Failed', description: data.error, variant: 'destructive' });
        return;
      }
      setGeneratedMusic(data);
      setGenerationHistory(prev => [data, ...prev.slice(0, 19)]);
      toast({ title: 'Music Generated!', description: `${data.total_notes} notes generated using ${data.model_type} method` });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate music. Make sure the AI service is running.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // ============ Full Pipeline ============
  const runFullPipeline = async () => {
    setIsTraining(true);
    setPipelineStep(1);
    setTrainingProgress(0);
    try {
      toast({ title: 'Step 1/3', description: `Collecting MIDI data for ${selectedGenre}...` });
      const collectRes = await fetch('/api/music/collect-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: selectedGenre, count: 50 }) });
      const collectData = await collectRes.json();
      if (collectData.error) throw new Error(collectData.error);
      setTrainingProgress(25);

      setPipelineStep(2);
      toast({ title: 'Step 2/3', description: 'Preprocessing note sequences...' });
      const preprocessRes = await fetch('/api/music/preprocess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: selectedGenre, sequenceLength: 32 }) });
      const preprocessData = await preprocessRes.json();
      if (preprocessData.error) throw new Error(preprocessData.error);
      setTrainingProgress(40);

      setPipelineStep(3);
      toast({ title: 'Step 3/3', description: 'Training LSTM model (this may take a minute)...' });
      const trainRes = await fetch('/api/music/train', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: selectedGenre, epochs: 30, sequenceLength: 32 }) });
      const trainData = await trainRes.json();
      if (trainData.error) throw new Error(trainData.error);

      let attempts = 0;
      while (attempts < 120) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const statusRes = await fetch('/api/music/train-status');
          const statusData = await statusRes.json();
          setTrainingProgress(Math.max(40, statusData.progress || 40));
          if (!statusData.training) { setTrainedModels(statusData.models || []); break; }
        } catch {}
        attempts++;
      }
      setTrainedModels(prev => prev.includes(selectedGenre) ? prev : [...prev, selectedGenre]);
      setTrainingProgress(100);
      toast({ title: 'Pipeline Complete!', description: `LSTM model trained for ${selectedGenre}. You can now generate with AI.` });
    } catch (error: any) {
      toast({ title: 'Pipeline Error', description: error.message || 'Training pipeline failed', variant: 'destructive' });
    } finally {
      setIsTraining(false);
      setPipelineStep(0);
    }
  };

  const collectDataOnly = async (genre: string) => {
    try {
      toast({ title: 'Collecting Data', description: `Collecting MIDI data for ${genre}...` });
      const res = await fetch('/api/music/collect-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre, count: 50 }) });
      const data = await res.json();
      if (data.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); }
      else { toast({ title: 'Data Collected', description: `MIDI data for ${genre} collected successfully` }); }
    } catch {
      toast({ title: 'Error', description: 'Failed to collect data', variant: 'destructive' });
    }
  };

  const downloadMidi = () => {
    if (!generatedMusic?.midi_file) return;
    const link = document.createElement('a');
    link.href = `/api/music/download?file=${encodeURIComponent(generatedMusic.midi_file)}`;
    link.download = generatedMusic.midi_file;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Downloading', description: `Downloading ${generatedMusic.midi_file}` });
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    toast({ title: 'Refreshing...', description: 'Checking service status...' });
    await checkServiceHealth();
    setIsRefreshing(false);
    toast({ title: 'Status Refreshed', description: serviceHealth ? 'Service is online and healthy' : 'Service is currently offline' });
  };

  const playSample = async (sample: { id: string; name: string; genre: string; tempo: number; key: string; instrument: string }) => {
    if (playingSample === sample.id) { stopPlayback(); setPlayingSample(null); return; }
    setLoadingSample(sample.id);
    try {
      let data: GenerationResult | null = null;
      try {
        const sampleRes = await fetch(`/api/music/sample-data?genre=${sample.genre}`);
        if (sampleRes.ok) data = await sampleRes.json();
      } catch {}
      if (!data || data.error) {
        const res = await fetch('/api/music/quick-generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genre: sample.genre, length: 64, tempo: sample.tempo, key: sample.key, instrument: sample.instrument, temperature: 1.0 }),
        });
        data = await res.json();
      }
      if (!data || data.error) { toast({ title: 'Error', description: data?.error || 'Failed to play sample', variant: 'destructive' }); return; }
      setGeneratedMusic(data);
      setGenerationHistory(prev => [data!, ...prev.slice(0, 19)]);
      setPlayingSample(sample.id);
      setTimeout(() => { playMusicWithNotes(data!); setPlayingSample(null); }, 100);
      toast({ title: `Playing: ${sample.name}`, description: `${sample.genre} - ${sample.tempo} BPM - Key: ${sample.key}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to play sample', variant: 'destructive' });
    } finally {
      setLoadingSample(null);
    }
  };

  const playHistoryItem = (item: GenerationResult) => {
    setGeneratedMusic(item);
    setTimeout(() => playMusicWithNotes(item), 100);
    toast({ title: 'Playing from History', description: `${item.genre} - ${item.total_notes} notes - ${item.tempo} BPM` });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopPlayback(); };
  }, [stopPlayback]);

  // ============ Landing Page Mode ============
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  // ============ Sidebar Navigation ============
  const Sidebar = () => (
    <div className="w-[72px] lg:w-[220px] shrink-0 h-screen sticky top-0 flex flex-col border-r py-4 px-2 lg:px-3 gap-1"
      style={{ backgroundColor: 'var(--ms-sidebar-bg)', borderColor: 'var(--ms-border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
          <Headphones className="w-5 h-5 text-white" />
        </div>
        <div className="hidden lg:block">
          <h1 className="text-sm font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Music Studio</h1>
          <p className="text-[10px]" style={{ color: 'var(--ms-text-muted)' }}>LSTM-Powered</p>
        </div>
      </div>

      {/* Nav Items */}
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <motion.button
            key={item.id}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentPage(item.id as PageId)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer w-full text-left ${
              isActive ? '' : ''
            }`}
            style={{
              backgroundColor: isActive ? 'var(--ms-sidebar-active)' : 'transparent',
              color: isActive ? 'var(--ms-text)' : 'var(--ms-text-muted)',
            }}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            {isActive && <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />}
          </motion.button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer w-full"
        style={{ color: 'var(--ms-text-muted)' }}
      >
        {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
        <span className="hidden lg:block text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      </motion.button>

      {/* Service Status */}
      <div className="flex items-center gap-3 px-3 py-2 mt-2" style={{ color: 'var(--ms-text-muted)' }}>
        <div className={`w-2 h-2 rounded-full shrink-0 ${serviceHealth ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        <span className="hidden lg:block text-[11px]">{serviceHealth ? 'Service Online' : 'Offline'}</span>
      </div>
    </div>
  );

  // ============ STUDIO PAGE ============
  const StudioPage = () => (
    <div className="space-y-6">
      {/* Pipeline Status Banner */}
      <AnimatePresence>
        {isTraining && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-violet-300">
                  {pipelineStep === 1 && 'Collecting MIDI data...'}
                  {pipelineStep === 2 && 'Preprocessing note sequences...'}
                  {pipelineStep === 3 && 'Training LSTM model...'}
                </p>
                <Progress value={trainingProgress} className="mt-2 h-1.5" />
              </div>
              <span className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>{trainingProgress}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Genre Selection */}
          <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
                <Music className="w-4 h-4" /> Select Genre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {genres.map((genre) => (
                  <motion.button
                    key={genre.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedGenre(genre.id); toast({ title: 'Genre Selected', description: `${genre.name} selected` }); }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                      selectedGenre === genre.id ? `${GENRE_BG_COLORS[genre.id]} shadow-lg` : ''
                    }`}
                    style={selectedGenre !== genre.id ? { backgroundColor: 'var(--ms-input-bg)', borderColor: 'var(--ms-border)' } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`relative w-10 h-10 rounded-lg bg-gradient-to-br ${GENRE_COLORS[genre.id]} flex items-center justify-center text-white shrink-0 ${
                        selectedGenre === genre.id ? 'ring-2 ring-white/30' : ''
                      }`}>
                        {GENRE_ICONS[genre.id]}
                        {selectedGenre === genre.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${selectedGenre === genre.id ? '' : ''}`}
                            style={{ color: selectedGenre === genre.id ? 'var(--ms-text)' : 'var(--ms-text-secondary)' }}
                          >{genre.name}</span>
                          {trainedModels.includes(genre.id) && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Trained
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--ms-text-muted)' }}>{genre.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ms-text-muted)' }} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
                <Settings className="w-4 h-4" /> Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Tempo (BPM)</label>
                  <span className="text-xs font-mono text-violet-400">{tempo}</span>
                </div>
                <Slider value={[tempo]} onValueChange={([v]) => setTempo(v)} min={40} max={200} step={1} className="cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Note Count</label>
                  <span className="text-xs font-mono text-violet-400">{noteLength}</span>
                </div>
                <Slider value={[noteLength]} onValueChange={([v]) => setNoteLength(v)} min={16} max={200} step={8} className="cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Creativity (Temperature)</label>
                  <span className="text-xs font-mono text-violet-400">{temperature.toFixed(2)}</span>
                </div>
                <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0.1} max={2.0} step={0.05} className="cursor-pointer" />
                <div className="flex justify-between text-[10px]" style={{ color: 'var(--ms-text-muted)' }}>
                  <span>Conservative</span><span>Creative</span>
                </div>
              </div>
              <Separator style={{ backgroundColor: 'var(--ms-border)' }} />
              <div className="space-y-2">
                <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Musical Key</label>
                <Select value={selectedKey} onValueChange={setSelectedKey}>
                  <SelectTrigger style={{ backgroundColor: 'var(--ms-input-bg)', borderColor: 'var(--ms-border)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KEY_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Instrument</label>
                <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                  <SelectTrigger style={{ backgroundColor: 'var(--ms-input-bg)', borderColor: 'var(--ms-border)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENT_OPTIONS.map(inst => (
                      <SelectItem key={inst.value} value={inst.value}>
                        <div className="flex items-center gap-2">{inst.icon}{inst.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button onClick={() => generateMusic(false)} disabled={isGenerating}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 h-12 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
              {isGenerating ? 'Generating...' : 'Quick Generate'}
            </Button>
            <Button
              onClick={async () => {
                if (!trainedModels.includes(selectedGenre)) {
                  toast({ title: 'Auto Training', description: `No LSTM model for ${selectedGenre}. Training now...` });
                  await runFullPipeline();
                  await generateMusic(true);
                } else { generateMusic(true); }
              }}
              disabled={isGenerating || isTraining} variant="outline"
              className="w-full border-violet-500/30 text-violet-400 hover:bg-violet-500/10 h-11 cursor-pointer"
            >
              {isTraining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              {isTraining ? 'Training...' : !trainedModels.includes(selectedGenre) ? 'Train & Generate with LSTM' : 'Generate with LSTM Model'}
            </Button>
            <Button onClick={runFullPipeline} disabled={isTraining} variant="outline"
              className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-11 cursor-pointer"
            >
              {isTraining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              {isTraining ? 'Training Pipeline...' : 'Full AI Pipeline (Collect \u2192 Train \u2192 Generate)'}
            </Button>
          </div>
        </div>

        {/* Right Panel - Visualization & Player */}
        <div className="lg:col-span-8 space-y-4">
          {/* Piano Roll */}
          <Card className="border overflow-hidden" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
                  <Piano className="w-4 h-4" /> Piano Roll
                </CardTitle>
                {generatedMusic && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'var(--ms-border)', color: 'var(--ms-text-muted)' }}>
                      {generatedMusic.model_type}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'var(--ms-border)', color: 'var(--ms-text-muted)' }}>
                      {generatedMusic.total_notes} notes
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--ms-border)' }}>
                <PianoRoll notes={generatedMusic?.notes || []} isPlaying={isPlaying} currentBeat={currentBeat} />
              </div>
            </CardContent>
          </Card>

          {/* Waveform & Player Controls */}
          <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
            <CardContent className="pt-4 space-y-4">
              <div className="h-24 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--ms-border)' }}>
                <WaveformVisualizer isPlaying={isPlaying} audioContextRef={audioContextRef} analyserRef={analyserRef} />
              </div>

              {/* Player Controls */}
              <div className="flex items-center justify-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="cursor-pointer" style={{ color: 'var(--ms-text-muted)' }}
                      onClick={() => { if (generatedMusic) setCurrentBeat(0); }}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restart</TooltipContent>
                </Tooltip>

                <Button onClick={isPlaying ? stopPlayback : playGeneratedMusic} disabled={!generatedMusic}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/30 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </Button>

                {/* STOP Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => { stopPlayback(); toast({ title: 'Stopped', description: 'Music playback stopped' }); }}
                      disabled={!generatedMusic && !isPlaying}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-red-500/20 border-2 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-400 shadow-lg shadow-red-500/20'
                          : 'border-2 text-[var(--ms-text-muted)] hover:text-red-400'
                      }`}
                      style={!isPlaying ? { backgroundColor: 'var(--ms-input-bg)', borderColor: 'var(--ms-border)' } : undefined}
                    >
                      <Square className="w-4 h-4" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent>Stop</TooltipContent>
                </Tooltip>
              </div>

              {/* Now Playing Info */}
              {generatedMusic && (
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ms-text-muted)' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" />{generatedMusic.instrument}</span>
                    <span>Key: {generatedMusic.key}</span>
                    <span>{generatedMusic.tempo} BPM</span>
                  </div>
                  <Badge className={`bg-gradient-to-r ${GENRE_COLORS[generatedMusic.genre]} text-white text-[10px]`}>
                    {generatedMusic.genre}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="cursor-pointer group" onClick={() => setShowModelModal(true)}>
              <Card className="border hover:border-violet-500/30 transition-colors h-full" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-400" />
                      <span className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Models</span>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:text-violet-400 transition-colors" style={{ color: 'var(--ms-text-muted)' }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--ms-text)' }}>{generatedMusic?.model_type || 'LSTM'}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ms-text-muted)' }}>3-layer LSTM, 256 hidden units</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="cursor-pointer group" onClick={() => setShowDatasetModal(true)}>
              <Card className="border hover:border-emerald-500/30 transition-colors h-full" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Dataset</span>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:text-emerald-400 transition-colors" style={{ color: 'var(--ms-text-muted)' }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--ms-text)' }}>{generatedMusic?.total_notes || 0} Notes</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ms-text-muted)' }}>{generatedMusic?.statistics?.pitch_range || 'No data'}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="cursor-pointer group"
              onClick={() => { if (generatedMusic?.midi_file) downloadMidi(); else setShowOutputModal(true); }}
            >
              <Card className="border hover:border-fuchsia-500/30 transition-colors h-full" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileMusic className="w-4 h-4 text-fuchsia-400" />
                      <span className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Output</span>
                    </div>
                    {generatedMusic?.midi_file ? <Download className="w-4 h-4 text-fuchsia-400" /> : <ChevronRight className="w-4 h-4 group-hover:text-fuchsia-400 transition-colors" style={{ color: 'var(--ms-text-muted)' }} />}
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--ms-text)' }}>{generatedMusic?.midi_file ? 'MIDI Ready' : 'No Output'}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--ms-text-muted)' }}>
                    {generatedMusic?.statistics?.total_duration_beats ? `${generatedMusic.statistics.total_duration_beats} beats` : 'Generate first'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Pipeline Steps */}
          <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
                <Zap className="w-4 h-4" /> How the AI Music Generation Pipeline Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: 1, title: 'Collect MIDI Data', desc: 'Gather MIDI files across genres using music21 to generate stylistically accurate training data.', icon: <Database className="w-5 h-5" />, color: 'from-emerald-500 to-teal-500', action: 'Collect Now', onClick: () => collectDataOnly(selectedGenre) },
                  { step: 2, title: 'Preprocess Sequences', desc: 'Parse MIDI into note sequences. Extract pitch, duration, velocity, and timing for LSTM training.', icon: <RefreshCw className="w-5 h-5" />, color: 'from-amber-500 to-orange-500', action: 'Preprocess Now', onClick: async () => { try { const res = await fetch('/api/music/preprocess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: selectedGenre, sequenceLength: 32 }) }); const data = await res.json(); toast({ title: data.error ? 'Error' : 'Preprocessed', description: data.error || 'Sequences preprocessed', variant: data.error ? 'destructive' : 'default' }); } catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }); } } },
                  { step: 3, title: 'Train LSTM Model', desc: 'Build a 3-layer LSTM with 256 hidden units using PyTorch. Learns musical patterns and chord progressions.', icon: <Brain className="w-5 h-5" />, color: 'from-violet-500 to-fuchsia-500', action: 'Train Now', onClick: () => runFullPipeline() },
                  { step: 4, title: 'Generate & Play', desc: 'Use trained model to generate new music. Apply temperature sampling for creativity. Play through Web Audio API.', icon: <Play className="w-5 h-5" />, color: 'from-rose-500 to-pink-500', action: 'Generate Now', onClick: () => generateMusic(trainedModels.includes(selectedGenre)) },
                ].map((item) => (
                  <div key={item.step} className="relative">
                    <div className="flex items-start gap-3">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={item.onClick}
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0 shadow-lg cursor-pointer`}
                      >
                        {item.icon}
                      </motion.button>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono" style={{ color: 'var(--ms-text-muted)' }}>STEP {item.step}</span>
                        </div>
                        <h4 className="text-sm font-medium" style={{ color: 'var(--ms-text)' }}>{item.title}</h4>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--ms-text-muted)' }}>{item.desc}</p>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={item.onClick}
                          className="mt-2 text-[10px] px-2 py-1 rounded-md transition-colors cursor-pointer"
                          style={{ backgroundColor: 'var(--ms-input-bg)', color: 'var(--ms-text-muted)' }}
                        >
                          {item.action}
                        </motion.button>
                      </div>
                    </div>
                    {item.step < 4 && <ChevronRight className="hidden md:block absolute -right-2 top-4 w-4 h-4" style={{ color: 'var(--ms-border)' }} />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // ============ HISTORY PAGE ============
  const HistoryPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--ms-text)' }}>Generation History</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--ms-text-muted)' }}>All your previously generated music tracks. Click to play.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--ms-border)', color: 'var(--ms-text-muted)' }}>
            {generationHistory.length} Track{generationHistory.length !== 1 ? 's' : ''}
          </Badge>
          {generationHistory.length > 0 && (
            <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10 cursor-pointer"
              onClick={() => { setGenerationHistory([]); toast({ title: 'History Cleared', description: 'All history removed' }); }}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {generationHistory.length === 0 ? (
        <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
          <CardContent className="py-16 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ms-text-muted)' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--ms-text)' }}>No Generation History Yet</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--ms-text-muted)' }}>Generate some music in the Studio to see it here.</p>
            <Button onClick={() => setCurrentPage('studio')} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white cursor-pointer">
              <Sparkles className="w-4 h-4 mr-2" /> Go to Studio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generationHistory.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
              onClick={() => playHistoryItem(item)}
            >
              <Card className="border h-full hover:shadow-lg transition-all" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GENRE_COLORS[item.genre]} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                      {GENRE_ICONS[item.genre]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm capitalize" style={{ color: 'var(--ms-text)' }}>{item.genre}</span>
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'var(--ms-border)', color: 'var(--ms-text-muted)' }}>
                          #{generationHistory.length - idx}
                        </Badge>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>{item.model_type} &bull; {item.total_notes} notes</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--ms-text-muted)' }}>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{item.tempo} BPM</span>
                        <span>Key: {item.key}</span>
                        <span className="capitalize">{item.instrument}</span>
                      </div>
                    </div>
                  </div>
                  {generatedMusic === item && isPlaying && (
                    <div className="mt-3 flex items-center gap-0.5">
                      {[...Array(16)].map((_, i) => (
                        <motion.div key={i}
                          animate={{ height: [4, 12 + Math.random() * 8, 4] }}
                          transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.05 }}
                          className={`w-1 rounded-full bg-gradient-to-t ${GENRE_COLORS[item.genre]}`}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ LIBRARY PAGE ============
  const LibraryPage = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ms-text)' }}>Sample Music Library</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ms-text-muted)' }}>Click any track to instantly listen. Each genre features unique AI-composed samples.</p>
      </div>

      {Object.keys(sampleLibrary).length === 0 ? (
        <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
          <CardContent className="py-16 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ms-text-muted)' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--ms-text)' }}>No Sample Library Available</h3>
            <p className="text-sm mb-2" style={{ color: 'var(--ms-text-muted)' }}>The sample library is loading or the service is offline.</p>
            <p className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>You can still generate music directly in the Studio!</p>
            <Button onClick={() => setCurrentPage('studio')} className="mt-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white cursor-pointer">
              <Sparkles className="w-4 h-4 mr-2" /> Go to Studio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
                <Radio className="w-4 h-4" /> Browse by Genre
              </CardTitle>
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'var(--ms-border)', color: 'var(--ms-text-muted)' }}>
                {Object.values(sampleLibrary).flat().length} Tracks
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="classical" className="w-full">
              <TabsList className="border w-full h-auto flex flex-wrap gap-1 p-1" style={{ backgroundColor: 'var(--ms-input-bg)', borderColor: 'var(--ms-border)' }}>
                {Object.keys(sampleLibrary).map((genre) => (
                  <TabsTrigger key={genre} value={genre}
                    className="flex-1 min-w-[80px] data-[state=active]:bg-gradient-to-r data-[state=active]:text-white text-xs capitalize py-2 cursor-pointer"
                    style={{ color: 'var(--ms-text-muted)' }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4">{GENRE_ICONS[genre]}</span>
                      {genre}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(sampleLibrary).map(([genre, tracks]) => (
                <TabsContent key={genre} value={genre} className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tracks.map((track) => (
                      <motion.div
                        key={track.id}
                        whileHover={{ scale: 1.02, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        className="cursor-pointer"
                        onClick={() => playSample(track)}
                      >
                        <div className={`relative p-5 rounded-xl border-2 transition-all duration-300 ${
                          playingSample === track.id ? `${GENRE_BG_COLORS[genre]} shadow-lg` : ''
                        }`}
                          style={playingSample !== track.id ? { backgroundColor: 'var(--ms-surface)', borderColor: 'var(--ms-border)' } : undefined}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GENRE_COLORS[genre]} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                              {playingSample === track.id ? <Volume2 className="w-6 h-6 animate-pulse" /> :
                               loadingSample === track.id ? <Loader2 className="w-6 h-6 animate-spin" /> :
                               <Play className="w-6 h-6 ml-0.5" />}
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1.5" style={{ borderColor: 'var(--ms-border)', color: 'var(--ms-text-muted)' }}>
                              {track.duration}
                            </Badge>
                          </div>
                          <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--ms-text)' }}>{track.name}</h4>
                          <p className="text-[11px] leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--ms-text-muted)' }}>{track.description}</p>
                          <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--ms-text-muted)' }}>
                            <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{track.tempo} BPM</span>
                            <span>Key: {track.key}</span>
                            <span className="capitalize">{track.instrument}</span>
                          </div>
                          {playingSample === track.id && (
                            <div className="mt-3 flex items-center gap-0.5">
                              {[...Array(14)].map((_, i) => (
                                <motion.div key={i}
                                  animate={{ height: [4, 12 + Math.random() * 10, 4] }}
                                  transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.05 }}
                                  className={`w-1 rounded-full bg-gradient-to-t ${GENRE_COLORS[genre]}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ============ SETTINGS PAGE ============
  const SettingsPage = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ms-text)' }}>Settings</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ms-text-muted)' }}>Customize your Music Studio experience.</p>
      </div>

      {/* Appearance */}
      <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
            <Palette className="w-4 h-4" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ backgroundColor: 'var(--ms-surface)', borderColor: 'var(--ms-border)' }}>
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-5 h-5 text-violet-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ms-text)' }}>Theme</p>
                <p className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>{isDark ? 'Dark mode is active' : 'Light mode is active'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center rounded-xl border p-1 transition-all cursor-pointer ${!isDark ? 'border-violet-500 bg-violet-500/10' : ''}`}
                style={isDark ? { borderColor: 'var(--ms-border)' } : undefined}
                onClick={() => { if (isDark) toggleTheme(); }}
              >
                <Sun className="w-4 h-4 mx-2" style={{ color: !isDark ? '#8b5cf6' : 'var(--ms-text-muted)' }} />
                <span className="text-xs mr-2" style={{ color: !isDark ? '#8b5cf6' : 'var(--ms-text-muted)' }}>Light</span>
              </div>
              <div className={`flex items-center rounded-xl border p-1 transition-all cursor-pointer ${isDark ? 'border-violet-500 bg-violet-500/10' : ''}`}
                style={!isDark ? { borderColor: 'var(--ms-border)' } : undefined}
                onClick={() => { if (!isDark) toggleTheme(); }}
              >
                <Moon className="w-4 h-4 mx-2" style={{ color: isDark ? '#8b5cf6' : 'var(--ms-text-muted)' }} />
                <span className="text-xs mr-2" style={{ color: isDark ? '#8b5cf6' : 'var(--ms-text-muted)' }}>Dark</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Parameters */}
      <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
            <Sliders className="w-4 h-4" /> Default Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Default Tempo (BPM)</label>
              <span className="text-xs font-mono text-violet-400">{tempo}</span>
            </div>
            <Slider value={[tempo]} onValueChange={([v]) => setTempo(v)} min={40} max={200} step={1} className="cursor-pointer" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Default Note Count</label>
              <span className="text-xs font-mono text-violet-400">{noteLength}</span>
            </div>
            <Slider value={[noteLength]} onValueChange={([v]) => setNoteLength(v)} min={16} max={200} step={8} className="cursor-pointer" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Default Creativity (Temperature)</label>
              <span className="text-xs font-mono text-violet-400">{temperature.toFixed(2)}</span>
            </div>
            <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0.1} max={2.0} step={0.05} className="cursor-pointer" />
          </div>
          <Separator style={{ backgroundColor: 'var(--ms-border)' }} />
          <div className="space-y-2">
            <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Default Musical Key</label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger style={{ backgroundColor: 'var(--ms-input-bg)', borderColor: 'var(--ms-border)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KEY_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Default Instrument</label>
            <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
              <SelectTrigger style={{ backgroundColor: 'var(--ms-input-bg)', borderColor: 'var(--ms-border)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENT_OPTIONS.map(inst => (
                  <SelectItem key={inst.value} value={inst.value}>
                    <div className="flex items-center gap-2">{inst.icon}{inst.label}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
            <Activity className="w-4 h-4" /> Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ backgroundColor: 'var(--ms-surface)', borderColor: 'var(--ms-border)' }}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${serviceHealth ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ms-text)' }}>{serviceHealth ? 'Service Online' : 'Service Offline'}</p>
                <p className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>{serviceHealth ? 'Music AI service is running on port 3002' : 'Unable to connect to Music AI service'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleRefreshStatus} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Refresh
            </Button>
          </div>

          {serviceHealth && (
            <>
              <div className="space-y-2">
                <span className="text-xs font-medium" style={{ color: 'var(--ms-text-muted)' }}>Available Genres</span>
                <div className="flex flex-wrap gap-2">
                  {(serviceHealth.genres_available || ['classical', 'jazz', 'pop', 'blues', 'electronic']).map((genre: string) => (
                    <Badge key={genre} className={`bg-gradient-to-r ${GENRE_COLORS[genre] || 'from-violet-500 to-fuchsia-500'} text-white text-xs`}>
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium" style={{ color: 'var(--ms-text-muted)' }}>Trained Models</span>
                <div className="flex flex-wrap gap-2">
                  {trainedModels.length > 0 ? trainedModels.map((model) => (
                    <Badge key={model} className="bg-emerald-500/20 text-emerald-400 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {model}
                    </Badge>
                  )) : (
                    <span className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>No models trained yet</span>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Model Architecture */}
      <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
            <Brain className="w-4 h-4" /> Model Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--ms-surface)', borderColor: 'var(--ms-border)' }}>
            <div className="flex items-center gap-2 text-violet-400">
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">LSTM Neural Network</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Layers', value: '3-layer LSTM' },
                { label: 'Hidden Units', value: '256' },
                { label: 'Framework', value: 'PyTorch' },
                { label: 'Optimizer', value: 'Adam' },
                { label: 'Sequence Length', value: '32' },
                { label: 'Output', value: 'Pitch + Duration + Velocity' },
              ].map((item) => (
                <div key={item.label} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--ms-input-bg)' }}>
                  <span style={{ color: 'var(--ms-text-muted)' }}>{item.label}</span>
                  <p className="font-medium" style={{ color: 'var(--ms-text)' }}>{item.value}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => { setCurrentPage('studio'); runFullPipeline(); }} disabled={isTraining}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white cursor-pointer mt-2"
            >
              {isTraining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Train New Model
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border" style={{ backgroundColor: 'var(--ms-card)', borderColor: 'var(--ms-border)' }}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ms-text-secondary)' }}>
            <Info className="w-4 h-4" /> About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm" style={{ color: 'var(--ms-text-muted)' }}>
            <p><strong style={{ color: 'var(--ms-text)' }}>Music Studio</strong> - AI-Powered Music Generation</p>
            <p>Built with LSTM Deep Learning &bull; Powered by PyTorch &bull; Created by Tanoo</p>
            <p className="text-xs">Uses a 3-layer LSTM neural network to generate music across 5 genres: Classical, Jazz, Blues, Pop, and Electronic. Features include Web Audio API playback, real-time waveform visualization, MIDI export, and a full training pipeline.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============ MAIN LAYOUT ============
  return (
    <TooltipProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--ms-bg)' }}>
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {/* Header Bar */}
          <header className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-3 flex items-center justify-between"
            style={{ backgroundColor: 'var(--ms-header-bg)', borderColor: 'var(--ms-border)' }}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold" style={{ color: 'var(--ms-text)' }}>
                {currentPage === 'studio' && 'Studio'}
                {currentPage === 'history' && 'History'}
                {currentPage === 'library' && 'Library'}
                {currentPage === 'settings' && 'Settings'}
              </h2>
              {isPlaying && generatedMusic && (
                <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] animate-pulse">
                  <Volume2 className="w-3 h-3 mr-1" /> Playing: {generatedMusic.genre}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Deep Learning Badge */}
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => { if (trainedModels.includes(selectedGenre)) generateMusic(true); else runFullPipeline(); }}
                className="cursor-pointer"
              >
                <Badge variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/20 transition-colors cursor-pointer">
                  <Brain className="w-3 h-3 mr-1" /> Deep Learning
                </Badge>
              </motion.button>
              {/* Theme Toggle in Header */}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleTheme}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--ms-input-bg)', color: 'var(--ms-text-muted)' }}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </motion.button>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6 max-w-7xl mx-auto">
            {currentPage === 'studio' && <StudioPage />}
            {currentPage === 'history' && <HistoryPage />}
            {currentPage === 'library' && <LibraryPage />}
            {currentPage === 'settings' && <SettingsPage />}
          </div>
        </main>

        {/* ============ Modals ============ */}
        <Modal open={showModelModal} onClose={() => setShowModelModal(false)} title="Model Architecture Details">
          <div className="space-y-4">
            <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--ms-surface)', borderColor: 'var(--ms-border)' }}>
              <div className="flex items-center gap-2 text-violet-400">
                <Brain className="w-4 h-4" /><span className="text-sm font-medium">LSTM Neural Network</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--ms-text-muted)' }}>
                {[
                  { label: 'Layers', value: '3-layer LSTM' },
                  { label: 'Hidden Units', value: '256' },
                  { label: 'Framework', value: 'PyTorch' },
                  { label: 'Optimizer', value: 'Adam' },
                ].map(item => (
                  <div key={item.label} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--ms-input-bg)' }}>
                    <span style={{ color: 'var(--ms-text-muted)' }}>{item.label}</span>
                    <p className="font-medium" style={{ color: 'var(--ms-text)' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {trainedModels.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Trained Models</span>
                <div className="flex flex-wrap gap-2">
                  {trainedModels.map((model) => (
                    <Badge key={model} className={`bg-gradient-to-r ${GENRE_COLORS[model] || 'from-violet-500 to-fuchsia-500'} text-white text-xs`}>{model}</Badge>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={() => { setShowModelModal(false); runFullPipeline(); }} disabled={isTraining}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white cursor-pointer"
            >
              {isTraining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Train New Model
            </Button>
          </div>
        </Modal>

        <Modal open={showDatasetModal} onClose={() => setShowDatasetModal(false)} title="Collect Training Data">
          <div className="space-y-4">
            <p className="text-xs" style={{ color: 'var(--ms-text-muted)' }}>Select a genre to collect MIDI training data for:</p>
            <div className="space-y-2">
              {['classical', 'jazz', 'pop', 'blues', 'electronic'].map((genre) => (
                <motion.button key={genre} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { collectDataOnly(genre); setShowDatasetModal(false); }}
                  className="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3"
                  style={{ backgroundColor: 'var(--ms-surface)', borderColor: 'var(--ms-border)' }}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${GENRE_COLORS[genre]} flex items-center justify-center text-white shrink-0`}>
                    {GENRE_ICONS[genre]}
                  </div>
                  <span className="text-sm font-medium capitalize" style={{ color: 'var(--ms-text)' }}>{genre}</span>
                  {trainedModels.includes(genre) && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0 ml-auto">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Trained
                    </Badge>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </Modal>

        <Modal open={showOutputModal} onClose={() => setShowOutputModal(false)} title="Generated Output Details">
          <div className="space-y-4">
            {generatedMusic ? (
              <>
                <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--ms-surface)', borderColor: 'var(--ms-border)' }}>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--ms-text-muted)' }}>
                    {[
                      { label: 'Tempo', value: `${generatedMusic.tempo} BPM` },
                      { label: 'Key', value: generatedMusic.key },
                      { label: 'Instrument', value: generatedMusic.instrument },
                      { label: 'Temperature', value: generatedMusic.temperature.toFixed(2) },
                      { label: 'Pitch Range', value: generatedMusic.statistics?.pitch_range || 'N/A' },
                      { label: 'Duration', value: `${generatedMusic.statistics?.total_duration_beats || 'N/A'} beats` },
                    ].map(item => (
                      <div key={item.label} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--ms-input-bg)' }}>
                        <span style={{ color: 'var(--ms-text-muted)' }}>{item.label}</span>
                        <p className="font-medium" style={{ color: 'var(--ms-text)' }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { downloadMidi(); setShowOutputModal(false); }}
                    className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white cursor-pointer"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download MIDI
                  </Button>
                  <Button onClick={() => { setShowOutputModal(false); playGeneratedMusic(); }} variant="outline"
                    className="flex-1 border-violet-500/30 text-violet-400 hover:bg-violet-500/10 cursor-pointer"
                  >
                    <Play className="w-4 h-4 mr-2" /> Play Again
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 space-y-3">
                <FileMusic className="w-10 h-10 mx-auto" style={{ color: 'var(--ms-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--ms-text-muted)' }}>No music generated yet</p>
                <Button onClick={() => { setShowOutputModal(false); generateMusic(false); }}
                  className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Music
                </Button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </TooltipProvider>
  );
}
