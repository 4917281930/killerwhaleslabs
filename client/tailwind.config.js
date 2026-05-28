export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#060708',
        graphite: '#111317',
        line: 'rgba(255,255,255,0.09)',
        muted: '#8f98a3',
        bitcoin: '#f7931a',
        ember: '#ffb15c'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      boxShadow: {
        glow: '0 0 80px rgba(247,147,26,0.16)',
        card: '0 20px 80px rgba(0,0,0,0.28)'
      }
    }
  },
  plugins: []
};
