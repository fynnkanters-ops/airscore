'use client';

import type { ReactNode } from 'react';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">
        {label}
        {hint && <span style={{ color: 'var(--muted-fg)', fontWeight: 400 }}> {hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function NumInput({
  value, onChange, placeholder, min, max, step,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  min?: number; max?: number; step?: number;
}) {
  return (
    <input
      className="input-field"
      type="number"
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      min={min} max={max} step={step}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input className="input-field" type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} />
  );
}

export function Select<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select className="input-field" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Check({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
      {label}
    </label>
  );
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--muted)' }}>
      <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>{label}</div>
      <div className="text-lg font-bold" style={{ color: accent ? 'var(--accent)' : 'var(--foreground)' }}>{value}</div>
    </div>
  );
}
