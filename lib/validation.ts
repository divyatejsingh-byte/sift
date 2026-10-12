export const REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export function isValidRepo(input: unknown): input is string {
  return typeof input === "string" && input.length <= 140 && REPO_REGEX.test(input);
}
