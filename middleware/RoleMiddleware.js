import OrganizationMember from "../models/OrganizationMemberSchema.js";

const ROLE_LEVELS = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

export async function checkRole(req, res, next, minimumRole) {
  const { organizationId } = req.body;
  const userId = req.user.id;

  try {
    const membership = await OrganizationMember.findOne({
      organizationId,
      userId,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this organization",
      });
    }

    if (ROLE_LEVELS[membership.role] < ROLE_LEVELS[minimumRole]) {
      return res.status(403).json({
        success: false,
        message: `You need ${minimumRole} permissions or higher`,
      });
    }

    req.userRole = membership.role;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error checking permissions" });
  }
}

export function requireAdmin(req, res, next) {
  return checkRole(req, res, next, "admin");
}

export function requireEditor(req, res, next) {
  return checkRole(req, res, next, "editor");
}

export function requireViewer(req, res, next) {
  return checkRole(req, res, next, "viewer");
}
