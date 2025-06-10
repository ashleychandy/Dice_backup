import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useAnimation,
  useInView,
} from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCubes,
  faChartLine,
  faArrowRight,
  faCoins,
  faShield,
  faServer,
  faLock,
  faPercentage,
  faRandom,
  faPlay,
  faInfoCircle,
  faFire,
  faBolt,
  faDice,
  faCheckCircle,
  faExchangeAlt,
  faWallet,
  faChartPie,
  faAngleRight,
  faLayerGroup,
  faChain,
  faLink,
  faGlobe,
  faClock,
  faDatabase,
} from '@fortawesome/free-solid-svg-icons';

// Custom background patterns inspired by ReactBits
const BackgroundPatterns = {
  Gradient: ({ className }) => (
    <div className={`absolute inset-0 z-0 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-500/10 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/10 via-cyan-700/5 to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15)_0%,rgba(0,0,0,0)_60%)]"></div>
      <div className="absolute inset-0 opacity-30 mix-blend-soft-light">
        <svg width="100%" height="100%" className="absolute inset-0">
          <filter id="noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter="url(#noise)"
            opacity="0.05"
          />
        </svg>
      </div>
    </div>
  ),

  Grid: ({ className }) => (
    <div className={`absolute inset-0 z-0 ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.07)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:80px_80px]"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-teal-50/30"></div>
    </div>
  ),

  Dots: ({ className }) => (
    <div className={`absolute inset-0 z-0 ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(16, 185, 129, 0.3) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      ></div>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(16, 185, 129, 0.15) 2px, transparent 2px)',
          backgroundSize: '80px 80px',
          backgroundPosition: '40px 40px',
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-white/60 via-transparent to-white/60"></div>
    </div>
  ),

  Noise: ({ className }) => (
    <div className={`absolute inset-0 z-0 ${className}`}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/40 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/40 via-transparent to-emerald-50/40"></div>

      {/* Subtle hex pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill='%2310b981' fill-opacity='0.2'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
    </div>
  ),

  HeroBg: ({ className }) => (
    <div className={`absolute inset-0 z-0 ${className}`}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/70"></div>

      {/* Blur circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl opacity-70 transform translate-x-1/4 -translate-y-1/4"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl opacity-70 transform -translate-x-1/4 translate-y-1/4"></div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* Soft noise texture */}
      <div className="absolute inset-0 opacity-20 mix-blend-soft-light">
        <svg width="100%" height="100%">
          <filter id="heroNoise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.6"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter="url(#heroNoise)"
            opacity="0.2"
          />
        </svg>
      </div>
    </div>
  ),

  GlassBg: ({ className }) => (
    <div className={`absolute inset-0 z-0 ${className}`}>
      {/* Base white background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-xl"></div>

      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 via-transparent to-lime-100/20"></div>

      {/* Light beam effects */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl"></div>

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      ></div>
    </div>
  ),
};

// Custom animated shapes component
const AnimatedShapes = () => (
  <>
    {/* Large circle */}
    <motion.div
      className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-300/5 blur-2xl"
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.5, 0.7, 0.5],
        filter: ['blur(40px)', 'blur(60px)', 'blur(40px)'],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        repeatType: 'reverse',
      }}
    />

    {/* Medium circle */}
    <motion.div
      className="absolute -left-20 bottom-40 w-72 h-72 rounded-full bg-gradient-to-tr from-emerald-500/20 to-lime-400/10 blur-2xl"
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.4, 0.6, 0.4],
        filter: ['blur(30px)', 'blur(50px)', 'blur(30px)'],
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        repeatType: 'reverse',
        delay: 1,
      }}
    />

    {/* Small circle */}
    <motion.div
      className="absolute right-40 bottom-20 w-48 h-48 rounded-full bg-gradient-to-bl from-teal-400/20 to-emerald-300/10 blur-xl"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
        filter: ['blur(20px)', 'blur(30px)', 'blur(20px)'],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        repeatType: 'reverse',
        delay: 2,
      }}
    />

    {/* Extra decorative elements */}
    <motion.div
      className="absolute left-1/4 top-1/4 w-24 h-24 rounded-full bg-gradient-to-tr from-lime-400/20 to-emerald-300/5 blur-lg"
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.2, 0.4, 0.2],
        x: [0, 10, 0],
        y: [0, -10, 0],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        repeatType: 'reverse',
        delay: 0.5,
      }}
    />

    <motion.div
      className="absolute right-1/4 bottom-1/3 w-32 h-32 rounded-full bg-gradient-to-bl from-emerald-400/10 to-teal-300/20 blur-xl"
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.2, 0.3, 0.2],
        x: [0, -15, 0],
        y: [0, 15, 0],
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        repeatType: 'reverse',
        delay: 3,
      }}
    />
  </>
);

// Enhanced animated particle system for blockchain representation
const ParticleSystem = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: Math.random() * 5 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-emerald-600/20"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            x: [
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
            ],
            y: [
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
            ],
            opacity: [0.2, 0.6, 0.4, 0.2],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: particle.duration,
            times: [0, 0.33, 0.66, 1],
            repeat: Infinity,
            repeatType: 'reverse',
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
};

// Enhanced 3D floating token animation
const FloatingToken = ({ className }) => {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ rotateY: 0 }}
      animate={{
        rotateY: 360,
        y: [0, -10, 0, 10, 0],
      }}
      transition={{
        rotateY: {
          duration: 8,
          ease: 'linear',
          repeat: Infinity,
        },
        y: {
          duration: 5,
          ease: 'easeInOut',
          repeat: Infinity,
        },
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 shadow-lg flex items-center justify-center border-4 border-white">
        <span className="text-white text-3xl font-bold">G</span>
      </div>
      <div className="absolute inset-0 rounded-full border-2 border-white/30 transform scale-110"></div>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-lime-400/10 blur-sm"></div>
    </motion.div>
  );
};

// Animated VRF visualization component
const VrfVisualization = () => {
  return (
    <div className="relative w-full h-64 mx-auto">
      <motion.div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl"
        animate={{
          x: [0, 20, 0],
          rotateZ: [0, 5, -5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <FontAwesomeIcon icon={faDice} size="lg" />
      </motion.div>

      {/* Blockchain nodes */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center items-center">
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            className="w-10 h-10 mx-3 rounded-lg bg-white border border-emerald-500/30 shadow-md flex items-center justify-center text-emerald-600"
            animate={{
              y: [0, i % 2 === 0 ? -5 : 5, 0],
              boxShadow: [
                '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
                '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
                '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
              ],
            }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            <FontAwesomeIcon icon={faDatabase} />
          </motion.div>
        ))}
      </div>

      {/* Connection lines */}
      <svg
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        viewBox="0 0 400 100"
      >
        <motion.path
          d="M 50,50 H 350"
          stroke="rgba(16, 185, 129, 0.3)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          animate={{
            strokeDashoffset: [0, -20],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </svg>

      {/* VRF result */}
      <motion.div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl bg-white border-2 border-emerald-500/50 flex items-center justify-center text-emerald-600 font-bold text-xl shadow-lg"
        animate={{
          x: [20, 0, 20],
          boxShadow: [
            '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
            '0 20px 25px -5px rgba(16, 185, 129, 0.2)',
            '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={Math.random()}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            {Math.floor(Math.random() * 6) + 1}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Token burning animation
const TokenBurningAnimation = () => {
  return (
    <div className="relative w-full h-64">
      {/* Supply chart visualization */}
      <motion.div
        className="absolute left-0 top-0 w-32 h-32 bg-white/80 backdrop-blur-sm rounded-lg border border-emerald-500/30 shadow-xl overflow-hidden"
        animate={{
          y: [0, 5, 0],
          boxShadow: [
            '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
            '0 20px 25px -5px rgba(16, 185, 129, 0.2)',
            '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
          ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <div className="absolute inset-0 p-2">
          <div className="text-xs text-emerald-800 font-medium mb-1">
            GAMA Supply
          </div>
          <svg viewBox="0 0 100 60" className="w-full h-20">
            <motion.path
              d="M 0,30 Q 10,30 20,25 Q 30,20 40,15 Q 50,10 60,18 Q 70,25 80,10 Q 90,5 100,0"
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            />
            <motion.path
              d="M 0,60 L 0,30 Q 10,30 20,25 Q 30,20 40,15 Q 50,10 60,18 Q 70,25 80,10 Q 90,5 100,0 L 100,60 Z"
              fill="url(#gradient)"
              fillOpacity="0.2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute bottom-2 right-2 text-xs text-emerald-800 font-medium">
            Decreasing
          </div>
        </div>
      </motion.div>

      {/* Center token burning visualization */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 flex items-center justify-center"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(16, 185, 129, 0.5)',
              '0 0 0 15px rgba(16, 185, 129, 0)',
              '0 0 0 0 rgba(16, 185, 129, 0)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          <span className="text-white text-3xl font-bold">G</span>

          {/* Burning effect */}
          <motion.div
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 opacity-70"
            animate={{
              y: [0, -15],
              opacity: [0.7, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'loop',
            }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bottom-0 left-1/2"
                style={{
                  width: `${6 + Math.random() * 8}px`,
                  height: `${15 + Math.random() * 20}px`,
                  marginLeft: `${-5 + Math.random() * 10}px`,
                  borderRadius: '50% 50% 20% 20%',
                  background: `linear-gradient(to top, rgb(${217 + Math.random() * 38}, ${119 + Math.random() * 30}, 6), rgba(239, 68, 68, 0.5))`,
                  filter: 'blur(1px)',
                  transform: `rotate(${-15 + Math.random() * 30}deg)`,
                }}
                animate={{
                  y: [0, -15 - Math.random() * 10],
                  opacity: [1, 0],
                  scale: [1, 0.8],
                }}
                transition={{
                  duration: 1 + Math.random() * 0.5,
                  repeat: Infinity,
                  repeatType: 'loop',
                  delay: Math.random() * 0.5,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Token price indicator */}
      <motion.div
        className="absolute right-0 top-0 w-32 h-32 bg-white/80 backdrop-blur-sm rounded-lg border border-emerald-500/30 shadow-xl overflow-hidden"
        animate={{
          y: [0, 5, 0],
          boxShadow: [
            '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
            '0 20px 25px -5px rgba(16, 185, 129, 0.2)',
            '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
          ],
        }}
        transition={{
          duration: 4,
          delay: 0.5,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <div className="absolute inset-0 p-2">
          <div className="text-xs text-emerald-800 font-medium mb-1">
            GAMA Price
          </div>
          <svg viewBox="0 0 100 60" className="w-full h-20">
            <motion.path
              d="M 0,50 Q 10,48 20,45 Q 30,40 40,42 Q 50,45 60,35 Q 70,25 80,15 Q 90,10 100,5"
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            />
            <motion.path
              d="M 0,60 L 0,50 Q 10,48 20,45 Q 30,40 40,42 Q 50,45 60,35 Q 70,25 80,15 Q 90,10 100,5 L 100,60 Z"
              fill="url(#gradient2)"
              fillOpacity="0.2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            />
            <defs>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute bottom-2 right-2 text-xs text-emerald-800 font-medium">
            Increasing
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Animation hook for scroll-triggered animations
const useScrollAnimation = () => {
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, amount: 0.3 });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    } else {
      controls.start('hidden');
    }
  }, [controls, inView]);

  return { ref, controls, inView };
};

// Animated 3D card component with hover effects
const AnimatedCard = ({ icon, title, description, className }) => {
  const { ref, controls } = useScrollAnimation();

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      animate={controls}
      transition={{ duration: 0.5 }}
      className={`bg-white/20 backdrop-blur-xl rounded-xl border border-white/30 shadow-xl overflow-hidden group ${className}`}
      whileHover={{
        scale: 1.03,
        backgroundColor: 'rgba(255,255,255,0.25)',
        boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)',
        y: -3,
      }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="p-3 sm:p-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-lime-400/20 flex items-center justify-center text-emerald-600 text-sm mb-2 border border-emerald-500/30 group-hover:border-emerald-500/50 group-hover:from-emerald-500/40 group-hover:to-lime-400/30 transition-all duration-300 shadow-md mx-auto">
          <FontAwesomeIcon icon={icon} />
        </div>
        <h3 className="text-sm font-bold mb-1 text-emerald-800">{title}</h3>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/5 via-transparent to-lime-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </motion.div>
  );
};

// Zero House Edge visualization component
const ZeroHouseEdgeVisualization = () => {
  return (
    <div className="relative h-64 w-full mx-auto">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative w-40 h-40 rounded-full bg-white border-2 border-emerald-500/30 flex items-center justify-center shadow-xl overflow-hidden"
          animate={{
            boxShadow: [
              '0 10px 25px -5px rgba(16, 185, 129, 0.2)',
              '0 20px 30px -10px rgba(16, 185, 129, 0.3)',
              '0 10px 25px -5px rgba(16, 185, 129, 0.2)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-white"></div>
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-teal-500">
              0
            </span>
            <span className="text-2xl font-bold text-emerald-800">%</span>
            <span className="text-sm text-emerald-700 mt-1 font-medium">
              House Edge
            </span>
          </div>

          {/* Radiating effect */}
          <div className="absolute inset-0 pointer-events-none">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-emerald-500/30"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.5,
                  repeat: Infinity,
                  repeatType: 'loop',
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Player representations */}
      <div className="absolute inset-x-0 bottom-0 flex justify-around">
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="w-14 h-14 rounded-full bg-white border border-emerald-500/30 shadow-md flex items-center justify-center text-emerald-600"
            animate={{
              y: [0, -5, 0],
              boxShadow: [
                '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
                '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
                '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
              ],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            <FontAwesomeIcon icon={faWallet} />
          </motion.div>
        ))}
      </div>

      {/* Connecting arrows */}
      <div className="absolute inset-0">
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="absolute left-1/2 bottom-1/3"
            style={{
              width: '2px',
              height: '60px',
              backgroundColor: 'rgba(16, 185, 129, 0.3)',
              transformOrigin: 'bottom center',
              transform: `translateX(${(i - 2) * 80}px) rotate(${(i - 2) * 15}deg)`,
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              height: ['60px', '65px', '60px'],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            <motion.div
              className="absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center text-emerald-600"
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 1,
                delay: i * 0.3,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            >
              <FontAwesomeIcon icon={faCoins} />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Main IntroScreen component
const IntroScreen = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 5;
  const [isAnimating, setIsAnimating] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Parallax effect for mouse movement
  useEffect(() => {
    const handleMouseMove = e => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Prevent scrolling on component mount
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const nextStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete();
      }
      setTimeout(() => setIsAnimating(false), 500);
    }, 300);
  };

  // Enhanced animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
    exit: { opacity: 0, transition: { duration: 0.5 } },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.12,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -30,
      transition: {
        duration: 0.5,
        ease: 'easeIn',
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const backgroundVariants = {
    hidden: { opacity: 0, scale: 1.05 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1.2,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.5,
      },
    },
  };

  // Content for each step - enhanced with more modern design and animations
  const steps = [
    // Welcome step - GAMA Coin introduction
    {
      title: 'Welcome to GAMA Coin',
      subtitle:
        'The revolutionary gaming token with zero house edge and 100% token burning.',
      content: (
        <motion.div variants={itemVariants} className="text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
            <div className="flex-1 max-w-xs mx-auto md:max-w-none mb-4 md:mb-0">
              <div
                className="relative mx-auto"
                style={{ width: '140px', height: '140px' }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    perspective: '1000px',
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(${mousePosition.x * 20}deg) rotateX(${-mousePosition.y * 20}deg)`,
                  }}
                >
                  <FloatingToken className="w-full h-full" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full opacity-50 blur-lg"
                  animate={{
                    background: [
                      'radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, rgba(16, 185, 129, 0) 70%)',
                      'radial-gradient(circle, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0) 70%)',
                      'radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, rgba(16, 185, 129, 0) 70%)',
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-lg text-emerald-800 mx-auto mb-4 text-center md:text-left font-medium">
                GAMA Coin revolutionizes blockchain gaming with three core
                innovations:
              </p>
              <div className="flex flex-col gap-2 md:gap-4">
                {[
                  {
                    icon: faRandom,
                    title: '100% Fair Random Results',
                    desc: 'Verifiable blockchain randomness',
                  },
                  {
                    icon: faFire,
                    title: 'Deflationary Tokenomics',
                    desc: 'Every bet burns tokens permanently',
                  },
                  {
                    icon: faPercentage,
                    title: 'Zero House Edge',
                    desc: 'All winnings go directly to players',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 bg-white/40 backdrop-blur-sm p-2 sm:p-3 rounded-lg border border-emerald-200/50 shadow-sm"
                    whileHover={{
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      y: -2,
                      boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.15)',
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-400/80 flex items-center justify-center text-white">
                      <FontAwesomeIcon
                        icon={item.icon}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-emerald-800">
                        {item.title}
                      </h3>
                      <p className="text-xs text-emerald-700">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ),
      backgroundType: 'HeroBg',
    },

    // Fair Random Results step with VRF visualization
    {
      title: 'Fair & Random Results',
      subtitle: 'Secured by blockchain technology with no server intervention',
      content: (
        <motion.div
          variants={itemVariants}
          className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto h-full"
        >
          <div className="flex flex-col justify-center">
            <div className="bg-white/30 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-white/30 shadow-xl">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-500/80 flex items-center justify-center text-white shadow-md shrink-0">
                  <FontAwesomeIcon
                    icon={faRandom}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-emerald-800">
                  Verifiable Random Function
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                GAMA leverages blockchain's native{' '}
                <strong>VRF (Verifiable Random Function)</strong> to generate
                truly random and tamper-proof results for each game.
              </p>

              <div className="space-y-2 mt-2 sm:mt-3">
                {[
                  {
                    icon: faServer,
                    title: 'No Servers Involved',
                    description:
                      'All game logic executes directly on-chain without any centralized server participation',
                  },
                  {
                    icon: faShield,
                    title: 'Tamper-Proof Security',
                    description:
                      'Blockchain consensus ensures results cannot be manipulated by anyone',
                  },
                  {
                    icon: faGlobe,
                    title: 'Publicly Verifiable',
                    description:
                      'Every game outcome can be independently verified on the blockchain',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-2 p-1.5 sm:p-2 rounded-lg bg-white/40 backdrop-blur-sm border border-emerald-100/50"
                    whileHover={{
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      y: -1,
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-400/20 flex items-center justify-center text-emerald-600 shrink-0">
                      <FontAwesomeIcon icon={item.icon} className="text-xs" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-600 leading-tight">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <motion.div
              className="w-full max-w-md bg-white/30 backdrop-blur-xl rounded-xl border border-white/30 shadow-xl p-3 sm:p-4 overflow-hidden"
              whileHover={{
                boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <h3 className="text-sm sm:text-base font-bold text-emerald-800 mb-2 sm:mb-3">
                How VRF Works on GAMA
              </h3>

              <div className="h-40 sm:h-48 md:h-52">
                <VrfVisualization />
              </div>

              <div className="mt-2 text-xs text-center text-gray-600">
                <p>
                  Blockchain-verified randomness ensures fairness with each roll
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ),
      backgroundType: 'Grid',
    },

    // Token Burning step with enhanced visualization
    {
      title: 'Deflationary Tokenomics',
      subtitle:
        'Every bet permanently reduces token supply, increasing scarcity',
      content: (
        <motion.div
          variants={itemVariants}
          className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto h-full"
        >
          <div className="flex items-center justify-center order-2 md:order-1">
            <motion.div
              className="w-full max-w-md bg-white/30 backdrop-blur-xl rounded-xl border border-white/30 shadow-xl p-3 sm:p-4 overflow-hidden"
              whileHover={{
                boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <h3 className="text-sm sm:text-base font-bold text-emerald-800 mb-2 sm:mb-3">
                Token Burning Mechanics
              </h3>

              <div className="h-40 sm:h-48 md:h-52">
                <TokenBurningAnimation />
              </div>

              <div className="mt-2 text-xs text-center text-gray-600">
                <p>
                  As supply decreases through burns, token value naturally
                  increases
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col justify-center order-1 md:order-2">
            <div className="bg-white/30 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-white/30 shadow-xl">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-500/80 flex items-center justify-center text-white shadow-md shrink-0">
                  <FontAwesomeIcon
                    icon={faFire}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-emerald-800">
                  100% Token Burning
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                <strong>Every token you bet is permanently burned</strong> from
                circulation, creating continuous deflationary pressure on the
                GAMA supply.
              </p>

              <div className="space-y-2 mt-2 sm:mt-3">
                {[
                  {
                    icon: faChartPie,
                    title: 'Decreasing Total Supply',
                    description:
                      'As players place bets, the total circulating supply of GAMA continuously decreases',
                  },
                  {
                    icon: faChartLine,
                    title: 'Increasing Token Value',
                    description:
                      'Basic economics: as supply decreases while demand remains stable, token value rises',
                  },
                  {
                    icon: faLayerGroup,
                    title: 'Verifiable Burns',
                    description:
                      'All token burns are recorded on-chain and can be publicly verified by anyone',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-2 p-1.5 sm:p-2 rounded-lg bg-white/40 backdrop-blur-sm border border-emerald-100/50"
                    whileHover={{
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      y: -1,
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-400/20 flex items-center justify-center text-emerald-600 shrink-0">
                      <FontAwesomeIcon icon={item.icon} className="text-xs" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-600 leading-tight">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ),
      backgroundType: 'Dots',
    },

    // Zero House Edge step with enhanced visualization
    {
      title: 'Zero House Edge',
      subtitle: 'Your odds are better than any traditional casino',
      content: (
        <motion.div
          variants={itemVariants}
          className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto h-full"
        >
          <div className="flex flex-col justify-center">
            <div className="bg-white/30 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-white/30 shadow-xl">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-500/80 flex items-center justify-center text-white shadow-md shrink-0">
                  <FontAwesomeIcon
                    icon={faPercentage}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-emerald-800">
                  0% House Edge
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                Unlike traditional casinos that take a percentage of bets, GAMA
                operates with <strong>absolutely no house edge</strong>. 100% of
                potential winnings go directly to players.
              </p>

              <div className="space-y-2 mt-2 sm:mt-3">
                {[
                  {
                    icon: faCoins,
                    title: 'Maximum Player Returns',
                    description:
                      'The full 6X payout on winning bets goes directly to the player with no deductions',
                  },
                  {
                    icon: faBolt,
                    title: 'Instant Payouts',
                    description:
                      'Winnings are instantly transferred to your wallet as soon as the game completes',
                  },
                  {
                    icon: faExchangeAlt,
                    title: 'True Win Probability',
                    description:
                      'Your actual chances of winning match the mathematical probability (1/6)',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-2 p-1.5 sm:p-2 rounded-lg bg-white/40 backdrop-blur-sm border border-emerald-100/50"
                    whileHover={{
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      y: -1,
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-400/20 flex items-center justify-center text-emerald-600 shrink-0">
                      <FontAwesomeIcon icon={item.icon} className="text-xs" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-600 leading-tight">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <motion.div
              className="w-full max-w-md bg-white/30 backdrop-blur-xl rounded-xl border border-white/30 shadow-xl p-3 sm:p-4 overflow-hidden"
              whileHover={{
                boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <h3 className="text-sm sm:text-base font-bold text-emerald-800 mb-2 sm:mb-3">
                Player-First Economics
              </h3>

              <div className="h-40 sm:h-48 md:h-52">
                <ZeroHouseEdgeVisualization />
              </div>

              <div className="mt-2 text-xs text-center text-gray-600">
                <p>
                  Traditional casinos: 1-15% house edge. GAMA: 0% house edge.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ),
      backgroundType: 'GlassBg',
    },

    // Ready to Play step
    {
      title: 'Ready to Enter GAMA',
      subtitle: 'Connect your wallet to start playing',
      content: (
        <motion.div
          variants={itemVariants}
          className="text-center w-full max-w-4xl mx-auto px-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5">
            <AnimatedCard
              icon={faRandom}
              title="Fair & Random"
              description="Blockchain-powered VRF guarantees tamper-proof random results with every game."
              className="sm:text-xs"
            />
            <AnimatedCard
              icon={faFire}
              title="Token Burning"
              description="100% of tokens used in games are burned, decreasing total supply forever."
              className="sm:text-xs"
            />
            <AnimatedCard
              icon={faPercentage}
              title="Zero House Edge"
              description="No rake, no fees, no house advantage. 100% of winnings go to players."
              className="sm:text-xs"
            />
          </div>

          <div className="w-full max-w-xl mx-auto bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-xl p-2.5 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-emerald-800 mb-2 sm:mb-3">
              Join the Future of Gaming
            </h3>
            <div className="flex flex-col gap-2">
              {[
                {
                  icon: faCheckCircle,
                  title: 'XDC Chain Compatible',
                  desc: 'Fast, secure, and low-fee transactions on the XDC network',
                },
                {
                  icon: faCheckCircle,
                  title: 'Beautiful Interface',
                  desc: 'User-friendly design with smooth animations and intuitive controls',
                },
                {
                  icon: faCheckCircle,
                  title: 'Community Owned',
                  desc: 'No central authority - the system is fully governed by smart contracts',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-left text-emerald-700"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shrink-0">
                    <FontAwesomeIcon icon={item.icon} className="text-xs" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-medium">
                      {item.title}
                    </span>
                    <p className="text-xs text-emerald-600 leading-tight">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motion.button
            className="px-5 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl shadow-lg text-sm sm:text-base font-medium flex items-center gap-2 mx-auto"
            whileHover={{
              scale: 1.05,
              boxShadow: '0 20px 30px -10px rgba(16, 185, 129, 0.5)',
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onComplete}
          >
            Enter GAMA
            <FontAwesomeIcon icon={faArrowRight} />
          </motion.button>
        </motion.div>
      ),
      backgroundType: 'HeroBg',
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Enhanced animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-emerald-50 to-white overflow-hidden"
        variants={backgroundVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Dynamic background pattern based on current step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`bg-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {currentStepData.backgroundType === 'Gradient' && (
              <BackgroundPatterns.Gradient />
            )}
            {currentStepData.backgroundType === 'Grid' && (
              <BackgroundPatterns.Grid />
            )}
            {currentStepData.backgroundType === 'Dots' && (
              <BackgroundPatterns.Dots />
            )}
            {currentStepData.backgroundType === 'Noise' && (
              <BackgroundPatterns.Noise />
            )}
            {currentStepData.backgroundType === 'HeroBg' && (
              <BackgroundPatterns.HeroBg />
            )}
            {currentStepData.backgroundType === 'GlassBg' && (
              <BackgroundPatterns.GlassBg />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Animated decorative shapes */}
        <AnimatedShapes />

        {/* Particle system for blockchain visualization */}
        <ParticleSystem />
      </motion.div>

      {/* Main content container with fixed layout structure */}
      <div className="relative z-30 w-full max-w-7xl mx-auto h-screen flex flex-col overflow-hidden">
        {/* Enhanced header with modern design */}
        <header className="fixed top-0 left-0 right-0 max-w-7xl mx-auto px-3 sm:px-4 py-2 flex justify-between items-center z-40 backdrop-blur-sm bg-white/20">
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <img
              src="Gama_logo.png"
              alt="GAMA"
              className="w-7 h-7 sm:w-8 sm:h-8 mr-2 object-contain"
            />
            <span className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-600">
              GAMA
            </span>
          </motion.div>
          <motion.div
            className="text-emerald-800"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {currentStep < totalSteps ? (
              <button
                onClick={onComplete}
                className="text-xs font-medium px-2 py-1 rounded-md hover:bg-white/30 transition-colors duration-200"
              >
                Skip Intro
              </button>
            ) : null}
          </motion.div>
        </header>

        {/* Main content area with enhanced animations */}
        <div className="flex-1 flex flex-col justify-center px-3 sm:px-4 pt-12 pb-20 overflow-hidden">
          <div className="flex flex-col justify-center min-h-0 h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${currentStep}`}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="py-2 h-full flex flex-col"
              >
                <motion.h2
                  variants={itemVariants}
                  className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-600 mb-1 sm:mb-2 text-center"
                >
                  {currentStepData.title}
                </motion.h2>

                <motion.p
                  variants={itemVariants}
                  className="text-xs sm:text-sm md:text-base text-emerald-700 mb-3 text-center max-w-3xl mx-auto"
                >
                  {currentStepData.subtitle}
                </motion.p>

                <motion.div
                  variants={itemVariants}
                  className="flex-1 flex items-center"
                >
                  {currentStepData.content}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Enhanced continue button with modern design */}
        {currentStep < totalSteps && (
          <div className="fixed bottom-10 left-0 right-0 flex justify-center z-40">
            <motion.button
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 backdrop-blur-sm"
              whileHover={{
                scale: 1.05,
                boxShadow: '0 20px 30px -10px rgba(16, 185, 129, 0.4)',
              }}
              whileTap={{ scale: 0.98 }}
              onClick={nextStep}
              disabled={isAnimating}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <span>Continue</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              >
                <FontAwesomeIcon icon={faArrowRight} />
              </motion.div>
            </motion.button>
          </div>
        )}

        {/* Enhanced progress indicator with modern design */}
        <div className="fixed bottom-0 left-0 right-0 flex justify-center gap-1 sm:gap-1.5 py-2 z-40 bg-gradient-to-t from-white/90 to-transparent pt-6 pb-2">
          {steps.map((_, index) => (
            <motion.button
              key={index}
              className="w-5 sm:w-7 h-1 rounded-full bg-emerald-800/20 focus:outline-none overflow-hidden"
              animate={{
                backgroundColor:
                  index === currentStep
                    ? 'rgb(16, 185, 129)' // emerald-500
                    : index < currentStep
                      ? 'rgb(16, 185, 129, 0.4)' // emerald-500/40
                      : 'rgb(16, 185, 129, 0.1)', // emerald-500/10
              }}
              onClick={() => setCurrentStep(index)}
            >
              {index === currentStep && (
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300"
                  layoutId="activeStep"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default IntroScreen;
