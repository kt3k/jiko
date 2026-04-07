import { App, staticFiles } from "fresh";

const app = new App();

app.use(staticFiles());
app.fsRoutes();

export default app;
