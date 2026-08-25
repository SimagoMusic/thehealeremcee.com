// Ambient Sound System
// Synthesized singing bowl, gong, and chime sounds using layered oscillators

class AmbientSoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = true;
  private initialized = false;
  private sectionObserver: IntersectionObserver | null = null;

  init(withSound: boolean) {
    if (this.initialized) return;
    this.initialized = true;
    this.muted = !withSound;

    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      return;
    }

    this.setupToggle();
    this.setupHoverSounds();
    this.setupSectionObserver();

    const toggle = document.getElementById('sound-toggle');
    if (toggle) {
      toggle.classList.remove('opacity-0', 'pointer-events-none');
      this.updateToggleIcon();
    }
  }

  // Singing bowl / gong: multiple detuned sine waves with long exponential decay
  private playBowl(baseFreq: number, duration: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const partials = [
      { ratio: 1,    gain: volume },
      { ratio: 2.71, gain: volume * 0.5 },
      { ratio: 4.98, gain: volume * 0.25 },
    ];

    partials.forEach(p => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = baseFreq * p.ratio;
      osc.detune.value = (Math.random() - 0.5) * 8;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(p.gain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  // Soft chime: high frequency with quick decay
  private playChime(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const freqs = [1175, 1760, 2350];

    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 6;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * (1 - i * 0.25), now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.9);
    });
  }

  private playSound(name: string) {
    // All gating is done via masterGain (0 when muted, 1 when unmuted)
    // so sounds still "play" but are silent when muted
    switch (name) {
      case 'hover':
        this.playBowl(528, 1.2, 0.06);
        break;
      case 'chime':
        this.playChime(0.07);
        break;
      case 'section-cross':
        this.playBowl(216, 3.0, 0.05);
        break;
      case 'singing-bowl':
        this.playBowl(432, 2.5, 0.1);
        break;
    }
  }

  private setupToggle() {
    const toggle = document.getElementById('sound-toggle');
    toggle?.addEventListener('click', () => {
      this.muted = !this.muted;

      // Resume AudioContext if suspended (browser autoplay policy)
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }

      if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(
          this.masterGain.gain.value,
          this.ctx.currentTime
        );
        this.masterGain.gain.linearRampToValueAtTime(
          this.muted ? 0 : 1,
          this.ctx.currentTime + 0.1
        );
      }

      this.updateToggleIcon();

      // Play a bowl sound when unmuting so user gets immediate feedback
      if (!this.muted) {
        this.playBowl(432, 2.0, 0.08);
      }
    });
  }

  private updateToggleIcon() {
    const onIcon = document.getElementById('sound-on-icon');
    const offIcon = document.getElementById('sound-off-icon');
    const toggle = document.getElementById('sound-toggle');
    if (this.muted) {
      onIcon?.classList.add('hidden');
      offIcon?.classList.remove('hidden');
      toggle?.setAttribute('data-muted', 'true');
    } else {
      onIcon?.classList.remove('hidden');
      offIcon?.classList.add('hidden');
      toggle?.setAttribute('data-muted', 'false');
    }
  }

  private setupHoverSounds() {
    // All nav links
    document.querySelectorAll('[data-sound="nav-hover"]').forEach(el => {
      el.addEventListener('mouseenter', () => this.playSound('hover'));
    });

    // All gold buttons and chime-tagged elements
    document.querySelectorAll('.btn-gold, [data-sound="chime"]').forEach(el => {
      el.addEventListener('mouseenter', () => this.playSound('chime'));
    });

    // All other links and interactive elements (CTA links, card links, etc.)
    document.querySelectorAll('a:not([data-sound])').forEach(el => {
      // Skip nav links (handled above) and very small elements
      if (el.closest('#main-nav') || el.closest('#mobile-menu')) return;
      el.addEventListener('mouseenter', () => this.playSound('hover'));
    });
  }

  private setupSectionObserver() {
    let lastSection = '';
    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id || entry.target.getAttribute('data-section') || '';
          if (id && id !== lastSection) {
            lastSection = id;
            this.playSound('section-cross');
          }
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('[data-section]').forEach(section => {
      this.sectionObserver?.observe(section);
    });
  }
}

// Global instance — sound starts muted, AudioContext initializes on first toggle click
const soundSystem = new AmbientSoundSystem();
(window as any).__soundSystem = soundSystem;

// Initialize immediately in muted state
soundSystem.init(false);
