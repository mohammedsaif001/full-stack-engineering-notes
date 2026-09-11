import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { db } from "../db";
import { oauthClientsTable } from "../db/schema";

async function main() {
  const name = process.argv[2] ?? "demo-client";
  const redirectUri = process.argv[3] ?? "http://localhost:3000/callback";

  const clientId = crypto.randomBytes(16).toString("hex");
  const clientSecret = crypto.randomBytes(32).toString("hex");
  const clientSecretHash = await bcrypt.hash(clientSecret, 10);

  await db.insert(oauthClientsTable).values({
    clientId,
    clientSecretHash,
    name,
    redirectUri,
  });

  console.log("OAuth client registered:");
  console.log(`  name:          ${name}`);
  console.log(`  redirect_uri:  ${redirectUri}`);
  console.log(`  client_id:     ${clientId}`);
  console.log(`  client_secret: ${clientSecret}`);
  console.log(
    "\nSave the client_secret now — it is not stored in plaintext and cannot be shown again.",
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
