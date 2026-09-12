import { defineConfig, defineProject } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
    },
    projects: [
      defineProject({
        root: "./backend",
        test: {
          environment: "node",
          exclude: ["test/security/**"],
          include: ["src/**/*.test.ts", "test/unit/**/*.test.ts"],
          name: "backend",
        },
      }),
      defineProject({
        root: "./frontend",
        test: {
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          name: "frontend",
          setupFiles: ["./src/test/setup.ts"],
        },
      }),
      defineProject({
        root: "./packages/protocol",
        test: {
          environment: "node",
          include: ["src/**/*.test.ts"],
          name: "protocol",
        },
      }),
    ],
  },
});
