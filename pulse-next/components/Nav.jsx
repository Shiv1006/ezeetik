"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { Logo } from "./Ui";
import { Compass, Plus, House, ClipboardList, UserRound } from "lucide-react";

export default function Nav() {
  const path = usePathname() || "/";
  const { session, authModal } = useApp();
  const on = (href) => (path === href ? "on" : "");
  return (
    <div className="nav-shell">
      <nav className="nav">
        <div className="nav-in">
          <Link className="logo" href="/"><span className="brand-logo"><Logo /></span></Link>
          <div className="nav-links">
            <Link href="/discover" className={on("/discover")}><Compass size={15} /> Explore</Link>
            <Link href="/dashboard" className={on("/dashboard")}><ClipboardList size={15} /> My surveys</Link>
          </div>
          <div className="nav-right">
            {/* <button className="icon-btn" onClick={toggleDark} title="Toggle dark mode">{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button> */}
            {session ? (
              <Link href={`/profile/${encodeURIComponent(session.name)}`} className="me-chip"><i>{session.name[0] || "?"}</i>{session.name}</Link>
            ) : (
              <button className="btn btn-g btn-s hide-m" onClick={() => authModal("in")}>Sign in</button>
            )}
            <Link className="btn btn-k btn-s" href="/create"><Plus size={16} /> Create</Link>
          </div>
        </div>
      </nav>
    </div>
  );
}

export function TabBar() {
  const path = usePathname() || "/";
  const { session, authModal } = useApp();
  const on = (href) => (path === href ? "on" : "");
  return (
    <nav className="tabbar">
      <Link href="/" className={on("/")}><House size={21} /><span>Home</span></Link>
      <Link href="/discover" className={on("/discover")}><Compass size={21} /><span>Explore</span></Link>
      <Link href="/create" className="plus"><Plus size={24} /></Link>
      <Link href="/dashboard" className={on("/dashboard")}><ClipboardList size={21} /><span>Mine</span></Link>
      {session ? (
        <Link href={`/profile/${encodeURIComponent(session.name)}`}><UserRound size={21} /><span>You</span></Link>
      ) : (
        <a href="#" onClick={(e) => { e.preventDefault(); authModal("in"); }}><UserRound size={21} /><span>Sign in</span></a>
      )}
    </nav>
  );
}
