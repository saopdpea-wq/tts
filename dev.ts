import express from "express";
import { createServer as createViteServer } from "vite";
import app from "./api/index.js"; // Import the Express app

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  // Use Vite's connect instance as middleware
  app.use(vite.middlewares);

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Local Dev Server running on http://localhost:${PORT}`);
  });
}

startServer();
