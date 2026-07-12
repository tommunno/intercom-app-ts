import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Error: Please provide a name for the migration.");
  console.log("Example: npm run migrate:make create users table");
  process.exit(1);
}

// 1. Format the safe name for the file and ID
const rawName = args.join("_").toLowerCase();
const safeName = rawName.replace(/[^a-z0-9_]/g, "");

// 2. Format a camelCase name for the exported variable
const camelCaseName = args
  .map((word, index) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (index === 0) return clean;
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  })
  .join("");

// 3. Generate UTC timestamp
const timestamp = new Date()
  .toISOString()
  .replace(/[-T:.Z]/g, "")
  .slice(0, 14);
const filePrefix = `${timestamp}_${safeName}`;
const filename = `${filePrefix}.ts`;

// 4. Target directories
const databaseDir = path.join(__dirname, "..", "src", "server", "database");
const migrationsDir = path.join(databaseDir, "migrations");

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// 5. Generate the Migration File
const filepath = path.join(migrationsDir, filename);
const boilerplate = `import type { Migration } from "../../types/Migration.js";

export const ${camelCaseName}: Migration = {
    id: "${filePrefix}",
    up: \`
        -- Write your SQL here
        
    \`
};
`;

fs.writeFileSync(filepath, boilerplate);
console.log(`Created migration: src/server/database/migrations/${filename}`);

// 6. Update migrations/index.ts
const indexPath = path.join(migrationsDir, "index.ts");
const exportStatement = `export * from "./${filePrefix}.js";\n`;

if (fs.existsSync(indexPath)) {
  fs.appendFileSync(indexPath, exportStatement);
} else {
  fs.writeFileSync(indexPath, exportStatement);
}
console.log(`Updated exports in: src/server/database/migrations/index.ts`);

// 7. Update migrations.ts Array
const migrationsTsPath = path.join(databaseDir, "migrations.ts");
let migrationsTsContent = "";

// Create the file with your specific boilerplate if it doesn't exist
if (fs.existsSync(migrationsTsPath)) {
  migrationsTsContent = fs.readFileSync(migrationsTsPath, "utf8");
} else {
  migrationsTsContent = `import type { Migration } from "../types/index.js";\n\nexport const migrations = [] as const satisfies readonly Migration[];\n`;
}

// Inject the import statement safely after the last import
const importStatement = `import { ${camelCaseName} } from "./migrations/index.js";`;
if (!migrationsTsContent.includes(importStatement)) {
  const importRegex = /^import .*$/gm;
  let lastMatch;
  let match;
  while ((match = importRegex.exec(migrationsTsContent)) !== null) {
    lastMatch = match;
  }

  if (lastMatch) {
    const insertPos = lastMatch.index + lastMatch[0].length;
    migrationsTsContent =
      migrationsTsContent.slice(0, insertPos) +
      "\n" +
      importStatement +
      migrationsTsContent.slice(insertPos);
  } else {
    migrationsTsContent = importStatement + "\n" + migrationsTsContent;
  }
}

// Inject the variable into the array
const arrayRegex =
  /(export\s+const\s+migrations\s*=\s*\[)([\s\S]*?)(\]\s*as\s+const\s+satisfies\s+readonly\s+Migration\[\];?)/;
migrationsTsContent = migrationsTsContent.replace(
  arrayRegex,
  (match, start, inner, end) => {
    const trimmedInner = inner.trim();
    const cleanInner = trimmedInner.replace(/,+$/, ""); // Strip trailing commas

    if (cleanInner.length === 0) {
      return `${start}\n  ${camelCaseName}\n${end}`;
    } else {
      return `${start}\n  ${cleanInner},\n  ${camelCaseName}\n${end}`;
    }
  },
);

fs.writeFileSync(migrationsTsPath, migrationsTsContent);
console.log(`Updated array in: src/server/database/migrations.ts`);
