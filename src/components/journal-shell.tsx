"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "../app/actions/auth";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "./ui/dialog";

export function JournalShell({ account, children }: { account: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  function navigation() {
    return <>
      <div className="brand">Tracking Food<span>Lični dnevnik</span></div>
      <nav aria-label="Glavna navigacija">{[["/meals", "Obroci"], ["/symptoms", "Simptomi"], ["/foods", "Namirnice"]].map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "nav-link nav-active" : "nav-link"} onClick={() => setOpen(false)}>{label}</Link>)}</nav>
      <div className="account"><p>{account}</p><form action={logout}><button className="secondary" type="submit">Odjavi se</button></form></div>
    </>;
  }
  return <div className="journal-shell">
    <a className="skip-link" href="#main">Preskoči na sadržaj</a>
    <aside className="desktop-sidebar">{navigation()}</aside>
    <header className="mobile-header">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><button className="icon-button" aria-label="Otvori meni"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button></DialogTrigger>
        <DialogContent className="navigation-drawer">
          <DialogTitle className="sr-only">Navigacija</DialogTitle><DialogDescription className="sr-only">Dnevnik i nalog</DialogDescription>
          <DialogClose className="icon-button drawer-close" aria-label="Zatvori meni">×</DialogClose>
          {navigation()}
        </DialogContent>
      </Dialog>
      <span className="font-semibold">Tracking Food</span>
    </header>
    <main id="main" className="journal-main">{children}</main>
  </div>;
}
