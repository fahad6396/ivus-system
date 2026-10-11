import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: currentProfile } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

    if (currentProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (user_id === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const { data: targetProfile } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user_id)
        .single();

    if (targetProfile?.role === "admin") {
      const { count } = await supabaseAdmin
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("role", "admin");

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: "The last admin account cannot be deleted." },
          { status: 400 }
        );
      }
    }

    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthError) {
      throw deleteAuthError;
    }

    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user_id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
