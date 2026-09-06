/**
 * Procedural Web Audio Sound Generator for Prime Split Shooter
 * Zero external audio files required!
 */

class SoundFX {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmGain = null;
        this.sfxGain = null;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.bgmPlaying = false;
        this.nextNoteTime = 0;
        this.baseBgmVolume = 0.7; // Balanced so elimination SFX cuts through clearly
        this.initialized = false;
        this.bgmAudio = null;
        this.useProceduralBGM = false;
    }

    init() {
        // Initialize HTML5 Audio for custom BGM file (bgm/bgm2.mp3)
        if (!this.bgmAudio && typeof Audio !== 'undefined') {
            try {
                this.bgmAudio = new Audio('bgm/bgm2.mp3');
                this.bgmAudio.loop = true;
                this.bgmAudio.volume = this.muted ? 0 : this.baseBgmVolume;
                this.bgmAudio.addEventListener('error', (err) => {
                    console.warn('bgm2.mp3 playback error, falling back to procedural synth BGM:', err);
                    this.useProceduralBGM = true;
                    if (this.bgmPlaying) {
                        this.startProceduralBGM();
                    }
                });
            } catch (e) {
                console.warn('Could not initialize Audio for bgm2.mp3:', e);
                this.useProceduralBGM = true;
            }
        }

        if (this.initialized) {
            this.resume();
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.85; // Master SFX volume boosted from 0.4 to 0.85
            this.sfxGain.connect(this.ctx.destination);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = this.muted ? 0 : 0.12;
            this.bgmGain.connect(this.ctx.destination);

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.init();
        this.resume();
        this.muted = !this.muted;

        if (this.bgmAudio) {
            this.bgmAudio.volume = this.muted ? 0 : this.baseBgmVolume;
        }

        const now = this.ctx ? this.ctx.currentTime : 0;
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.cancelScheduledValues(now);
            this.sfxGain.gain.setValueAtTime(this.muted ? 0 : 0.85, now);
        }
        if (this.bgmGain && this.ctx) {
            this.bgmGain.gain.cancelScheduledValues(now);
            this.bgmGain.gain.setValueAtTime(this.muted ? 0 : 0.12, now);
        }

        if (!this.muted && this.bgmPlaying) {
            if (this.bgmAudio && !this.useProceduralBGM && this.bgmAudio.paused) {
                this.bgmAudio.play().catch(() => { });
            }
        }
        return this.muted;
    }

    setBGMVolume(vol) {
        this.baseBgmVolume = Math.max(0, Math.min(1, vol));
        if (this.bgmAudio && !this.muted) {
            this.bgmAudio.volume = this.baseBgmVolume;
        }
        if (this.bgmGain && this.ctx && !this.muted) {
            this.bgmGain.gain.setValueAtTime(this.baseBgmVolume * 0.35, this.ctx.currentTime);
        }
    }

    // Shoot Prime Bullet Laser
    playShoot(primeValue = 2) {
        if (!this.initialized || this.muted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Frequency scales with prime value
        const baseFreq = 220 + primeValue * 45;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.13);
    }

    // Fission split sound (juicy factor division pop)
    playFission(depth = 1) {
        if (!this.initialized || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const startFreq = 420 + depth * 85;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 2.2, now + 0.1);

        // Boosted gain for clear, impactful division punch
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.16);

        // Sub-harmonic snap for punchy tactile feedback
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(startFreq * 0.5, now);
        sub.frequency.exponentialRampToValueAtTime(startFreq * 1.1, now + 0.08);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.1);
    }

    // Shatter into coins/crystals when bubble reaches 1 / cleared
    playPop() {
        if (!this.initialized || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;

        // 1. Loud punchy bubble pop transient (sharp downward pitch slide)
        const popOsc = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(950, now);
        popOsc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
        popGain.gain.setValueAtTime(0.8, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        popOsc.connect(popGain);
        popGain.connect(this.sfxGain);
        popOsc.start(now);
        popOsc.stop(now + 0.1);

        // 2. High pleasant arpeggio crystal chime (C5, E5, G5, C6) - Louder & sparkling
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            const startTime = now + idx * 0.032;
            gain.gain.setValueAtTime(0.5, startTime); // boosted from 0.25
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.24);
        });
    }

    // Non-divisible bounce (boing/deflect)
    playBounce() {
        if (!this.initialized || this.muted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.32, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.16);
    }

    // Resonance lightning chain
    playResonance() {
        if (!this.initialized || this.muted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(320, this.ctx.currentTime + 0.26);

        gain.gain.setValueAtTime(0.65, this.ctx.currentTime); // boosted from 0.3
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.3);

        // Add high filter crackle
        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.32);
    }

    // Bomb detonation
    playBomb() {
        if (!this.initialized || this.muted) return;
        this.resume();

        // Noise buffer explosion
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.45);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.52);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start();
    }

    // Slow motion warp
    playSlowMo() {
        if (!this.initialized || this.muted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.6);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.65);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.7);
    }

    // Sieve wave sweeping sound
    playSieveWave() {
        if (!this.initialized || this.muted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.45);
    }

    // Switch Ammo click
    playSwitch() {
        if (!this.initialized || this.muted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(950, this.ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.045);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    // Start Background Music (bgm/bgm2.mp3 with procedural fallback)
    startBGM() {
        this.init();
        this.resume();
        this.bgmPlaying = true;

        if (this.bgmAudio && !this.useProceduralBGM) {
            this.bgmAudio.volume = this.muted ? 0 : this.baseBgmVolume;
            const playPromise = this.bgmAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('bgm2.mp3 play was prevented or failed, falling back to procedural BGM:', err);
                    this.useProceduralBGM = true;
                    this.startProceduralBGM();
                });
            }
        } else {
            this.startProceduralBGM();
        }
    }

    startAmbientMusic() {
        this.startBGM();
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmAudio) {
            this.bgmAudio.pause();
        }
        this.stopProceduralBGM();
    }

    // Procedural Cyberpunk Synth BGM Sequencer (Fallback Engine)
    startProceduralBGM() {
        if (!this.initialized || this.bgmTimer) return;

        this.bgmStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;

        // 124 BPM -> 16th note step = ~0.121s
        const stepTime = 60 / 124 / 4;

        // Bassline Notes (MIDI or Hz):
        // 4 bars of 16 steps = 64 steps
        const bassNotes = [
            // Bar 1 (Am)
            55, 0, 55, 110, 55, 0, 65.4, 82.4, 55, 0, 55, 110, 65.4, 82.4, 55, 0,
            // Bar 2 (F)
            43.65, 0, 43.65, 87.3, 43.65, 0, 55, 65.4, 43.65, 0, 43.65, 87.3, 55, 65.4, 43.65, 0,
            // Bar 3 (C)
            65.4, 0, 65.4, 130.8, 65.4, 0, 49, 82.4, 65.4, 0, 65.4, 130.8, 49, 82.4, 65.4, 0,
            // Bar 4 (G)
            49, 0, 49, 98, 49, 0, 61.7, 73.4, 49, 0, 49, 98, 61.7, 73.4, 49, 0
        ];

        // Atmospheric chord frequencies for each bar
        const chordPads = [
            [220, 261.63, 329.63], // Am (A3, C4, E4)
            [174.61, 220, 261.63], // F (F3, A3, C4)
            [130.81, 164.81, 196], // C (C3, E3, G3)
            [146.83, 196, 246.94]  // G (D3, G3, B3)
        ];

        const scheduleNote = (time, step) => {
            if (!this.bgmPlaying || !this.ctx) return;

            const bassFreq = bassNotes[step % bassNotes.length];
            if (bassFreq > 0) {
                // Synth Bass Pluck
                const osc = this.ctx.createOscillator();
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();

                osc.type = (step % 4 === 0) ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(bassFreq, time);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(700, time);
                filter.frequency.exponentialRampToValueAtTime(160, time + 0.11);

                gain.gain.setValueAtTime(0.35, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.115);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.bgmGain);

                osc.start(time);
                osc.stop(time + 0.12);
            }

            // Every 16 steps (bar start): trigger warm ambient chord pad
            if (step % 16 === 0) {
                const barIdx = Math.floor((step % 64) / 16);
                const chord = chordPads[barIdx];
                const barDuration = stepTime * 16;

                chord.forEach(freq => {
                    const padOsc = this.ctx.createOscillator();
                    const padFilter = this.ctx.createBiquadFilter();
                    const padGain = this.ctx.createGain();

                    padOsc.type = 'sine';
                    padOsc.frequency.setValueAtTime(freq, time);

                    padFilter.type = 'lowpass';
                    padFilter.frequency.setValueAtTime(420, time);

                    // Smooth slow swell
                    padGain.gain.setValueAtTime(0.001, time);
                    padGain.gain.linearRampToValueAtTime(0.045, time + 0.4);
                    padGain.gain.setValueAtTime(0.045, time + barDuration - 0.3);
                    padGain.gain.linearRampToValueAtTime(0.001, time + barDuration);

                    padOsc.connect(padFilter);
                    padFilter.connect(padGain);
                    padGain.connect(this.bgmGain);

                    padOsc.start(time);
                    padOsc.stop(time + barDuration);
                });
            }

            // Subtle cyber click tick on off-beats
            if (step % 4 === 2) {
                const tickOsc = this.ctx.createOscillator();
                const tickGain = this.ctx.createGain();
                tickOsc.type = 'sine';
                tickOsc.frequency.setValueAtTime(1800, time);
                tickGain.gain.setValueAtTime(0.02, time);
                tickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
                tickOsc.connect(tickGain);
                tickGain.connect(this.bgmGain);
                tickOsc.start(time);
                tickOsc.stop(time + 0.025);
            }
        };

        const lookaheadMs = 25;
        const scheduleAheadTime = 0.12;

        const scheduler = () => {
            if (!this.bgmPlaying || !this.ctx) return;
            while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
                scheduleNote(this.nextNoteTime, this.bgmStep);
                this.nextNoteTime += stepTime;
                this.bgmStep++;
            }
        };

        this.bgmTimer = setInterval(scheduler, lookaheadMs);
    }

    stopProceduralBGM() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

export const audio = new SoundFX();
