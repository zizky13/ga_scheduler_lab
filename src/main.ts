import { runPreGA } from "./pre-ga/validator.js";

async function main() {
  const results = await runPreGA();
  console.table(results);
}

main();