"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "./sections/HeroSection";
import CalculatorsSection from "./sections/CalculatorsSection";
import CategoriesSection from "./sections/CategoriesSection";
import FeaturesSection from "./sections/FeaturesSection";
import CTASection from "./sections/CTASection";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans antialiased bg-[var(--home-background)] text-[var(--home-text)] overflow-x-hidden">
      <Header />
      <main className="flex-1 overflow-x-hidden">
        <HeroSection />
        <CalculatorsSection />
        <CategoriesSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
