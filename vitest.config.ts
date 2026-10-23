import { configDefaults, defineConfig } from "vitest/config";

// Session worktrees live under .claude/worktrees with their own copy of tests/.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, ".claude/**"] } });
