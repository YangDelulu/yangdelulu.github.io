import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Repo name is username.github.io, so it's treated as a user site, don't need base
  // base: "/repo_name/",
})
