"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, HeartPulse, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const benefits = [
  {
    title: "Know what to expect",
    description: "See your current phase, next period estimate, and fertile-window timing in one view.",
    icon: CalendarClock,
    href: "/calendar",
  },
  {
    title: "Understand your patterns",
    description: "Track symptoms and mood in seconds, then get easy-to-read insights.",
    icon: Sparkles,
    href: "/ai-assistant",
  },
  {
    title: "Feel supported",
    description: "Share selected updates with one trusted partner when you want extra support.",
    icon: Users,
    href: "/partner",
  },
];

export function LandingHero() {
  return (
    <main className="flex min-h-[100svh] flex-col overflow-hidden">
      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:gap-10 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="grid gap-5 lg:gap-6 xl:grid-cols-[1.1fr_0.9fr]"
        >
          <Card className="overflow-hidden p-0">
            <div className="relative h-full p-6 sm:p-8 lg:p-10">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
              <div className="relative space-y-6">
                <Badge className="w-fit">Simple cycle tracking</Badge>
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.32em] text-muted">Ember period tracker</p>
                  <h1 className="display-balance max-w-3xl font-display text-4xl leading-[0.96] text-foreground sm:text-6xl xl:text-7xl">
                    Understand your cycle with clarity, not confusion.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-muted sm:text-lg sm:leading-8">
                    Ember helps you log periods, symptoms, and moods in a clean way, so you can spot
                    patterns early and take better care of your health with confidence.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button asChild size="lg">
                    <Link href="/login">
                      Start tracking now
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#why-ember">Why use Ember</Link>
                  </Button>
                </div>
                <div className="rounded-[24px] border border-line/70 bg-card-strong p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Why people stay</p>
                  <p className="mt-2 text-sm leading-7 text-muted sm:text-base">
                    Clean tracking, helpful reminders, and easy-to-read cycle insights without the clutter.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.08 }}
            className="grid gap-6"
            id="why-ember"
          >
            <Card className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Why use Ember</p>
                  <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">Made for real life</h2>
                </div>
                <div className="rounded-full bg-secondary/12 p-3 text-secondary">
                  <HeartPulse className="size-5" />
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                {benefits.map(({ title, description, icon: Icon, href }, index) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.16 + index * 0.08 }}
                  >
                    <Link
                      href={href}
                      className="group block rounded-[24px] border border-line/70 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card-strong"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/12 p-3 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{title}</p>
                          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
                          <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                            Explore
                            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </Card>

            <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
              <div className="rounded-[24px] bg-card-strong p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Start in minutes</p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  Log your last period date and get a clear cycle timeline right away.
                </p>
              </div>
              <div className="rounded-[24px] bg-card-strong p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Built for daily use</p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  Keep check-ins quick so you can stay consistent without feeling overwhelmed.
                </p>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </section>
      <footer className="mx-auto w-full max-w-7xl px-4 pb-6 text-center text-[11px] uppercase tracking-[0.14em] text-muted sm:px-6 sm:pb-8 lg:px-8">
        All rights are reserved. Copyright 2026-27. Created with love in Noida.
      </footer>
    </main>
  );
}
