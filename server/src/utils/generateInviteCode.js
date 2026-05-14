export function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
}
