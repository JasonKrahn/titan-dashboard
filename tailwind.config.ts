import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "0.75rem", sm: "1.5rem" },
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
          emphasis: "hsl(var(--border-emphasis))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          panel: "hsl(var(--surface-panel))",
          elevated: "hsl(var(--surface-elevated))",
          inset: "hsl(var(--surface-inset))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
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
        icon: {
          primary: {
            DEFAULT: "hsl(var(--icon-primary))",
            foreground: "hsl(var(--icon-primary-foreground))",
            border: "hsl(var(--icon-primary-border))",
          },
          muted: {
            DEFAULT: "hsl(var(--icon-muted))",
            foreground: "hsl(var(--icon-muted-foreground))",
            border: "hsl(var(--icon-muted-border))",
          },
          ready: {
            DEFAULT: "hsl(var(--icon-ready))",
            foreground: "hsl(var(--icon-ready-foreground))",
            border: "hsl(var(--icon-ready-border))",
          },
          success: {
            DEFAULT: "hsl(var(--icon-success))",
            foreground: "hsl(var(--icon-success-foreground))",
            border: "hsl(var(--icon-success-border))",
          },
          warning: {
            DEFAULT: "hsl(var(--icon-warning))",
            foreground: "hsl(var(--icon-warning-foreground))",
            border: "hsl(var(--icon-warning-border))",
          },
          danger: {
            DEFAULT: "hsl(var(--icon-danger))",
            foreground: "hsl(var(--icon-danger-foreground))",
            border: "hsl(var(--icon-danger-border))",
          },
          accent: {
            DEFAULT: "hsl(var(--icon-accent))",
            foreground: "hsl(var(--icon-accent-foreground))",
            border: "hsl(var(--icon-accent-border))",
          },
        },
        status: {
          "not-started": {
            DEFAULT: "hsl(var(--status-not-started))",
            foreground: "hsl(var(--status-not-started-fg))",
          },
          "in-progress": {
            DEFAULT: "hsl(var(--status-in-progress))",
            foreground: "hsl(var(--status-in-progress-fg))",
          },
          ready: {
            DEFAULT: "hsl(var(--status-ready))",
            foreground: "hsl(var(--status-ready-fg))",
          },
          blocked: {
            DEFAULT: "hsl(var(--status-blocked))",
            foreground: "hsl(var(--status-blocked-fg))",
          },
          closed: {
            DEFAULT: "hsl(var(--status-closed))",
            foreground: "hsl(var(--status-closed-fg))",
          },
          attention: {
            DEFAULT: "hsl(var(--status-attention))",
            foreground: "hsl(var(--status-attention-fg))",
          },
          accent: {
            DEFAULT: "hsl(var(--status-accent))",
            foreground: "hsl(var(--status-accent-fg))",
          },
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
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-surface": "var(--gradient-surface)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        panel: "var(--shadow-panel)",
        interactive: "var(--shadow-interactive)",
        glow: "var(--shadow-glow)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        eyebrow: ["var(--text-eyebrow-size)", { lineHeight: "var(--text-eyebrow-line-height)" }],
        meta: ["var(--text-meta-size)", { lineHeight: "var(--text-meta-line-height)" }],
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
