// Live Room Web Audio Synthesizer & Sound Effects

class LiveAudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  private getContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Start real microphone level monitoring for active speaker glowing pulse
  async startMicrophone(onVolumeChange: (volume: number) => void): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micStream = stream;
      const ctx = this.getContext();
      if (!ctx) return stream;
      const source = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || !this.dataArray) return;
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        const avg = sum / this.dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 255) * 160));
        onVolumeChange(normalized);
        if (this.micStream) {
          requestAnimationFrame(checkVolume);
        }
      };

      checkVolume();
      return stream;
    } catch {
      return null;
    }
  }

  stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  // Play synthetic pleasant sound effects with zero latency
  playGiftSound(type: 'rose' | 'nepal' | 'luxury' | 'like' | 'seat_join' | 'kiss' | 'love' | 'hug' | 'ring' | 'night' | 'coffee' | 'greeting') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'like' || type === 'greeting') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
        return;
      }

      if (type === 'kiss') {
        // Sweet popping kiss sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        return;
      }

      if (type === 'hug' || type === 'coffee') {
        // Warm comforting acoustic bell chord
        const freqs = [329.63, 392.00, 523.25, 659.25]; // E4, G4, C5, E5
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);
          gain.gain.setValueAtTime(0.12, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.4);
        });
        return;
      }

      if (type === 'love') {
        // Romantic arpeggio (C Maj7 romantic harp)
        const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          gain.gain.setValueAtTime(0.18, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.35);
        });
        return;
      }

      if (type === 'night') {
        // Lullaby celestial music box
        const notes = [783.99, 659.25, 587.33, 523.25, 659.25];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.14, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.3);
        });
        return;
      }

      if (type === 'ring') {
        // Sparkling crystal diamond chime
        const freqs = [1046.50, 1318.51, 1567.98, 2093.00, 2637.02];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.03);
          gain.gain.setValueAtTime(0.15, now + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.03);
          osc.stop(now + idx * 0.03 + 0.5);
        });
        return;
      }

      if (type === 'seat_join') {
        // Double pleasant chime
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);
          gain.gain.setValueAtTime(0.15, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.25);
        });
        return;
      }

      if (type === 'rose') {
        // High sparkling harp
        const freqs = [700, 880, 1050, 1320];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.05);
          gain.gain.setValueAtTime(0.15, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.2);
        });
        return;
      }

      if (type === 'nepal') {
        // Nepali Folk Melody chime (Pentatonic mountain scale)
        const notes = [440, 493.88, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.2, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.35);
        });
        return;
      }

      if (type === 'luxury') {
        // Royal fanfare brass synth
        const chord = [392, 493.88, 587.33, 783.99, 987.77];
        chord.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.7);
        });
      }
    } catch {
      // ignore audio errors
    }
  }

  // Tiered Gift Audio Reaction Engine based on coin value
  // Tier 1 (< 500), Tier 2 (500-4,999), Tier 3 (5,000-49,999), Tier 4 (50,000+)
  playGiftTierSound(tier: 1 | 2 | 3 | 4, giftAnim?: string) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (tier === 1) {
        // Tier 1: Gentle pleasant sparkle chime
        const freqs = [880, 1046.5, 1318.5];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);
          gain.gain.setValueAtTime(0.12, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.22);
        });
        return;
      }

      if (tier === 2) {
        // Tier 2: Joyful celebratory brass chord with energetic chime
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.18, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.45);
        });
        return;
      }

      if (tier === 3) {
        // Tier 3: Grand Royal Fanfare + Air Horn + Applause
        // Royal Brass chord
        const brassChord = [392.00, 493.88, 587.33, 783.99, 987.77, 1174.66];
        brassChord.forEach(f => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.85);
        });

        // Air horn burst at 0.25s
        setTimeout(() => {
          this.playSoundboard('horn');
        }, 220);

        // Crowd cheer at 0.5s
        setTimeout(() => {
          this.playSoundboard('cheer');
        }, 450);
        return;
      }

      if (tier === 4) {
        // Tier 4: Supreme Emperor Symphonic Crescendo + Signature sound + Stadium cheer
        // Majestic multi-octave imperial brass fanfare
        const grandNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
        grandNotes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);
          gain.gain.setValueAtTime(0.14, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 1.2);
        });

        // Signature sound based on animation type
        if (giftAnim === 'lion') {
          // Synthesized Lion Roar (deep growl rumble with sub-bass frequency sweep)
          const roarOsc = ctx.createOscillator();
          const roarGain = ctx.createGain();
          roarOsc.type = 'sawtooth';
          roarOsc.frequency.setValueAtTime(140, now + 0.2);
          roarOsc.frequency.exponentialRampToValueAtTime(55, now + 1.1);
          roarGain.gain.setValueAtTime(0.25, now + 0.2);
          roarGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
          roarOsc.connect(roarGain);
          roarGain.connect(ctx.destination);
          roarOsc.start(now + 0.2);
          roarOsc.stop(now + 1.1);
        } else if (giftAnim === 'car') {
          // Synthesized Supercar engine acceleration + turbo spool
          const revOsc = ctx.createOscillator();
          const revGain = ctx.createGain();
          revOsc.type = 'sawtooth';
          revOsc.frequency.setValueAtTime(110, now + 0.15);
          revOsc.frequency.exponentialRampToValueAtTime(650, now + 0.95);
          revGain.gain.setValueAtTime(0.22, now + 0.15);
          revGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
          revOsc.connect(revGain);
          revGain.connect(ctx.destination);
          revOsc.start(now + 0.15);
          revOsc.stop(now + 0.95);
        } else {
          // Royal Crown / Grand Diamond: Sparkling celestial cascade
          const harpNotes = [1046.50, 1318.51, 1567.98, 2093.00, 2637.02, 3135.96];
          harpNotes.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + 0.2 + idx * 0.06);
            gain.gain.setValueAtTime(0.18, now + 0.2 + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + idx * 0.06 + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + 0.2 + idx * 0.06);
            osc.stop(now + 0.2 + idx * 0.06 + 0.6);
          });
        }

        // Secondary victory blast and stadium applause
        setTimeout(() => {
          this.playSoundboard('horn');
          this.playSoundboard('cheer');
        }, 350);
      }
    } catch {
      // ignore audio errors
    }
  }

  // Play Soundboard effect (Clap, Cheering, Horn, Nepali Madal beat)
  playSoundboard(effect: 'applause' | 'horn' | 'madal' | 'cheer' | 'laugh') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (effect === 'horn') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(466.16, now); // Bb4
        osc2.frequency.setValueAtTime(470, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
        return;
      }

      if (effect === 'madal') {
        // Nepali folk rhythm percussive beat (Dha-Ti-Na-Ka)
        const beats = [
          { time: 0.0, freq: 90, decay: 0.25 }, // Low bass Dha
          { time: 0.12, freq: 320, decay: 0.1 }, // Treble Ti
          { time: 0.24, freq: 160, decay: 0.18 }, // Mid Na
          { time: 0.36, freq: 380, decay: 0.08 }, // Sharp Ka
          { time: 0.48, freq: 95, decay: 0.3 }, // Bass Dha
        ];

        beats.forEach(b => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(b.freq, now + b.time);
          osc.frequency.exponentialRampToValueAtTime(30, now + b.time + b.decay);
          gain.gain.setValueAtTime(0.3, now + b.time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + b.time + b.decay);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + b.time);
          osc.stop(now + b.time + b.decay);
        });
        return;
      }

      // Default cheerful chime
      this.playGiftSound('nepal');
    } catch {
      // ignore
    }
  }

  // Snappy countdown tick sound for 3, 2, 1 live start
  playCountdownTick(num: number) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      // 3 -> 440Hz, 2 -> 587Hz, 1 -> 880Hz (punchy ascending chime)
      const freq = num === 1 ? 880 : num === 2 ? 587 : 440;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore audio errors
    }
  }

  // Celebratory fanfare sound when live broadcast goes ON AIR
  playLiveStartFanfare() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Vibrant ascending fanfare chord (C5 - E5 - G5 - C6)
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.18 }, // C5
        { freq: 659.25, time: 0.14, dur: 0.18 }, // E5
        { freq: 783.99, time: 0.28, dur: 0.22 }, // G5
        { freq: 1046.50, time: 0.45, dur: 0.75 }, // C6
      ];
      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.time);
        gain.gain.setValueAtTime(0.24, now + n.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });
    } catch {
      // ignore
    }
  }

  // Lucky Gift Feedback sounds (Coins back, Jackpot, Win, Loss)
  playLuckySound(type: 'coin' | 'win' | 'jackpot' | 'loss') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'coin') {
        // Quick high coin chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'win') {
        // Joyful 3-tone arpeggio (G5 - B5 - D6)
        [
          { f: 783.99, t: 0.0 },
          { f: 987.77, t: 0.08 },
          { f: 1174.66, t: 0.16 },
        ].forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, now + note.t);
          gain.gain.setValueAtTime(0.22, now + note.t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + note.t);
          osc.stop(now + note.t + 0.25);
        });
      } else if (type === 'jackpot') {
        // Grand 5-tone cascading victory celebration
        [
          { f: 523.25, t: 0.0 },
          { f: 659.25, t: 0.1 },
          { f: 783.99, t: 0.2 },
          { f: 1046.50, t: 0.3 },
          { f: 1318.51, t: 0.45 },
        ].forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, now + note.t);
          gain.gain.setValueAtTime(0.28, now + note.t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + note.t);
          osc.stop(now + note.t + 0.5);
        });
      } else {
        // Soft subtle boop for try again
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // ignore
    }
  }
}

export const liveAudio = new LiveAudioEngine();
