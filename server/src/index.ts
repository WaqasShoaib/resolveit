// This file is intentionally minimal. The server is started in app.ts.
// Keeping this file prevents accidental double servers if a script imports index.ts.
import app from './app';
export default app;
