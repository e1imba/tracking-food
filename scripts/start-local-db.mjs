import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pgCtl = fileURLToPath(new URL("../.local/pgsql/bin/pg_ctl.exe", import.meta.url));
const dataDirectory = fileURLToPath(new URL("../.local/pgdata", import.meta.url));
const logFile = fileURLToPath(new URL("../.local/postgres.log", import.meta.url));

if (process.platform === "win32" && existsSync(pgCtl) && existsSync(dataDirectory)) {
  const status = spawnSync(pgCtl, ["-D", dataDirectory, "status"], {
    stdio: "ignore",
    windowsHide: true,
  });

  if (status.status === 0) {
    console.log("Local PostgreSQL is already running.");
  } else if (status.status === 3) {
    const start = spawnSync(pgCtl, ["-D", dataDirectory, "-l", logFile, "-w", "start"], {
      stdio: "inherit",
      windowsHide: true,
    });
    if (start.status !== 0) {
      console.error("Could not start local PostgreSQL. Check .local/postgres.log.");
      process.exit(1);
    }
  } else {
    console.error("Could not check local PostgreSQL status.");
    process.exit(1);
  }
}
