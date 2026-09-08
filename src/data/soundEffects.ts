export interface SoundEffect {
  id: string;
  name: string;
  artist: string;
  category: 'trending' | 'funny' | 'transition' | 'beat' | 'chill' | 'nepali';
  duration: string;
  durationSeconds: number;
  tags: string[];
  useCount: number;
  soundType: 'whoosh' | 'pop' | 'bass' | 'chime' | 'melody' | 'alarm' | 'boing' | 'beat' | 'flute';
  previewUrl?: string;
  isPopular?: boolean;
}

export const SOUND_CATEGORIES = [
  { id: 'all', label: 'All Sounds', icon: 'Sparkles' },
  { id: 'trending', label: '🔥 Trending Hits', icon: 'Flame' },
  { id: 'funny', label: '😂 Funny & Meme SFX', icon: 'Smile' },
  { id: 'transition', label: '⚡ Cinematic & Transitions', icon: 'Zap' },
  { id: 'beat', label: '🥁 Bass & Beat Drops', icon: 'Activity' },
  { id: 'chill', label: '🎧 Lo-Fi & Relaxing', icon: 'Headphones' },
  { id: 'nepali', label: '🇳🇵 Nepali & Folk Beats', icon: 'Music' },
] as const;

export const SOUND_EFFECTS_LIBRARY: SoundEffect[] = [
  {
    id: 'sfx_1',
    name: 'Phonk Midnight Drift Beat',
    artist: 'GhostWave Beats',
    category: 'trending',
    duration: '0:18',
    durationSeconds: 18,
    tags: ['drift', 'phonk', 'viral', 'bass'],
    useCount: 148200,
    soundType: 'beat',
    isPopular: true,
  },
  {
    id: 'sfx_2',
    name: 'Anime Wow Sound Effect',
    artist: 'Meme Vault SFX',
    category: 'funny',
    duration: '0:03',
    durationSeconds: 3,
    tags: ['anime', 'wow', 'meme', 'comedy'],
    useCount: 89300,
    soundType: 'chime',
    isPopular: true,
  },
  {
    id: 'sfx_3',
    name: 'Cinematic Whoosh Transition',
    artist: 'Studio FX Pro',
    category: 'transition',
    duration: '0:04',
    durationSeconds: 4,
    tags: ['whoosh', 'fast', 'transition', 'cinematic'],
    useCount: 112000,
    soundType: 'whoosh',
    isPopular: true,
  },
  {
    id: 'sfx_4',
    name: 'Nepali Sarangi & Flute Fusion Beat',
    artist: 'Himalayan Beats',
    category: 'nepali',
    duration: '0:22',
    durationSeconds: 22,
    tags: ['nepali', 'sarangi', 'flute', 'folk', 'fusion'],
    useCount: 67400,
    soundType: 'flute',
    isPopular: true,
  },
  {
    id: 'sfx_5',
    name: 'Deep 808 Sub Bass Drop',
    artist: 'Trap King FX',
    category: 'beat',
    duration: '0:06',
    durationSeconds: 6,
    tags: ['bass', '808', 'drop', 'hiphop'],
    useCount: 95400,
    soundType: 'bass',
    isPopular: true,
  },
  {
    id: 'sfx_6',
    name: 'Cartoon Boing & Spring SFX',
    artist: 'Retro Toon Lab',
    category: 'funny',
    duration: '0:03',
    durationSeconds: 3,
    tags: ['cartoon', 'boing', 'jump', 'fail'],
    useCount: 54100,
    soundType: 'boing',
  },
  {
    id: 'sfx_7',
    name: 'Lo-Fi Sunset Coffeehouse Chords',
    artist: 'ChillHop Vibes',
    category: 'chill',
    duration: '0:25',
    durationSeconds: 25,
    tags: ['lofi', 'relax', 'study', 'coffee'],
    useCount: 132000,
    soundType: 'melody',
    isPopular: true,
  },
  {
    id: 'sfx_8',
    name: 'Sad Trombone Womp Womp',
    artist: 'Comedy Soundbox',
    category: 'funny',
    duration: '0:04',
    durationSeconds: 4,
    tags: ['sad', 'trombone', 'fail', 'funny'],
    useCount: 78900,
    soundType: 'melody',
  },
  {
    id: 'sfx_9',
    name: 'Laser Zap & Sci-Fi Glitch',
    artist: 'Cyber Pulse FX',
    category: 'transition',
    duration: '0:03',
    durationSeconds: 3,
    tags: ['laser', 'glitch', 'scifi', 'speed'],
    useCount: 42300,
    soundType: 'whoosh',
  },
  {
    id: 'sfx_10',
    name: 'Kathmandu Folk Dhimay Remix',
    artist: 'Newari Grooves',
    category: 'nepali',
    duration: '0:20',
    durationSeconds: 20,
    tags: ['nepali', 'dhimay', 'festival', 'dance'],
    useCount: 38200,
    soundType: 'beat',
  },
  {
    id: 'sfx_11',
    name: 'Victory Level Up Fanfare',
    artist: 'Arcade Master',
    category: 'trending',
    duration: '0:05',
    durationSeconds: 5,
    tags: ['level up', 'win', 'game', 'fanfare'],
    useCount: 61800,
    soundType: 'chime',
  },
  {
    id: 'sfx_12',
    name: 'Camera Shutter & Flash Snap',
    artist: 'Photo Pop SFX',
    category: 'transition',
    duration: '0:02',
    durationSeconds: 2,
    tags: ['camera', 'shutter', 'photo', 'click'],
    useCount: 88400,
    soundType: 'pop',
  },
  {
    id: 'sfx_13',
    name: 'Speed Up Viral TikTok Remix',
    artist: 'Nightcore Wave',
    category: 'trending',
    duration: '0:15',
    durationSeconds: 15,
    tags: ['speedup', 'nightcore', 'remix', 'dance'],
    useCount: 204000,
    soundType: 'melody',
    isPopular: true,
  },
  {
    id: 'sfx_14',
    name: 'Airhorn MLG Hype Blast',
    artist: 'Meme Central',
    category: 'funny',
    duration: '0:04',
    durationSeconds: 4,
    tags: ['airhorn', 'mlg', 'hype', 'victory'],
    useCount: 92100,
    soundType: 'alarm',
  },
  {
    id: 'sfx_15',
    name: 'Madenali Nepali Lok Pop Melody',
    artist: 'Pahar Sounds',
    category: 'nepali',
    duration: '0:24',
    durationSeconds: 24,
    tags: ['nepali', 'madal', 'folk', 'melodious'],
    useCount: 49500,
    soundType: 'flute',
  },
  {
    id: 'sfx_16',
    name: 'Heartbeat Suspense Tension',
    artist: 'Dark Cinema Audio',
    category: 'transition',
    duration: '0:08',
    durationSeconds: 8,
    tags: ['heartbeat', 'tension', 'suspense', 'horror'],
    useCount: 34200,
    soundType: 'bass',
  },
];

// High quality Web Audio synthesizer for instant crisp sound effect playback preview
class SoundPreviewPlayer {
  private audioCtx: AudioContext | null = null;
  private activeOscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private activeTimeouts: number[] = [];
  private currentPlayingId: string | null = null;
  private onEndCallback: (() => void) | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public stop() {
    this.activeTimeouts.forEach(t => clearTimeout(t));
    this.activeTimeouts = [];
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.activeOscillators = [];
    this.currentPlayingId = null;
    if (this.onEndCallback) {
      this.onEndCallback();
      this.onEndCallback = null;
    }
  }

  public isPlaying(id: string): boolean {
    return this.currentPlayingId === id;
  }

  public playSound(sfx: SoundEffect, onEnd?: () => void) {
    this.stop();
    this.currentPlayingId = sfx.id;
    this.onEndCallback = onEnd || null;

    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      switch (sfx.soundType) {
        case 'whoosh': {
          // Cinematic noise whoosh with filter sweep
          const bufferSize = ctx.sampleRate * 1.5;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(200, now);
          filter.frequency.exponentialRampToValueAtTime(3200, now + 0.6);
          filter.frequency.exponentialRampToValueAtTime(100, now + 1.4);
          filter.Q.setValueAtTime(3.0, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.6, now + 0.6);
          gain.gain.linearRampToValueAtTime(0.001, now + 1.5);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + 1.5);
          this.activeOscillators.push(noise);

          const tid = window.setTimeout(() => {
            if (this.currentPlayingId === sfx.id) this.stop();
          }, 1600);
          this.activeTimeouts.push(tid);
          break;
        }

        case 'bass': {
          // 808 Sub-bass drop
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);

          gain.gain.setValueAtTime(0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.8);
          this.activeOscillators.push(osc);

          const tid = window.setTimeout(() => {
            if (this.currentPlayingId === sfx.id) this.stop();
          }, 1900);
          this.activeTimeouts.push(tid);
          break;
        }

        case 'boing': {
          // Cartoon spring / boing
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(160, now);
          // Modulate frequency rapidly for boing effect
          for (let i = 0; i < 8; i++) {
            const t = now + i * 0.12;
            osc.frequency.linearRampToValueAtTime(450 - i * 30, t);
            osc.frequency.linearRampToValueAtTime(180 + i * 15, t + 0.06);
          }

          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.2);
          this.activeOscillators.push(osc);

          const tid = window.setTimeout(() => {
            if (this.currentPlayingId === sfx.id) this.stop();
          }, 1300);
          this.activeTimeouts.push(tid);
          break;
        }

        case 'chime': {
          // Shiny bell / victory chime chord
          const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.setValueAtTime(0.35, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 1.2);
            this.activeOscillators.push(osc);
          });

          const tid = window.setTimeout(() => {
            if (this.currentPlayingId === sfx.id) this.stop();
          }, 1800);
          this.activeTimeouts.push(tid);
          break;
        }

        case 'pop': {
          // Camera click / bubble pop
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);

          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.12);
          this.activeOscillators.push(osc);

          const tid = window.setTimeout(() => {
            if (this.currentPlayingId === sfx.id) this.stop();
          }, 200);
          this.activeTimeouts.push(tid);
          break;
        }

        case 'alarm': {
          // Airhorn / Hype horn triple blast
          const freqs = [350, 466, 520]; // dissonance horn
          [0, 0.25, 0.55].forEach(offset => {
            freqs.forEach(freq => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(freq, now + offset);

              gain.gain.setValueAtTime(0.2, now + offset);
              gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);

              osc.connect(gain);
              gain.connect(ctx.destination);

              osc.start(now + offset);
              osc.stop(now + offset + 0.22);
              this.activeOscillators.push(osc);
            });
          });

          const tid = window.setTimeout(() => {
            if (this.currentPlayingId === sfx.id) this.stop();
          }, 1000);
          this.activeTimeouts.push(tid);
          break;
        }

        case 'flute': {
          // Nepali Flute / Folk melody sequence
          const folkMelody = [440, 493.88, 554.37, 659.25, 554.37, 493.88, 440];
          folkMelody.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.22);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.setValueAtTime(0.3, now + idx * 0.22);
            gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.22 + 0.28);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.22);
            osc.stop(now + idx * 0.22 + 0.3);
            this.activeOscillators.push(osc);
          });

          const tid = window.setTimeout(() => {
            if (this.currentPlayingId === sfx.id) this.stop();
          }, 2000);
          this.activeTimeouts.push(tid);
          break;
        }

        case 'beat':
        case 'melody':
        default: {
          // Modern groovy beat & synth melody
          const chord = [392, 440, 523.25, 587.33];
          chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.18);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.setValueAtTime(0.35, now + idx * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.18);
            osc.stop(now + idx * 0.18 + 0.55);
            this.activeOscillators.push(osc);
          });

          const tid = window.setTimeout(() => {
            if (this.currentPlayingId === sfx.id) this.stop();
          }, 1800);
          this.activeTimeouts.push(tid);
          break;
        }
      }
    } catch {
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    }
  }
}

export const soundPreviewPlayer = new SoundPreviewPlayer();
