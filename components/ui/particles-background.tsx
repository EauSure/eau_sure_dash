'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';
import { useTheme } from 'next-themes';

// Debug mode: set to true to make particles highly visible
const DEBUG = false;

export function ParticlesBackground() {
  const [init, setInit] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [colors, setColors] = useState({
    primary: '#3b82f6',
    muted: '#94a3b8',
  });
  const { resolvedTheme } = useTheme();

  // Initialize particles engine
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Read CSS variables for theming
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateColors = () => {
      // For oklch colors, we'll use sensible defaults based on theme
      const isDark = resolvedTheme === 'dark';
      
      setColors({
        primary: isDark ? '#60a5fa' : '#3b82f6',  // blue-400 : blue-500
        muted: isDark ? '#64748b' : '#94a3b8',     // slate-500 : slate-400
      });
    };

    updateColors();
    
    // Re-read on theme change
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateColors();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [resolvedTheme]);

  const particlesLoaded = async (): Promise<void> => {};

  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: {
          value: 'transparent',
        },
      },
      fpsLimit: DEBUG ? 120 : (prefersReducedMotion ? 30 : 60),
      particles: {
        color: {
          value: colors.primary,
        },
        links: {
          color: colors.primary,
          distance: DEBUG ? 200 : 150,
          enable: !prefersReducedMotion,
          opacity: DEBUG ? 0.8 : (resolvedTheme === 'dark' ? 0.4 : 0.3),
          width: DEBUG ? 2 : 1,
        },
        move: {
          direction: 'bottom',
          enable: true,
          outModes: {
            default: 'out',
            bottom: 'out',
            top: 'out',
          },
          random: true,
          speed: DEBUG ? 2 : (prefersReducedMotion ? 0.3 : 0.8),
          straight: false,
        },
        number: {
          density: {
            enable: true,
            width: 1920,
            height: 1080,
          },
          value: DEBUG ? 100 : (prefersReducedMotion ? 30 : 60),
        },
        opacity: {
          value: {
            min: DEBUG ? 0.5 : 0.3,
            max: DEBUG ? 1 : 0.7,
          },
          animation: {
            enable: true,
            speed: 0.5,
            sync: false,
          },
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: DEBUG ? { min: 3, max: 8 } : { min: 2, max: 6 },
          animation: {
            enable: true,
            speed: 2,
            sync: false,
          },
        },
        wobble: {
          enable: true,
          distance: 10,
          speed: 3,
        },
      },
      emitters: {
        direction: 'top',
        rate: {
          delay: 0.2,
          quantity: 2,
        },
        size: {
          width: 100,
          height: 0,
        },
        position: {
          x: 50,
          y: 100,
        },
      },
      detectRetina: true,
    }),
    [resolvedTheme, prefersReducedMotion, colors]
  );

  // Don't render until particles engine is initialized
  if (!init) {
    return null;
  }

  return (
    <>
      {DEBUG && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-1 text-xs font-mono rounded">
          DEBUG MODE: Particles visible
        </div>
      )}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          // Debug border to confirm container is positioned correctly
          ...(DEBUG ? { border: '2px solid red' } : {})
        }}
      >
        <Particles
          id="tsparticles-background"
          particlesLoaded={particlesLoaded}
          options={options}
          className="h-full w-full"
        />
      </div>
    </>
  );
}

