"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import iconLogo from "@/images/CelesteLogoiconwhitecopy2.png";
import wordmark from "@/images/Celeste-Logo-white2.png";
import {
  INTRO_EVENT,
  INTRO_HTML_CLASS,
  INTRO_LOGIN_KEY,
  INTRO_SEEN_KEY,
  clearIntroBootChrome,
  introShouldPlay,
} from "@/lib/intro-splash";

const EASE = [0.22, 1, 0.36, 1] as const;

function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
    sessionStorage.removeItem(INTRO_LOGIN_KEY);
  } catch {
    // Ignore storage failures; the intro still closes.
  }
}

export function IntroSplash() {
  const [runId, setRunId] = useState(0);
  const [active, setActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [reduced, setReduced] = useState(false);
  const playingRef = useRef(false);
  const replayRef = useRef(false);
  const exitingRef = useRef(false);
  const runRef = useRef(0);
  const doneRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const playRef = useRef<() => void>(() => {});

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const finish = useCallback((run: number) => {
    if (runRef.current !== run || doneRef.current === run) return;
    doneRef.current = run;
    clearTimers();
    markIntroSeen();
    clearIntroBootChrome();
    playingRef.current = false;
    exitingRef.current = false;
    setActive(false);
    setExiting(false);
    if (replayRef.current) {
      replayRef.current = false;
      window.setTimeout(() => playRef.current(), 60);
    }
  }, []);

  const play = useCallback((source: "boot" | "login" = "boot") => {
    if (playingRef.current) {
      if (source === "login") replayRef.current = true;
      return;
    }

    playingRef.current = true;
    exitingRef.current = false;
    try {
      sessionStorage.removeItem(INTRO_LOGIN_KEY);
    } catch {
      // Ignore.
    }

    const run = ++runRef.current;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add(INTRO_HTML_CLASS);
    document.documentElement.style.overflow = "hidden";
    setReduced(prefersReduced);
    setExiting(false);
    setRunId(run);
    setActive(true);

    const exitAt = prefersReduced ? 560 : 2680;
    const endAt = prefersReduced ? 980 : 3560;
    clearTimers();
    timersRef.current.push(
      window.setTimeout(() => {
        if (runRef.current !== run) return;
        exitingRef.current = true;
        setExiting(true);
      }, exitAt)
    );
    timersRef.current.push(
      window.setTimeout(() => {
        finish(run);
      }, endAt)
    );
  }, [finish]);

  playRef.current = play;

  const skip = useCallback(() => {
    if (!playingRef.current || exitingRef.current) return;
    const run = runRef.current;
    exitingRef.current = true;
    clearTimers();
    setExiting(true);
    const leaveMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 240 : 720;
    timersRef.current.push(
      window.setTimeout(() => {
        finish(run);
      }, leaveMs)
    );
  }, [finish]);

  useLayoutEffect(() => {
    if (!introShouldPlay()) {
      clearIntroBootChrome();
      return;
    }
    play("boot");
  }, [play]);

  useLayoutEffect(() => {
    if (!active) return;
    document.getElementById("celeste-intro-cover")?.remove();
  }, [active]);

  useEffect(() => {
    const onLogin = () => play("login");
    window.addEventListener(INTRO_EVENT, onLogin);
    return () => window.removeEventListener(INTRO_EVENT, onLogin);
  }, [play]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skip]);

  if (!active) return null;

  return (
    <motion.div
      key={runId}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Celeste"
      className="fixed inset-0 z-[10050] flex items-center justify-center overflow-hidden bg-black text-white"
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      animate={{ clipPath: exiting ? "inset(0% 0% 100% 0%)" : "inset(0% 0% 0% 0%)" }}
      transition={exiting ? { duration: reduced ? 0.25 : 0.82, ease: [0.76, 0, 0.24, 1] } : { duration: 0 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(78vw,460px)] w-[min(78vw,460px)] -translate-x-1/2 -translate-y-1/2"
      >
        <motion.div
          className="h-full w-full rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 46%, rgba(255,255,255,0) 72%)",
          }}
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.06 : 1 }}
          transition={reduced ? { duration: 0.2 } : { duration: 1.15, ease: EASE }}
        />
      </div>

      <motion.div
        className="relative flex flex-col items-center px-6"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: exiting ? 0 : 1, y: exiting ? -16 : 0 }}
        transition={exiting ? { duration: reduced ? 0.2 : 0.45, ease: EASE } : { duration: 0.45, ease: EASE }}
      >
        <div className="relative flex h-[148px] w-[148px] items-center justify-center">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 148 148" aria-hidden>
            <motion.circle
              cx="74"
              cy="74"
              r="66"
              fill="none"
              stroke="rgba(255,255,255,0.72)"
              strokeWidth="0.75"
              initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 0.72 : 0 }}
              animate={{ pathLength: 1, opacity: 0.72 }}
              transition={reduced ? { duration: 0.01 } : { duration: 1.25, delay: 0.12, ease: [0.65, 0, 0.35, 1] }}
            />
            <motion.circle
              cx="74"
              cy="74"
              r="58"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.6"
              initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={reduced ? { duration: 0.01 } : { duration: 1.35, delay: 0.28, ease: [0.65, 0, 0.35, 1] }}
            />
          </svg>
          <motion.div
            initial={{ opacity: 0, scale: reduced ? 1 : 0.78, filter: reduced ? "blur(0px)" : "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={reduced ? { duration: 0.2 } : { duration: 0.95, delay: 0.08, ease: EASE }}
          >
            <Image
              src={iconLogo}
              alt=""
              width={161}
              height={160}
              priority
              unoptimized
              className="h-[78px] w-[78px] object-contain"
            />
          </motion.div>
        </div>

        <div className="mt-8 overflow-hidden">
          <motion.div
            initial={{ y: reduced ? 0 : "115%", opacity: reduced ? 0 : 1 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={reduced ? { duration: 0.2 } : { duration: 0.85, delay: 0.62, ease: EASE }}
          >
            <Image
              src={wordmark}
              alt="Celeste"
              width={494}
              height={88}
              priority
              unoptimized
              className="h-9 w-auto sm:h-11"
            />
          </motion.div>
        </div>

        <motion.div
          aria-hidden
          className="mt-5 h-px bg-white"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 56, opacity: 0.85 }}
          transition={reduced ? { duration: 0.15 } : { duration: 0.7, delay: 1.15, ease: EASE }}
        />
      </motion.div>

      <motion.button
        type="button"
        onClick={skip}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0.05 : 0.75, duration: 0.4 }}
        className="absolute bottom-8 text-[11px] font-medium uppercase tracking-[0.32em] text-white/45 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        Skip
      </motion.button>
    </motion.div>
  );
}
