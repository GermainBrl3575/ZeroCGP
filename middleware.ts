// Middleware intentionally minimal — admin auth is checked client-side
// in app/admin/layout.tsx and server-side in each /api/admin/* route.
// Supabase tokens are in localStorage (not cookies), so middleware
// cannot verify the session in this architecture.

export { };
