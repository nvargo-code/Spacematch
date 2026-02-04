"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Search, Plus, MessageSquare, Menu } from "lucide-react";
import { useState } from "react";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  const { user, firebaseUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-background font-bold text-lg">S</span>
            </div>
            <span className="font-semibold text-lg text-foreground hidden sm:block">
              SpaceMatch
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/search"
              className="text-muted hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Search size={18} />
              Search
            </Link>
            {firebaseUser && (
              <>
                <Link
                  href="/post/new"
                  className="text-muted hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Post
                </Link>
                <Link
                  href="/messages"
                  className="text-muted hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <MessageSquare size={18} />
                  Messages
                </Link>
              </>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {firebaseUser ? (
              <Link href="/profile">
                <Avatar
                  src={user?.photoURL}
                  alt={user?.displayName || "Profile"}
                  size="sm"
                />
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-muted hover:text-foreground"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
