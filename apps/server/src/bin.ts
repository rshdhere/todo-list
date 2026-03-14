import { app } from "@todo-list/api";
import { ENVIRONMENT, SERVER_PORT } from "@todo-list/config";

if (ENVIRONMENT === "production") {
  app.listen(SERVER_PORT, () => {
    console.log(`your server is listening on http://localhost:${SERVER_PORT}`);
  });
} else {
  console.log(
    "server can only be started in production mode (NODE_ENV=production).",
  );
}
