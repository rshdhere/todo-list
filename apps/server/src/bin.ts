import { app } from "@todo-list/api";
import { SERVER_PORT } from "@todo-list/config";
import { ensureDatabaseConnection, runtimeMode } from "@/src/index";

const startServer = async () => {
  await ensureDatabaseConnection();

  app.listen(SERVER_PORT, () => {
    console.log(
      `server is running in ${runtimeMode} mode at http://localhost:${SERVER_PORT}`,
    );
  });
};

startServer();
