export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBlingSyncScheduler } = await import(
      "@/services/sync/bling-sync-scheduler"
    );
    startBlingSyncScheduler();
  }
}
