import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function fetchReelCaptionSafe(reelUrl: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "-j",
      "--skip-download",
      "--cookies-from-browser",
      "chrome",
      reelUrl,
    ], { encoding: "utf8", maxBuffer: 1024 * 1024 });

    const info = JSON.parse(stdout) as { description?: string };
    const caption = (info.description ?? "").trim();
    return caption || null;
  } catch (e) {
    console.warn("[WARN] Reel fetch failed even with cookies.");
    console.warn("Reason:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
