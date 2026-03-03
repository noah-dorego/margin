import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = process.env.DEBUG_TOKEN;
  if (!token || req.nextUrl.searchParams.get("token") !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const dbPath = process.env.DATABASE_PATH ?? "./db/margin.db";

  try {
    const db = getDb();

    const sourceCount = (
      db.prepare("SELECT COUNT(*) as n FROM feed_sources").get() as { n: number }
    ).n;

    const itemCount = (
      db.prepare("SELECT COUNT(*) as n FROM feed_items").get() as { n: number }
    ).n;

    const docCount = (
      db.prepare("SELECT COUNT(*) as n FROM regulatory_documents").get() as { n: number }
    ).n;

    const orphanedItems = (
      db
        .prepare(
          "SELECT COUNT(*) as n FROM feed_items WHERE source_id NOT IN (SELECT id FROM feed_sources)",
        )
        .get() as { n: number }
    ).n;

    const sources = db
      .prepare("SELECT id, label, disabled FROM feed_sources ORDER BY label")
      .all();

    return NextResponse.json({
      db_path: dbPath,
      counts: { feed_sources: sourceCount, feed_items: itemCount, documents: docCount },
      orphaned_feed_items: orphanedItems,
      feed_sources: sources,
    });
  } catch (err) {
    return NextResponse.json(
      { db_path: dbPath, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
