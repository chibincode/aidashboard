import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type EnvMap = Map<string, string>;

function parseEnvFile(filePath: string): EnvMap {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  const entries = new Map<string, string>();
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const quoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));

    entries.set(key, quoted ? rawValue.slice(1, -1) : rawValue);
  }

  return entries;
}

function serializeEnvEntries(exampleContent: string, values: EnvMap) {
  return exampleContent
    .split(/\r?\n/)
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return line;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        return line;
      }

      const key = line.slice(0, separatorIndex).trim();
      return `${key}=${values.get(key) ?? ""}`;
    })
    .join("\n");
}

async function promptForValue(
  rl: ReturnType<typeof createInterface>,
  label: string,
  currentValue: string | undefined,
  options?: {
    defaultValue?: string;
    required?: boolean;
  },
) {
  const defaultValue = currentValue || options?.defaultValue || "";
  const suffix = defaultValue ? ` [${defaultValue}]` : "";

  while (true) {
    const answer = (await rl.question(`${label}${suffix}: `)).trim();
    const resolvedValue = answer || defaultValue;

    if (resolvedValue || !options?.required) {
      return resolvedValue;
    }

    output.write(`${label} is required.\n`);
  }
}

async function main() {
  const root = process.cwd();
  const envExamplePath = path.join(root, ".env.example");
  const envLocalPath = path.join(root, ".env.local");

  if (!fs.existsSync(envExamplePath)) {
    throw new Error(".env.example not found.");
  }

  const exampleContent = fs.readFileSync(envExamplePath, "utf8");
  const exampleValues = parseEnvFile(envExamplePath);
  const currentValues = parseEnvFile(envLocalPath);
  const values = new Map(exampleValues);

  for (const [key, value] of currentValues) {
    values.set(key, value);
  }

  const rl = createInterface({ input, output });

  try {
    output.write("Configure this machine to use the shared Signal Deck database.\n");
    output.write("Use the same DATABASE_URL and Supabase settings as your primary machine.\n\n");

    values.set(
      "DATABASE_URL",
      await promptForValue(rl, "DATABASE_URL", values.get("DATABASE_URL"), { required: true }),
    );
    values.set(
      "NEXT_PUBLIC_SUPABASE_URL",
      await promptForValue(rl, "NEXT_PUBLIC_SUPABASE_URL", values.get("NEXT_PUBLIC_SUPABASE_URL"), {
        required: true,
      }),
    );
    values.set(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      await promptForValue(
        rl,
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        values.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
        { required: true },
      ),
    );
    values.set(
      "INVITE_ALLOWLIST",
      await promptForValue(rl, "INVITE_ALLOWLIST", values.get("INVITE_ALLOWLIST"), { required: true }),
    );
    values.set("NEXT_PUBLIC_APP_URL", values.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000");
    values.set("NEXT_PUBLIC_APP_NAME", values.get("NEXT_PUBLIC_APP_NAME") || "Signal Deck");

    fs.writeFileSync(envLocalPath, `${serializeEnvEntries(exampleContent, values)}\n`, "utf8");

    output.write(`\nWrote ${path.relative(root, envLocalPath)}.\n`);
    output.write("Syncing database schema with npm run db:push...\n\n");
  } finally {
    rl.close();
  }

  execSync("npm run db:push", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: values.get("DATABASE_URL") ?? "",
    },
  });

  output.write("\nDone.\n");
  output.write("If this is a secondary machine, start the app with: npm run dev\n");
  output.write("If this is the first machine for a brand new database, run: npm run db:seed\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
