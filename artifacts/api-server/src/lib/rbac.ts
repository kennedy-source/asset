export const roles = {
  adminOnly: ["super_admin", "admin"] as const,
  management: ["super_admin", "admin", "manager"] as const,
  sales: ["super_admin", "admin", "manager", "cashier"] as const,
  operations: ["super_admin", "admin", "manager", "production"] as const,
};
