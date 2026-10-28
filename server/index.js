// Long-running server (local dev, Hostinger). Vercel uses api/index.js instead.
import app from "./app.js";

const port = Number(process.env.API_PORT || process.env.PORT) || 4100;
app.listen(port, () => console.log(`ESOL feedback API on http://localhost:${port}`));
