import { getDatabase } from "firebase-admin/database";
import { put } from "@vercel/blob";
import { admin } from "./_admin.js";

// Nightly snapshot of the whole database (every cup, score and setting) to a
// private Vercel Blob store, one file per day: backups/2026-11-10.json.
// Run by the Vercel cron in vercel.json; Vercel signs those calls with
// CRON_SECRET, so nobody else can trigger it.
export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  try {
    admin();
    const data = (await getDatabase().ref().get()).val();
    const day = new Date().toISOString().slice(0, 10);
    const json = JSON.stringify(data);
    await put(`backups/${day}.json`, json, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
    return res.status(200).json({ saved: `backups/${day}.json`, bytes: json.length });
  } catch (err) {
    console.error("backup failed:", err);
    return res.status(500).json({ error: "Backup failed" });
  }
}
