// Mirrors backend/app/utils/auth.py's generate_temp_password() — guarantees
// at least one of each character class validate_password_strength requires,
// since a plain random pick over the combined alphabet could (rarely) land
// on e.g. all-lowercase and fail that check when the admin submits the form.
export function generatePassword(): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = lower.toUpperCase();
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const alphabet = lower + upper + digits + special;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const required = [pick(lower), pick(upper), pick(digits), pick(special)];
  const pool = [...required, ...Array.from({ length: 10 }, () => pick(alphabet))];
  // Fisher-Yates shuffle so the guaranteed characters aren't always up front.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.join("");
}
