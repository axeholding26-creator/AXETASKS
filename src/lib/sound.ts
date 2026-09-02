// Web Audio API Procedural Sound Engine for AxeTask
// Provides crisp, zero-latency acoustic notification chimes with random variations

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SoundEffectType = 
  | 'crystal_bell' 
  | 'marimba_pop' 
  | 'digital_ping' 
  | 'harmonic_success' 
  | 'harp_chime'
  | 'subtle_tap';

export interface SoundConfig {
  enabled: boolean;
  volume: number; // 0 to 1
}

const STORAGE_KEY_SOUND_ENABLED = 'axetask_sound_enabled';
const STORAGE_KEY_SOUND_VOLUME = 'axetask_sound_volume';

export function getSoundSettings(): SoundConfig {
  if (typeof window === 'undefined') return { enabled: true, volume: 0.7 };
  const savedEnabled = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
  const savedVol = localStorage.getItem(STORAGE_KEY_SOUND_VOLUME);
  return {
    enabled: savedEnabled !== null ? savedEnabled === 'true' : true,
    volume: savedVol !== null ? parseFloat(savedVol) : 0.7,
  };
}

export function setSoundSettings(settings: Partial<SoundConfig>): void {
  if (typeof window === 'undefined') return;
  if (settings.enabled !== undefined) {
    localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, String(settings.enabled));
  }
  if (settings.volume !== undefined) {
    localStorage.setItem(STORAGE_KEY_SOUND_VOLUME, String(settings.volume));
  }
}

/**
 * 1. Crystal Bell: Pure harmonic high chime with subtle shimmer
 */
function playCrystalBell(ctx: AudioContext, masterGain: GainNode) {
  const now = ctx.currentTime;
  const freqs = [1046.5, 1318.5, 2093]; // C6, E6, C7

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.04);

    gain.gain.setValueAtTime(0.001, now + idx * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.3 / (idx + 1), now + idx * 0.04 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.5);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now + idx * 0.04);
    osc.stop(now + idx * 0.04 + 0.55);
  });
}

/**
 * 2. Marimba Pop: Warm, percussive resonant pop
 */
function playMarimbaPop(ctx: AudioContext, masterGain: GainNode) {
  const now = ctx.currentTime;
  const baseFreq = 523.25; // C5

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(baseFreq * 2, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc2.start(now);
  osc.stop(now + 0.3);
  osc2.stop(now + 0.3);
}

/**
 * 3. Digital Ping: Ultra-crisp dual-tone modern notification
 */
function playDigitalPing(ctx: AudioContext, masterGain: GainNode) {
  const now = ctx.currentTime;

  [1396.91, 1760.0].forEach((freq, i) => { // F6, A6
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.06);

    gain.gain.setValueAtTime(0.001, now + i * 0.06);
    gain.gain.linearRampToValueAtTime(0.28, now + i * 0.06 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.35);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.4);
  });
}

/**
 * 4. Harmonic Success: Elegant 3-note celebratory chord
 */
function playHarmonicSuccess(ctx: AudioContext, masterGain: GainNode) {
  const now = ctx.currentTime;
  const notes = [659.25, 830.61, 987.77]; // E5, G#5, B5

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.05);

    gain.gain.setValueAtTime(0.001, now + idx * 0.05);
    gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.6);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now + idx * 0.05);
    osc.stop(now + idx * 0.05 + 0.65);
  });
}

/**
 * 5. Harp Chime: Plucked acoustic arpeggio
 */
function playHarpChime(ctx: AudioContext, masterGain: GainNode) {
  const now = ctx.currentTime;
  const notes = [587.33, 880, 1174.66]; // D5, A5, D6

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.045);

    gain.gain.setValueAtTime(0.001, now + idx * 0.045);
    gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.045 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.45);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now + idx * 0.045);
    osc.stop(now + idx * 0.045 + 0.5);
  });
}

/**
 * 6. Subtle Tap: Crisp, minimal feedback tap
 */
function playSubtleTap(ctx: AudioContext, masterGain: GainNode) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.06);
}

const ALL_EFFECTS: SoundEffectType[] = [
  'crystal_bell',
  'marimba_pop',
  'digital_ping',
  'harmonic_success',
  'harp_chime'
];

/**
 * Main function: Plays a notification sound by type or randomly selects one
 */
export function playNotificationSound(specificType?: SoundEffectType): string {
  const { enabled, volume } = getSoundSettings();
  if (!enabled || volume <= 0) return 'disabled';

  const ctx = getAudioContext();
  if (!ctx) return 'unsupported';

  // Random sound selection if none specified
  const type = specificType || ALL_EFFECTS[Math.floor(Math.random() * ALL_EFFECTS.length)];

  try {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.8, ctx.currentTime);
    masterGain.connect(ctx.destination);

    switch (type) {
      case 'crystal_bell':
        playCrystalBell(ctx, masterGain);
        break;
      case 'marimba_pop':
        playMarimbaPop(ctx, masterGain);
        break;
      case 'digital_ping':
        playDigitalPing(ctx, masterGain);
        break;
      case 'harmonic_success':
        playHarmonicSuccess(ctx, masterGain);
        break;
      case 'harp_chime':
        playHarpChime(ctx, masterGain);
        break;
      case 'subtle_tap':
        playSubtleTap(ctx, masterGain);
        break;
    }

    return type;
  } catch (err) {
    console.warn('[AxeTask Sound Engine] Play error:', err);
    return 'error';
  }
}

/**
 * Plays a random sound on general notifications or events
 */
export function playRandomNotificationSound(): string {
  return playNotificationSound();
}
