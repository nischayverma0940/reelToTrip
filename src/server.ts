import "dotenv/config";
import app from "./app";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Reel-to-Trip backend running on port ${PORT}`);
});
