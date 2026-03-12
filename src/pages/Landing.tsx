import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { motivationalQuotes } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Trophy, Clock, ChevronLeft, ChevronRight, Shield, Zap, BarChart3 } from "lucide-react";

const Landing = () => {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setQuoteIdx((i) => (i + 1) % motivationalQuotes.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    { icon: Brain, title: "Smart Quizzes", desc: "Randomized questions for fair assessment" },
    { icon: Clock, title: "Timed Tests", desc: "Real exam experience with countdown timer" },
    { icon: Shield, title: "Anti-Cheating", desc: "Tab switch detection & auto-submission" },
    { icon: BarChart3, title: "Track Progress", desc: "Detailed analytics and score history" },
    { icon: Trophy, title: "Instant Results", desc: "Get your score immediately after submission" },
    { icon: Zap, title: "Fast & Responsive", desc: "Works on any device, anywhere" },
  ];

  const steps = [
    { step: "01", title: "Login", desc: "Sign in with your enrollment number" },
    { step: "02", title: "Choose Quiz", desc: "Browse available quizzes" },
    { step: "03", title: "Take Test", desc: "Answer questions within time limit" },
    { step: "04", title: "Get Results", desc: "View your score and analytics" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <span className="font-heading text-2xl font-bold text-primary">QuizMaster</span>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm">Student Login</Button>
            </Link>
            <Link to="/admin/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground">Admin</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-[0.07]" />
        <div className="container relative py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <BookOpen className="h-4 w-4" /> Learning Platform
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
              Master Your Knowledge with{" "}
              <span className="text-primary">QuizMaster</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              A secure, timed quiz platform designed for students and educators. 
              Take quizzes, track progress, and achieve your learning goals.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gradient-hero text-primary-foreground px-8 text-lg" onClick={() => navigate("/login")}>
                Start Quiz →
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quotes Carousel */}
      <section className="border-y border-border bg-muted/50 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <motion.div
              key={quoteIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="mb-4 text-xl italic text-foreground md:text-2xl">
                "{motivationalQuotes[quoteIdx].text}"
              </p>
              <p className="text-sm font-medium text-primary">— {motivationalQuotes[quoteIdx].author}</p>
            </motion.div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => setQuoteIdx((i) => (i - 1 + motivationalQuotes.length) % motivationalQuotes.length)} className="rounded-full p-2 hover:bg-muted transition-colors">
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="flex gap-2">
                {motivationalQuotes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setQuoteIdx(i)}
                    className={`h-2 w-2 rounded-full transition-colors ${i === quoteIdx ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
              <button onClick={() => setQuoteIdx((i) => (i + 1) % motivationalQuotes.length)} className="rounded-full p-2 hover:bg-muted transition-colors">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Platform Features</h2>
            <p className="text-muted-foreground">Everything you need for effective learning assessment</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-lg border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">How It Works</h2>
            <p className="text-muted-foreground">Simple steps to start your learning journey</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full gradient-hero text-primary-foreground text-xl font-bold">
                  {s.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2024 QuizMaster. Built for better learning.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
