import "dotenv/config";
import { setTelegramWebhook, setBotCommands } from "@/lib/telegram/bot";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.TELEGRAM_MINI_APP_URL;

  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN is missing in environment");
    process.exit(1);
  }
  if (!secret) {
    console.error("❌ TELEGRAM_WEBHOOK_SECRET is missing in environment");
    process.exit(1);
  }
  if (!appUrl || appUrl.startsWith("http://localhost")) {
    console.warn("⚠️ NEXT_PUBLIC_APP_URL is localhost or not set. Webhooks require a public HTTPS URL (e.g. ngrok or Vercel).");
    console.warn("If testing locally, use a tunnel like: npx cloudflared tunnel --url http://localhost:3000");
  }

  const webhookUrl = `${appUrl?.replace(/\/$/, "")}/api/telegram/webhook`;
  console.log(`Setting webhook to: ${webhookUrl}`);

  const webhookResult = await setTelegramWebhook(token, webhookUrl, secret);
  if (webhookResult.ok) {
    console.log("✅ Telegram Webhook registered successfully!");
  } else {
    console.error("❌ Failed to set webhook:", webhookResult);
  }

  // Register bot command list in Telegram menu
  console.log("Registering bot commands in English & Amharic...");
  await setBotCommands(token, [
    { command: "start", description: "Start the bot & open Mini App" },
    { command: "nearest", description: "Find nearest TAF fuel stations" },
    { command: "stations", description: "View all stations and fuel status" },
    { command: "check", description: "Check specific station availability" },
    { command: "notifications", description: "Manage fuel arrival alerts" },
    { command: "admin", description: "Station staff portal" },
    { command: "help", description: "Help and instructions" },
  ]);

  await setBotCommands(token, [
    { command: "start", description: "ቦቱን ለመጀመር እና መተግበሪያውን ለመክፈት" },
    { command: "nearest", description: "በአቅራቢያ የሚገኙ ማደያዎችን ለመፈለግ" },
    { command: "stations", description: "የሁሉንም ማደያዎች የነዳጅ ሁኔታ ለማየት" },
    { command: "check", description: "የአንድን ማደያ ሁኔታ ለመፈተሽ" },
    { command: "notifications", description: "የነዳጅ ማሳወቂያዎችን ለማስተዳደር" },
    { command: "admin", description: "የማደያ ኃላፊዎች መግቢያ" },
    { command: "help", description: "እገዛ እና መመሪያዎች" },
  ], "am");

  console.log("✅ Commands registered!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
