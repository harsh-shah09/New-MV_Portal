'use client';

import { useState } from 'react';
import { Cloud, ChevronDown, Zap, Shield, Globe, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

type OrgType = 'production' | 'sandbox' | 'custom';

const ORG_TYPES: { value: OrgType; label: string; desc: string; domain: string; color: string }[] = [
  {
    value: 'production',
    label: 'Production',
    desc: 'Live Salesforce environment',
    domain: 'login.salesforce.com',
    color: 'from-blue-500 to-blue-600',
  },
  {
    value: 'sandbox',
    label: 'Sandbox',
    desc: 'Testing & development environment',
    domain: 'test.salesforce.com',
    color: 'from-amber-500 to-orange-500',
  },
  {
    value: 'custom',
    label: 'Custom Domain',
    desc: 'My Domain / scratch org',
    domain: 'yourdomain.my.salesforce.com',
    color: 'from-violet-500 to-purple-600',
  },
];

export default function SalesforceConnectPage() {
  const [orgType, setOrgType] = useState<OrgType>('production');
  const [customDomain, setCustomDomain] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull error from URL if redirected back from callback
  if (typeof window !== 'undefined') {
    const urlError = new URLSearchParams(window.location.search).get('error');
    if (urlError && !error) setError(decodeURIComponent(urlError));
  }

  const selected = ORG_TYPES.find((o) => o.value === orgType)!;

  const handleConnect = () => {
    if (orgType === 'custom' && !customDomain.trim()) {
      setError('Please enter your custom domain before connecting.');
      return;
    }
    setError(null);
    setConnecting(true);
    const params = new URLSearchParams({ orgType });
    if (orgType === 'custom') params.set('customDomain', customDomain.trim());
    window.location.href = `/api/salesforce/connect?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-4">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Connect Salesforce</h1>
          <p className="text-slate-400 mt-2 text-sm text-center max-w-xs">
            Link your Salesforce org to power the HRMS portal with live data
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Org Type Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Login Environment</label>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${selected.color} shrink-0`} />
                  <div className="text-left">
                    <div className="font-semibold text-sm">{selected.label}</div>
                    <div className="text-xs text-slate-400">{selected.domain}</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute z-20 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  {ORG_TYPES.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setOrgType(opt.value);
                        setDropdownOpen(false);
                        setError(null);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition text-left ${
                        orgType === opt.value ? 'bg-blue-600/20' : ''
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${opt.color} shrink-0`} />
                      <div>
                        <div className="font-medium text-white text-sm">{opt.label}</div>
                        <div className="text-xs text-slate-400">{opt.desc}</div>
                      </div>
                      {orgType === opt.value && <CheckCircle2 className="w-4 h-4 text-blue-400 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom domain input */}
          {orgType === 'custom' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">My Domain URL</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50">
                <span className="px-3 text-slate-500 text-sm select-none">https://</span>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="yourdomain.my.salesforce.com"
                  className="flex-1 bg-transparent py-3.5 pr-4 text-white text-sm outline-none placeholder:text-slate-600"
                />
              </div>
              <p className="text-slate-500 text-xs mt-1.5">
                Enter the domain without <code className="text-slate-400">https://</code>
              </p>
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Salesforce…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Connect with Salesforce
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Feature bullets */}
          <div className="mt-7 space-y-2.5">
            {[
              { icon: Shield, text: 'OAuth 2.0 — No credentials stored here' },
              { icon: Zap, text: 'Automatic token refresh — stays connected' },
              { icon: Globe, text: 'Works with any Salesforce org edition' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-slate-400 text-xs">
                <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Powered by{' '}
          <span className="text-slate-400 font-semibold">MV Clouds HRMS</span>
        </p>
      </div>
    </div>
  );
}
