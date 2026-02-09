"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { signOut } from "@/lib/firebase/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { X, Home, Search, Plus, MessageSquare, User, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, firebaseUser } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const menuItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/feed?type=community", icon: Users, label: "Community" },
    ...(firebaseUser
      ? [
          { href: "/post/new", icon: Plus, label: "Create Post" },
          { href: "/messages", icon: MessageSquare, label: "Messages" },
          { href: "/profile", icon: User, label: "Profile" },
        ]
      : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Menu panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-card border-l border-border transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-semibold text-foreground">Menu</span>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* User info */}
        {firebaseUser && user && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar src={user.photoURL} alt={user.displayName} size="lg" />
              <div>
                <p className="font-medium text-foreground">{user.displayName}</p>
                <p className="text-sm text-muted">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-background transition-colors"
                >
                  <item.icon size={20} className="text-muted" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          {firebaseUser ? (
            <Button
              variant="ghost"
              fullWidth
              onClick={handleSignOut}
              className="justify-start gap-3"
            >
              <LogOut size={20} />
              Sign out
            </Button>
          ) : (
            <div className="space-y-2">
              <Link href="/login" onClick={onClose}>
                <Button variant="secondary" fullWidth>
                  Log in
                </Button>
              </Link>
              <Link href="/signup" onClick={onClose}>
                <Button fullWidth>Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
