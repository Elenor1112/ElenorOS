/**
 * The "Pro Coder" account may pick any employee as Employee of the Month with
 * no conditions (no permission, rank, score or justification requirement).
 * Pure helper so both the API route and the client can share it.
 */
export function isProCoder(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  if (!u) return false;
  return (
    (u.firstName ?? "").trim().toLowerCase() === "pro" &&
    (u.lastName ?? "").trim().toLowerCase() === "coder"
  );
}
