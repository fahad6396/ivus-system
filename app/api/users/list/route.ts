import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
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

    const {
      data: authUsers,
      error: usersError,
    } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      throw usersError;
    }

    const { data: profiles, error: profilesError } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, role, created_at"
        );

    if (profilesError) {
      throw profilesError;
    }

    const profileMap = new Map(
      (profiles || []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const users = authUsers.users.map((user) => {
      const profile =
        profileMap.get(user.id);

      return {
        id: user.id,
        email: user.email || null,
        full_name:
          profile?.full_name ||
          user.user_metadata?.full_name ||
          "",
        role:
          profile?.role || "viewer",
        created_at:
          profile?.created_at ||
          user.created_at,
        last_sign_in_at:
          user.last_sign_in_at || null,
      };
    });

    return NextResponse.json({
      users,
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
