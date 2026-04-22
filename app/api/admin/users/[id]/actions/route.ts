import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, supabaseAdmin, SUPER_ADMIN_EMAIL } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const adminUser = (auth as { user: any }).user;
  const userId = params.id;
  const { action } = await req.json();

  try {
    // === EXPORT RGPD ===
    if (action === "export_rgpd") {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!targetUser?.user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const { data: portfolios } = await supabaseAdmin.from("portfolios").select("*").eq("user_id", userId);
      const pfIds = (portfolios || []).map(p => p.id);
      const { data: assets } = pfIds.length > 0
        ? await supabaseAdmin.from("portfolio_assets").select("*").in("portfolio_id", pfIds)
        : { data: [] };

      await supabaseAdmin.from("admin_actions_log").insert({
        admin_email: adminUser.email, action: "export_rgpd",
        target_type: "user", target_id: userId,
      });

      return NextResponse.json({
        export: {
          user: { id: targetUser.user.id, email: targetUser.user.email, created_at: targetUser.user.created_at, metadata: targetUser.user.user_metadata },
          portfolios: portfolios || [],
          assets: assets || [],
          exported_at: new Date().toISOString(),
          exported_by: adminUser.email,
        }
      });
    }

    // === TOGGLE ADMIN ===
    if (action === "toggle_admin") {
      // Only super-admin can promote/demote
      if (adminUser.email !== SUPER_ADMIN_EMAIL) {
        return NextResponse.json({ error: "Only super-admin can manage admin roles" }, { status: 403 });
      }

      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!targetUser?.user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // Don't allow removing super-admin's own admin status
      if (targetUser.user.email === SUPER_ADMIN_EMAIL) {
        return NextResponse.json({ error: "Cannot modify super-admin" }, { status: 400 });
      }

      const currentIsAdmin = targetUser.user.user_metadata?.is_admin === true;
      const newIsAdmin = !currentIsAdmin;

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { ...targetUser.user.user_metadata, is_admin: newIsAdmin },
      });

      await supabaseAdmin.from("admin_actions_log").insert({
        admin_email: adminUser.email, action: newIsAdmin ? "grant_admin" : "revoke_admin",
        target_type: "user", target_id: userId,
        details: { target_email: targetUser.user.email },
      });

      return NextResponse.json({ success: true, is_admin: newIsAdmin });
    }

    // === DELETE ACCOUNT ===
    if (action === "delete_account") {
      // Only super-admin can delete
      if (adminUser.email !== SUPER_ADMIN_EMAIL) {
        return NextResponse.json({ error: "Only super-admin can delete accounts" }, { status: 403 });
      }

      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!targetUser?.user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // Don't allow deleting super-admin
      if (targetUser.user.email === SUPER_ADMIN_EMAIL) {
        return NextResponse.json({ error: "Cannot delete super-admin" }, { status: 400 });
      }

      // Delete portfolio assets first, then portfolios
      const { data: portfolios } = await supabaseAdmin.from("portfolios").select("id").eq("user_id", userId);
      const pfIds = (portfolios || []).map(p => p.id);
      if (pfIds.length > 0) {
        await supabaseAdmin.from("portfolio_assets").delete().in("portfolio_id", pfIds);
      }
      await supabaseAdmin.from("portfolios").delete().eq("user_id", userId);

      // Delete the user
      await supabaseAdmin.auth.admin.deleteUser(userId);

      await supabaseAdmin.from("admin_actions_log").insert({
        admin_email: adminUser.email, action: "delete_account",
        target_type: "user", target_id: userId,
        details: { target_email: targetUser.user.email, portfolios_deleted: pfIds.length },
      });

      return NextResponse.json({ success: true, deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Admin action error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
