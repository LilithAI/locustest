import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        main: 'var(--main)',
        overlay: 'var(--overlay)',
        bg: 'var(--bg)',
        bw: 'var(--bw)',
        blank: 'var(--blank)',
        ntext: 'var(--ntext)',
        mtext: 'var(--mtext)',
        nborder: 'var(--nborder)',
        "color-1": "hsl(var(--color-1))",
        "color-2": "hsl(var(--color-2))",
        "color-3": "hsl(var(--color-3))",
        "color-4": "hsl(var(--color-4))",
        "color-5": "hsl(var(--color-5))",
        stats: {
          DEFAULT: "hsl(var(--stats-bg))",
          foreground: "hsl(var(--stats-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        base: '5px',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        shadow: 'var(--shadow)',
      },
      translate: {
        boxShadowX: '4px',
        boxShadowY: '4px',
        reverseBoxShadowX: '-4px',
        reverseBoxShadowY: '-4px',
      },
      fontWeight: {
        base: '500',
        heading: '700',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        rainbow: {
          "0%": { "background-position": "0%" },
          "100%": { "background-position": "200%" },
        },
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-3px, 2px)" },
          "40%": { transform: "translate(3px, -2px)" },
          "60%": { transform: "translate(-2px, -1px)" },
          "80%": { transform: "translate(2px, 1px)" },
          "100%": { transform: "translate(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rit-glitch": {
          "0%,100%": { transform: "translate(0,0)", clipPath: "inset(0 0 0 0)" },
          "10%": { transform: "translate(-1.5px,1px)", clipPath: "inset(10% 0 60% 0)" },
          "25%": { transform: "translate(2px,-1px)", clipPath: "inset(40% 0 20% 0)" },
          "40%": { transform: "translate(-1px,-2px)", clipPath: "inset(70% 0 5% 0)" },
          "55%": { transform: "translate(2px,1.5px)", clipPath: "inset(20% 0 50% 0)" },
          "70%": { transform: "translate(-2px,0)", clipPath: "inset(55% 0 25% 0)" },
          "85%": { transform: "translate(1px,-1px)", clipPath: "inset(5% 0 75% 0)" },
        },
        "rit-pill-shimmer": {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "60%,100%": { transform: "translateX(220%) skewX(-20deg)" },
        },
        "rit-icon-pulse": {
          "0%,100%": { transform: "scale(1) rotate(-2deg)", opacity: "0.85" },
          "50%": { transform: "scale(1.08) rotate(2deg)", opacity: "1" },
        },
        "rit-dot-bounce": {
          "0%,80%,100%": { transform: "translateY(0)", opacity: "0.4" },
          "40%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "rit-idle-tic": {
          "0%,92%,100%": { transform: "translate(0,0)", clipPath: "inset(0 0 0 0)" },
          "94%": { transform: "translate(-2px,1px)", clipPath: "inset(30% 0 40% 0)" },
          "96%": { transform: "translate(2px,-1px)", clipPath: "inset(60% 0 10% 0)" },
          "98%": { transform: "translate(-1px,0)", clipPath: "inset(15% 0 65% 0)" },
        },
        "rit-border-sweep": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        rainbow: "rainbow var(--speed, 2s) infinite linear",
        glitch: "glitch 0.3s infinite",
        "fade-in": "fade-in 0.3s ease-out both",
        "rit-glitch": "rit-glitch 600ms steps(8,end) 1",
        "rit-glitch-loop": "rit-glitch 700ms steps(8,end) infinite",
        "rit-pill-shimmer": "rit-pill-shimmer 3.5s ease-in-out infinite",
        "rit-icon-pulse": "rit-icon-pulse 2.4s ease-in-out infinite",
        "rit-dot-bounce": "rit-dot-bounce 600ms ease-in-out infinite",
        "rit-idle-tic": "rit-idle-tic 8s steps(12,end) infinite",
        "rit-border-sweep": "rit-border-sweep 3s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
