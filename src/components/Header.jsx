"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { HiBars3, HiXMark, HiOutlineSun, HiOutlineMoon } from "react-icons/hi2";
import { IoColorPaletteOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import ThemeChange from "./ThemeChange";
import SignInPage from "@/app/(public)/sign-in/page";
import SignUpPage from "@/app/(public)/signup/page";
import { changeTheme } from "@/redux/slices/themeSlice";
import useAuth from "@/hooks/useAuth";

function SearchParamsHandler({ onModalChange }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const modal = searchParams?.get("modal");
    if (modal === "signin" || modal === "signup") {
      onModalChange(modal);
    }
  }, [searchParams, onModalChange]);

  return null;
}

export function SpendScopeLogo({ className = "w-8 h-8", color }) {
  const themeState = useSelector((state) => state?.themeSlice);
  const primary = color || themeState?.tokens?.homeAccent || "#C88856";

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 36 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <rect
          x="5"
          y="2"
          width="23"
          height="11"
          rx="3"
          fill={primary}
          fillOpacity="0.45"
          stroke="white"
          strokeWidth="1"
        />
        <rect x="2" y="7" width="32" height="23" rx="6" fill={primary} />
        <path
          d="M3 13.5C3 11 5 9 8 9H28C31 9 33 11 33 13.5"
          stroke="white"
          strokeOpacity="0.3"
          strokeWidth="1.2"
        />
        <path
          d="M23 13.5H32.5C33.6 13.5 34.5 14.4 34.5 15.5V21.5C34.5 22.6 33.6 23.5 32.5 23.5H23C21.6 23.5 20.5 22.4 20.5 21V16C20.5 14.6 21.6 13.5 23 13.5Z"
          fill={primary}
          stroke="white"
          strokeWidth="1.2"
        />
        <circle cx="26.5" cy="18.5" r="1.8" fill="white" />
      </svg>
    </div>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { isAuthenticated, continueAsGuest } = useAuth();
  const themeState = useSelector((state) => state?.themeSlice);
  const isDark = themeState?.mode === "dark";
  const isLanding = pathname === "/" || pathname === "/landing";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [activeSection, setActiveSection] = useState(isLanding ? "home" : null);

  const handleOpenAuthModal = useCallback((modalType) => {
    if (modalType === "signin") {
      setShowSignInModal(true);
      setShowSignUpModal(false);
    } else if (modalType === "signup") {
      setShowSignUpModal(true);
      setShowSignInModal(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkParams = () => {
      const params = new URLSearchParams(window.location.search);
      const modal = params.get("modal");
      if (modal === "signin") {
        setShowSignInModal(true);
        setShowSignUpModal(false);
      } else if (modal === "signup") {
        setShowSignUpModal(true);
        setShowSignInModal(false);
      }
    };
    const handleAuthEvent = (e) => {
      const mode =
        typeof e.detail === "string" ? e.detail : e.detail?.mode || "signup";
      handleOpenAuthModal(mode);
    };
    checkParams();
    window.addEventListener("popstate", checkParams);
    window.addEventListener("open-auth-modal", handleAuthEvent);
    return () => {
      window.removeEventListener("popstate", checkParams);
      window.removeEventListener("open-auth-modal", handleAuthEvent);
    };
  }, [handleOpenAuthModal]);

  const clearModalParam = useCallback(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("modal")) {
        url.searchParams.delete("modal");
        const cleanUrl =
          url.pathname + (url.search ? url.search : "") + (url.hash || "");
        window.history.replaceState(null, "", cleanUrl);
        router.replace(cleanUrl, { scroll: false });
      }
    }
  }, [router]);

  const handleCloseSignIn = useCallback(() => {
    setShowSignInModal(false);
    clearModalParam();
  }, [clearModalParam]);

  const handleCloseSignUp = useCallback(() => {
    setShowSignUpModal(false);
    clearModalParam();
  }, [clearModalParam]);

  const handleSwitchToSignUp = useCallback(() => {
    setShowSignInModal(false);
    setShowSignUpModal(true);
  }, []);

  const handleSwitchToSignIn = useCallback(() => {
    setShowSignUpModal(false);
    setShowSignInModal(true);
  }, []);

  const navLinks = [
    { id: "home", label: "Home", href: "/#home" },
    { id: "calculators", label: "Calculators", href: "/#calculators" },
    { id: "features", label: "Features", href: "/#features" },
    { id: "about", label: "About", href: "/#about" },
  ];

  useEffect(() => {
    const sections = [
      { id: "home", navId: "home" },
      { id: "calculators", navId: "calculators" },
      { id: "categories", navId: "features" },
      { id: "features", navId: "features" },
      { id: "about", navId: "about" },
    ];

    const handleScrollAndSpy = () => {
      const scrollY = window.scrollY;
      setIsFixed(scrollY > 12);

      if (!isLanding) {
        setActiveSection(null);
        return;
      }

      const atBottom =
        window.innerHeight + scrollY >=
        document.documentElement.scrollHeight - 24;
      if (atBottom) {
        setActiveSection("about");
        return;
      }

      const scrollPosition = scrollY + 140;
      let current = "home";

      for (const { id, navId } of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top + scrollY;
          if (scrollPosition >= top) {
            current = navId;
          }
        }
      }

      setActiveSection(current);
    };

    handleScrollAndSpy();
    window.addEventListener("scroll", handleScrollAndSpy, { passive: true });
    window.addEventListener("resize", handleScrollAndSpy, { passive: true });
    window.addEventListener("hashchange", handleScrollAndSpy);
    return () => {
      window.removeEventListener("scroll", handleScrollAndSpy);
      window.removeEventListener("resize", handleScrollAndSpy);
      window.removeEventListener("hashchange", handleScrollAndSpy);
    };
  }, [isLanding]);

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsHandler onModalChange={handleOpenAuthModal} />
      </Suspense>
      <header
        className={`fixed top-0 left-0 right-0 w-full z-40 transition-all duration-200 border-b border-[var(--home-border)] ${
          isFixed
            ? "shadow-md backdrop-blur-md bg-[var(--home-card)]/95"
            : "bg-[var(--home-card)]/90 backdrop-blur-sm"
        }`}
      >
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <SpendScopeLogo className="w-8 h-8 group-hover:scale-105 transition-transform" />
            <span className="font-display text-[22px] tracking-tight flex items-center">
              <span className="text-[var(--home-accent)]">Spend</span>
              <span className="text-[var(--home-text)]">Scope</span>
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setActiveSection(link.id)}
                  className={`flex flex-col items-center text-sm font-semibold transition-colors py-1 ${
                    isActive
                      ? "text-[var(--home-accent)]"
                      : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
                  }`}
                >
                  <span>{link.label}</span>
                  <span
                    className={`w-5 h-[2.5px] rounded-full mt-1 transition-opacity ${
                      isActive ? "opacity-100 bg-[var(--home-accent)]" : "opacity-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right CTA & Theme Controls (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => dispatch(changeTheme(isDark ? "light" : "dark"))}
              className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer"
              aria-label="Toggle Light/Dark theme"
            >
              {isDark ? (
                <HiOutlineSun className="w-4 h-4" />
              ) : (
                <HiOutlineMoon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setThemeModalOpen((o) => !o)}
              className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer"
              aria-label="Open theme selector"
            >
              <IoColorPaletteOutline className="w-4 h-4" />
            </button>

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold px-5 py-2 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] shadow-sm hover:opacity-95 transition-opacity"
              >
                Open Workspace →
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowSignInModal(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] hover:border-[var(--home-accent)] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="text-sm font-semibold px-5 py-2 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Continue as Guest
                </button>
              </>
            )}
          </div>

          {/* Mobile & Tablet Controls */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(changeTheme(isDark ? "light" : "dark"))}
              className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center text-[var(--home-text)] cursor-pointer"
              aria-label="Toggle Light/Dark theme"
            >
              {isDark ? (
                <HiOutlineSun className="w-4 h-4" />
              ) : (
                <HiOutlineMoon className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={continueAsGuest}
              className="hidden xs:inline-flex text-xs font-semibold px-3 py-2 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] cursor-pointer"
            >
              Open App
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <HiXMark className="w-5 h-5" />
              ) : (
                <HiBars3 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--home-border)] bg-[var(--home-card)] px-5 py-4 space-y-2.5 shadow-lg">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => {
                    setActiveSection(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`block font-semibold text-sm py-2 px-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-[var(--home-track)] text-[var(--home-accent)]"
                      : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:bg-[var(--home-background)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-[var(--home-border)] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  continueAsGuest();
                }}
                className="w-full py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold cursor-pointer"
              >
                Continue as Guest
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSignInModal(true);
                }}
                className="w-full py-2 rounded-full border border-[var(--home-border)] text-sm font-semibold text-[var(--home-text)] cursor-pointer"
              >
                Sign In / Cloud Backup
              </button>
            </div>
          </div>
        )}

        {themeModalOpen && (
          <ThemeChange handleClose={() => setThemeModalOpen(false)} />
        )}

        {showSignInModal && (
          <SignInPage
            isModal
            onClose={handleCloseSignIn}
            onSwitchToSignUp={handleSwitchToSignUp}
          />
        )}

        {showSignUpModal && (
          <SignUpPage
            isModal
            onClose={handleCloseSignUp}
            onSwitchToSignIn={handleSwitchToSignIn}
          />
        )}
      </header>
      <div className="h-16 w-full shrink-0" aria-hidden="true" />
    </>
  );
}
