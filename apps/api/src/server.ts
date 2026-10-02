import { app } from "./app";
import { env } from "./config/env";
import { authFacade } from "./modules/auth/auth.facade";

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

// Hourly clean-up of expired sessions and used reset links. unref: never keeps the process alive.
setInterval(() => authFacade.purgeExpired().catch((e) => console.error("[auth] purge failed", e)), 3_600_000).unref();
