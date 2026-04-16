"use client";

import { useState, useEffect, useCallback } from "react";
import { Joyride, STATUS, EVENTS, ACTIONS } from "react-joyride";
import type { Step, EventData } from "react-joyride";
import { HelpCircle, X } from "lucide-react";
import { getSessionRole, checkFirstTimeLogin, updateFirstTimeLoginAction } from "@/app/actions/session";

/* ─────────────────────────────────────────────
   Helper: build a Step with skipBeacon
───────────────────────────────────────────── */
function s(target: string, title: string, content: string, placement: Step["placement"] = "right"): Step {
  return { target, title, content, placement, skipBeacon: true };
}

/* ─────────────────────────────────────────────
   Step definitions
───────────────────────────────────────────── */
const WELCOME: Step = s("body", "Welcome to MV Portal!", "Let's take a quick tour of all the features available to you. Click Next to begin, or skip any time.", "center");
const FINISH: Step  = s("body", "You're all set!", "You've seen everything! The ﹖ button at the bottom-right restarts this tour whenever you need it.", "center");

function buildSteps(role: string): Step[] {
  const isHROrAdmin = role?.includes("HR") || role?.includes("Admin");
  const isAdmin = role?.includes("Admin");

  const steps: Step[] = [WELCOME];

  // View Profile step
  steps.push(s("[data-tour='profile-card']", "Your Profile", "Click here anytime to view and edit your personal information, employment details, and manage your account settings."));

  // Always visible
  steps.push(s("[data-tour='dashboard']",  "Dashboard",          "Your command centre. Get a real-time snapshot of leave balances, upcoming holidays, and key HR metrics."));
  steps.push(s("[data-tour='leaves']",     "Leaves",              "Apply for leaves, track your balance, and view your history — all in one place."));
  steps.push(s("[data-tour='holidays']",   "Holidays",           "Browse the company holiday calendar so you can plan your work and time off."));
  steps.push(s("[data-tour='handbook']",   "Handbook",           "Access HR policies, company guidelines, and important documents whenever you need them."));

  // HR / Admin only
  if (isHROrAdmin) {
    steps.push(s("[data-tour='employees']", "Employees",          "Manage all employee profiles, update employment details, and handle onboarding."));
    steps.push(s("[data-tour='assets']",    "Assets",             "Track company assets assigned to employees — laptops, phones, and more."));
    steps.push(s("[data-tour='payroll']",   "Payroll",            "Process payroll, manage payslips, and configure salary components for your team."));
  }

  // Always visible (positioned after Payroll)
  steps.push(s("[data-tour='my-payrolls']", "My Payslips",       "Download and review your monthly payslips and payroll details securely."));

  // HR / Admin only
  if (isHROrAdmin) {
    steps.push(s("[data-tour='nda']",       "Document Manager",  "Create, send, and manage NDAs and other employee documents digitally."));
  }

  // Admin only
  if (isAdmin) {
    steps.push(s("[data-tour='admin']",     "Admin Console",     "Full control over system configurations, email templates, leave rules, user access, and more."));
  }

  steps.push(FINISH);
  return steps;
}

/* ─────────────────────────────────────────────
   Custom Tooltip component
───────────────────────────────────────────── */
function CustomTooltip(props: any) {
  const {
    index,
    step,
    tooltipProps,
    primaryProps,
    backProps,
    closeProps,
    skipProps,
    size,
    isLastStep,
  } = props;

  return (
    <div
      {...tooltipProps}
      className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-w-[340px] w-[90vw] relative"
      style={{ zIndex: 10000 }}
    >

      {/* Step counter pill */}
      <div className="mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          {index + 1} / {size}
        </span>
      </div>

      {/* Title */}
      {step.title && (
        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
          {step.title}
        </h3>
      )}

      {/* Content */}
      <p className="text-sm text-slate-600 leading-relaxed mb-5">
        {step.content}
      </p>

      {/* Progress dots */}
      {size > 1 && (
        <div className="flex items-center gap-1.5 mb-4">
          {Array.from({ length: size }).map((_: unknown, i: number) => (
            <span
              key={i}
              className={`block rounded-full transition-all duration-300 ${
                i === index ? "w-5 h-1.5 bg-blue-500" : "w-1.5 h-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          {...skipProps}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 hover:border-red-300 hover:text-red-600 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="12" width="12" fill="currentColor">
            <path d="M11.475 12.890625 3.109375 4.525C2.409375 5.503125 2 6.703125 2 8c0 3.3125 2.6875 6 6 6 1.296875 0 2.496875 -0.409375 3.475 -1.109375zm1.415625 -1.415625C13.590625 10.496875 14 9.296875 14 8c0 -3.3125 -2.6875 -6 -6 -6 -1.296875 0 -2.496875 0.409375 -3.475 1.109375l8.365625 8.365625zM0 8a8 8 0 1 1 16 0 8 8 0 1 1 -16 0z" strokeWidth="0.0313" />
          </svg>
          Skip tour
        </button>

        <div className="flex gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition shadow-md shadow-blue-200"
          >
            {isLastStep ? "Finish 🎉" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main AppTour
───────────────────────────────────────────── */

export function AppTour() {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Call the Server Action — verifySession() runs server-side, returns the role
  useEffect(() => {
    getSessionRole()
      .then((role) => {
        setSteps(buildSteps(role ?? ''));
      })
      .catch(() => {
        // fallback: base steps only
        setSteps(buildSteps(''));
      });
  }, []);

  // Trigger from everywhere via custom event (e.g. after onboarding)
  useEffect(() => {
    const handleAutoStart = () => {
      if (steps.length > 0 && mounted) {
        setStepIndex(0);
        setRun(true);
        window.dispatchEvent(new CustomEvent('mv:tour:start'));
      }
    };
    
    window.addEventListener('mv:tour:autostart', handleAutoStart);
    
    // Auto-start tour on first-time after onboarding or first-time login
    if (steps.length > 0 && mounted) {
      checkFirstTimeLogin().then((isFirstTime) => {
        const isClientFirstTime = localStorage.getItem('mv:onboarding:completed') === 'true';
        if (isFirstTime || isClientFirstTime) {
          setTimeout(() => {
            handleAutoStart();
            localStorage.removeItem('mv:onboarding:completed'); // Clear flag after starting tour
          }, 1000);
        }
      });
    }
    
    return () => window.removeEventListener('mv:tour:autostart', handleAutoStart);
  }, [steps.length, mounted]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
    // Tell sidebar to open on mobile
    window.dispatchEvent(new CustomEvent('mv:tour:start'));
  }, []);

  const handleEvent = useCallback((data: EventData) => {
    const { status, type, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      // Tell sidebar to close on mobile
      window.dispatchEvent(new CustomEvent('mv:tour:end'));

      // If it's a first-time login, show google integration modal
      checkFirstTimeLogin().then((isFirstTime) => {
        if (isFirstTime) {
          window.dispatchEvent(new CustomEvent('mv:google:auth:firsttime'));
          updateFirstTimeLoginAction(false); // Clear it so it doesn't restart the tour if they redirect!
        }
      });
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex((prev) => (action === ACTIONS.PREV ? prev - 1 : prev + 1));
    }
  }, []);

  if (!mounted) return null;

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous={true}
        tooltipComponent={CustomTooltip}
        onEvent={handleEvent}
      />

      {/* Floating restart button */}
      <button
        onClick={startTour}
        title="Start tour"
        className="fixed bottom-6 right-6 z-[9998] w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
        aria-label="Start guided tour"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="absolute right-14 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
          Take a tour
        </span>
      </button>
    </>
  );
}
