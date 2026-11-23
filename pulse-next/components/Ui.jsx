"use client";
import { useEffect } from "react";
import { useApp } from "@/lib/app-context";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
  Circle,
  Copy,
  GripVertical,
  Hash,
  LockKeyhole,
  Mail,
  Pencil,
  Trash2,
  Type,
  X,
  Star,
} from "lucide-react";

const ICONS = {
  alert: AlertTriangle,
  lock: LockKeyhole,
  check: Check,
  circle: Circle,
  chevronDown: ChevronDown,
  text: Type,
  hash: Hash,
  mail: Mail,
  bars: BarChart3,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  copy: Copy,
  pencil: Pencil,
  trash: Trash2,
  grip: GripVertical,
  x: X,
  star: Star,
};

export function Icon({ name, size = 18, strokeWidth = 2, ...props }) {
  const Component = ICONS[name] || Circle;
  return <Component size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
}

export function Loading() {
  return (
    <div className="wrap page"><div className="empty"><div className="spinner" />Loading…</div></div>
  );
}

export function Fail({ error, onRetry }) {
  return (
    <div className="wrap page">
      <div className="card empty">
        <div className="big icon-status"><Icon name="alert" size={38} /></div>
        <b>Something went wrong</b>
        <p className="small" style={{ margin: ".5rem 0 1.2rem" }}>{String((error && error.message) || error)}</p>
        <button className="btn btn-k" onClick={onRetry}>Try again</button>
      </div>
    </div>
  );
}

export function NeedAuth({ msg }) {
  const { authModal } = useApp();
  useEffect(() => { authModal("in"); /* eslint-disable-next-line */ }, []);
  return (
    <div className="wrap page">
      <div className="card empty">
        <div className="big icon-status"><Icon name="lock" size={38} /></div>{msg}<br /><br />
        <button className="btn btn-p" onClick={() => authModal("in")}>Sign in / Sign up</button>
      </div>
    </div>
  );
}

export function Logo() {
  return (
    <Image
      src="/logo/Ezeetik%20Survey%20Insights%20Logo%20(1).png"
      alt="EzeeTik"
      width={1672}
      height={941}
      className="brand-image"
      unoptimized
    />
  );
}
