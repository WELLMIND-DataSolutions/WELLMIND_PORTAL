import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Yeh lazmi add karein
  server: {
    port: 5000,      // You can change 5000 to any port you prefer
    host: true,      // This exposes the project on your local network (0.0.0.0)
    strictPort: true // If port 5000 is busy, Vite will fail instead of picking a random one
  }
})