"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { Home, Search, Plus, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { firebaseUser } = useAuth();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    ...(firebaseUser
      ? [
          { href: "/post/new", icon: Plus, label: "Post" },
          { href: "/matches", icon: Bell, label: "Matches" },
          { href: "/profile", icon: User, label: "Profile" },
        ]
      : [
          { href: "/login", icon: User, label: "Login" },
        ]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden">
      <div className="flex justify-around items-center h-16 px-4 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive ? "text-accent" : "text-muted hover:text-foreground"
              )}
            >
              <item.icon size={24} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
