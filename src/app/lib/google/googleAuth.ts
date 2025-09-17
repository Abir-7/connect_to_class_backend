/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import logger from "../../utils/serverTools/logger";

const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

// Load credentials.json
const CREDENTIALS = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));

// Use installed or web (web is common now)
const client = CREDENTIALS.installed || CREDENTIALS.web;

// Ensure redirect_uris exist
if (!client.redirect_uris || client.redirect_uris.length === 0) {
  client.redirect_uris = ["http://localhost"]; // fallback redirect
}

const { client_secret, client_id, redirect_uris } = client;

// Initialize OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

export async function authorize() {
  // If token.json exists, use it
  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH, "utf-8");
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  }

  // First-time authorization: generate URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });

  logger.info(`Authorize this app by visiting this URL: ${authUrl}`);

  // Ask user to paste code
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Enter the code from that page here: ", async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        logger.info("Token stored to", TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (err) {
        logger.error("Error retrieving access token", err);
        reject(err);
      }
    });
  });
}
