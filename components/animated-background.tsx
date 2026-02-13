"use client"

import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useEffect } from "react"

export function AnimatedBackground() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window
      
      // Normalize to -1 to 1 range
      const x = (clientX / innerWidth - 0.5) * 2
      const y = (clientY / innerHeight - 0.5) * 2
      
      animate(mouseX, x * 50, { duration: 0.5, ease: "easeOut" })
      animate(mouseY, y * 50, { duration: 0.5, ease: "easeOut" })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  // Transform mouse position to movement ranges
  const orb1X = useTransform(mouseX, [-50, 50], [-30, 30])
  const orb1Y = useTransform(mouseY, [-50, 50], [-30, 30])
  
  const orb2X = useTransform(mouseX, [-50, 50], [20, -20])
  const orb2Y = useTransform(mouseY, [-50, 50], [20, -20])
  
  const orb3X = useTransform(mouseX, [-50, 50], [-15, 15])
  const orb3Y = useTransform(mouseY, [-50, 50], [15, -15])

  const ring1X = useTransform(mouseX, [-50, 50], [-10, 10])
  const ring1Y = useTransform(mouseY, [-50, 50], [-10, 10])

  const ring2X = useTransform(mouseX, [-50, 50], [10, -10])
  const ring2Y = useTransform(mouseY, [-50, 50], [10, -10])

  const glowX = useTransform(mouseX, [-50, 50], [-100, 100])
  const glowY = useTransform(mouseY, [-50, 50], [-100, 100])

  const corner1Opacity = useTransform(mouseX, [-50, 0], [0.3, 0])
  const corner1Scale = useTransform(mouseX, [-50, 0], [1.2, 1])

  const corner2Opacity = useTransform(mouseX, [0, 50], [0, 0.3])
  const corner2Scale = useTransform(mouseX, [0, 50], [1, 1.2])

  const corner3Opacity = useTransform(mouseY, [0, 50], [0, 0.3])
  const corner3Scale = useTransform(mouseY, [0, 50], [1, 1.2])

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
      {/* Base gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Professional gradient orbs with mouse interaction */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [0, 60, 0],
          y: [0, -40, 0],
        }}
        style={{
          x: orb1X,
          y: orb1Y,
        }}
        transition={{
          scale: { duration: 28, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 28, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 28, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 28, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-[100px] dark:from-blue-600/15 dark:to-cyan-600/15"
      />
      
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.2, 0.3, 0.2],
          x: [0, -40, 0],
          y: [0, 60, 0],
        }}
        style={{
          x: orb2X,
          y: orb2Y,
        }}
        transition={{
          scale: { duration: 32, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 32, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 32, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 32, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute top-1/4 -right-32 w-[700px] h-[700px] bg-gradient-to-bl from-indigo-500/15 to-purple-500/15 rounded-full blur-[120px] dark:from-indigo-600/12 dark:to-purple-600/12"
      />

      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.18, 0.28, 0.18],
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        style={{
          x: orb3X,
          y: orb3Y,
        }}
        transition={{
          scale: { duration: 35, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 35, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 35, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 35, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute bottom-0 left-1/4 w-[650px] h-[650px] bg-gradient-to-tr from-violet-500/15 to-blue-500/15 rounded-full blur-[110px] dark:from-violet-600/12 dark:to-blue-600/12"
      />

      {/* Accent shapes with hover response */}
      <motion.div
        animate={{
          rotate: [0, 360],
          scale: [1, 1.05, 1],
        }}
        style={{
          x: ring1X,
          y: ring1Y,
        }}
        transition={{
          rotate: { duration: 40, repeat: Infinity, ease: "linear" },
          scale: { duration: 40, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blue-200/10 dark:border-blue-700/10 rounded-full"
      />

      <motion.div
        animate={{
          rotate: [360, 0],
          scale: [1.05, 1, 1.05],
        }}
        style={{
          x: ring2X,
          y: ring2Y,
        }}
        transition={{
          rotate: { duration: 50, repeat: Infinity, ease: "linear" },
          scale: { duration: 50, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-indigo-200/10 dark:border-indigo-700/10 rounded-full"
      />

      {/* Interactive glow that follows cursor */}
      <motion.div
        style={{
          x: glowX,
          y: glowY,
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-blue-400/10 via-indigo-400/10 to-purple-400/10 dark:from-blue-500/8 dark:via-indigo-500/8 dark:to-purple-500/8 rounded-full blur-[80px]"
      />

      {/* Floating particles with subtle mouse influence */}
      {[...Array(8)].map((_, i) => {
        const particleX = useTransform(mouseX, [-50, 50], [-5 * (i % 2 ? 1 : -1), 5 * (i % 2 ? 1 : -1)])
        
        return (
          <motion.div
            key={i}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.5, 0],
            }}
            style={{
              x: particleX,
              left: `${15 + i * 12}%`,
              bottom: '0%',
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeInOut",
            }}
            className="absolute w-1 h-1 bg-blue-400/40 dark:bg-blue-500/30 rounded-full"
          />
        )
      })}

      {/* Corner accent glows that respond to proximity */}
      <motion.div
        style={{
          opacity: corner1Opacity,
          scale: corner1Scale,
        }}
        className="absolute top-0 left-0 w-[300px] h-[300px] bg-blue-400/10 dark:bg-blue-500/8 rounded-full blur-[60px]"
      />
      
      <motion.div
        style={{
          opacity: corner2Opacity,
          scale: corner2Scale,
        }}
        className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-400/10 dark:bg-indigo-500/8 rounded-full blur-[60px]"
      />
      
      <motion.div
        style={{
          opacity: corner3Opacity,
          scale: corner3Scale,
        }}
        className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-400/10 dark:bg-violet-500/8 rounded-full blur-[60px]"
      />
      
      <motion.div
        style={{
          opacity: useTransform(
            [mouseX, mouseY],
            ([x, y]) => Math.min(Math.abs(x as number) + Math.abs(y as number), 50) / 50 * 0.3
          ),
          scale: useTransform(
            [mouseX, mouseY],
            ([x, y]) => 1 + (Math.min(Math.abs(x as number) + Math.abs(y as number), 50) / 50 * 0.2)
          ),
        }}
        className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-400/10 dark:bg-purple-500/8 rounded-full blur-[60px]"
      />
    </div>
  )
}