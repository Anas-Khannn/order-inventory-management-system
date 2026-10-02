import { pool } from "./client";
import { DEMO_PASSWORD, seedDemoUsers } from "./demo-users";

/** Adds the demo accounts only. Unlike `db:seed`, it keeps existing products and orders. */
seedDemoUsers()
  .then((n) => console.log(`Added ${n} demo users (password: ${DEMO_PASSWORD})`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
