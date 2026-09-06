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
        this.baseBgmVolume = 0.12;
        this.initialized = false;
    }

    init() {
        if (this.initialized) {
            this.resume();
            return;
        }
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.4;
            this.sfxGain.connect(this.ctx.destination);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = this.muted ? 0 : this.baseBgmVolume;
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
        const now = this.ctx ? this.ctx.currentTime : 0;
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.cancelScheduledValues(now);
            this.sfxGain.gain.setValueAtTime(this.muted ? 0 : 0.4, now);
        }
        if (this.bgmGain && this.ctx) {
            this.bgmGain.gain.cancelScheduledValues(now);
            this.bgmGain.gain.setValueAtTime(this.muted ? 0 : this.baseBgmVolume, now);
        }
        if (!this.muted && !this.bgmPlaying) {
            this.startBGM();
        }
        return this.muted;
    }

    setBGMVolume(vol) {
        this.baseBgmVolume = Math.max(0, Math.min(1, vol));
        if (this.bgmGain && this.ctx && !this.muted) {
            this.bgmGain.gain.setValueAtTime(this.baseBgmVolume, this.ctx.currentTime);
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

    // Fission split sound (juicy pop)
    playFission(depth = 1) {
        if (!this.initialized || this.muted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const startFreq = 400 + depth * 80;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 1.8, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    // Shatter into coins/crystals when bubble reaches 1
    playPop() {
        if (!this.initialized || this.muted) return;
        this.resume();

        // High pleasant arpeggio pop
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            const startTime = this.ctx.currentTime + idx * 0.035;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });
    }

    // Non-divisible bounce (boing/deflect)
    playBounce() {
        if (!this.initialized || this.muted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
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
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);

        // Add high filter crackle
        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
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
        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

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

    // Procedural Cyberpunk Synth BGM Sequencer
    startBGM() {
        this.init();
        this.resume();
        if (!this.initialized || this.bgmPlaying) return;

        this.bgmPlaying = true;
        this.bgmStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;

        // 124 BPM -> 16th note step = ~0.121s
        const stepTime = 60 / 124 / 4;

        // Bassline Notes (MIDI or Hz):
        // 4 bars of 16 steps = 64 steps
        const bassNotes = [
            // Bar 1 (Am)
            55, 0, 55, 110,  55, 0, 65.4, 82.4,  55, 0, 55, 110,  65.4, 82.4, 55, 0,
            // Bar 2 (F)
            43.65, 0, 43.65, 87.3,  43.65, 0, 55, 65.4,  43.65, 0, 43.65, 87.3,  55, 65.4, 43.65, 0,
            // Bar 3 (C)
            65.4, 0, 65.4, 130.8,  65.4, 0, 49, 82.4,  65.4, 0, 65.4, 130.8,  49, 82.4, 65.4, 0,
            // Bar 4 (G)
            49, 0, 49, 98,  49, 0, 61.7, 73.4,  49, 0, 49, 98,  61.7, 73.4, 49, 0
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

    startAmbientMusic() {
        this.startBGM();
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

export const audio = new SoundFX();
