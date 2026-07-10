import { NextResponse } from "next/server";
import {
  deleteProfileMediaPhoto,
  getProfileMediaBundle,
  saveProfileMedia,
} from "@/lib/profile-media";
import { formatSheetsError } from "@/lib/sheets-errors";
import type { ProfileMediaType } from "@/types/profile-media";

export async function GET(request: Request) {
  try {
    const username = new URL(request.url).searchParams.get("username")?.trim() ?? "";
    if (!username) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    const media = await getProfileMediaBundle(username);
    return NextResponse.json({ media });
  } catch (error) {
    return NextResponse.json({ error: formatSheetsError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      targetUsername?: string;
      actingUsername?: string;
      mediaType?: ProfileMediaType;
      dataUrl?: string;
      caption?: string;
    };

    const targetUsername = body.targetUsername?.trim() ?? "";
    const actingUsername = body.actingUsername?.trim() ?? "";
    const mediaType = body.mediaType;
    const dataUrl = body.dataUrl?.trim() ?? "";

    if (!targetUsername || !actingUsername || !mediaType || !dataUrl) {
      return NextResponse.json(
        { error: "Target username, acting username, media type, and photo data are required." },
        { status: 400 },
      );
    }

    const media = await saveProfileMedia(targetUsername, {
      actingUsername,
      mediaType,
      dataUrl,
      caption: body.caption,
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : formatSheetsError(error);
    const status =
      message.includes("only update your own") ||
      message.includes("Account not found") ||
      message.includes("required")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      targetUsername?: string;
      actingUsername?: string;
      photoId?: string;
      mediaType?: ProfileMediaType;
    };

    const targetUsername = body.targetUsername?.trim() ?? "";
    const actingUsername = body.actingUsername?.trim() ?? "";
    const photoId = body.photoId?.trim() ?? "";
    const mediaType = body.mediaType;

    if (!targetUsername || !actingUsername || !photoId || mediaType !== "gallery") {
      return NextResponse.json(
        { error: "Target username, acting username, photo id, and gallery media type are required." },
        { status: 400 },
      );
    }

    const media = await deleteProfileMediaPhoto({
      targetUsername,
      actingUsername,
      photoId,
      mediaType,
    });

    return NextResponse.json({ media });
  } catch (error) {
    const message = error instanceof Error ? error.message : formatSheetsError(error);
    const status =
      message.includes("only update your own") ||
      message.includes("not found") ||
      message.includes("required")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
