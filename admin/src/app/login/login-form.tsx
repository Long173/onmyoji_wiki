'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { createSupabaseBrowser } from '@/lib/supabase/client';

type Mode = 'password' | 'otp-email' | 'otp-code';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialReason = params.get('reason');

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: e1 } = await createSupabaseBrowser().auth.signInWithPassword(
      { email: email.trim(), password },
    );
    setBusy(false);
    if (e1) {
      setError(e1.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: e1 } = await createSupabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (e1) {
      setError(e1.message);
      return;
    }
    setMode('otp-code');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: e1 } = await createSupabaseBrowser().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (e1) {
      setError(e1.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <div className="card p-8">
        <h1 className="mb-2 text-2xl font-bold text-[var(--color-brand-gold)]">
          Onmyoji Wiki Admin
        </h1>
        <p className="mb-6 text-sm text-white/60">
          {mode === 'password' && 'Login bằng email + password.'}
          {mode === 'otp-email' && 'Gửi 6-digit code đến email.'}
          {mode === 'otp-code' && `Code đã gửi đến ${email}.`}
        </p>

        {initialReason === 'forbidden' && (
          <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            Email này không có trong allowlist.
          </p>
        )}
        {initialReason === 'callback_failed' && (
          <p className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            Magic link đã hết hạn / bị scanner pre-click. Dùng password hoặc
            6-digit code.
          </p>
        )}

        {mode === 'password' && (
          <form onSubmit={submitPassword} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm">Email</span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary hover:btn-primary-hover w-full disabled:opacity-50"
            >
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('otp-email');
                setError(null);
              }}
              className="block w-full text-center text-xs text-white/50 hover:text-white"
            >
              Quên password? Dùng 6-digit code qua email →
            </button>
          </form>
        )}

        {mode === 'otp-email' && (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm">Email</span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary hover:btn-primary-hover w-full disabled:opacity-50"
            >
              {busy ? 'Đang gửi...' : 'Gửi code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('password');
                setError(null);
              }}
              className="block w-full text-center text-xs text-white/50 hover:text-white"
            >
              ← Quay lại login bằng password
            </button>
          </form>
        )}

        {mode === 'otp-code' && (
          <form onSubmit={verifyCode} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm">6-digit code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/[^0-9]/g, ''))
                }
                className="input-field text-center font-mono text-2xl tracking-[0.5em]"
                placeholder="------"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('otp-email');
                  setCode('');
                  setError(null);
                }}
                className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/5"
              >
                ← Đổi email
              </button>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="btn-primary hover:btn-primary-hover flex-1 disabled:opacity-50"
              >
                {busy ? 'Đang xác thực...' : 'Vào portal'}
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
