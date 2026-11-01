import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
describe("public API configuration", () => {
  it("keeps an explicitly empty API base instead of restoring a stale development host", () => {
    const directory=mkdtempSync(join(tmpdir(),"perform-env-"));
    try {
      writeFileSync(join(directory,".env"),"EXPO_PUBLIC_API_BASE_URL=https://old-dev.example.test\n");
      const loader=new URL("../scripts/load-env.js",import.meta.url).href;
      const result=spawnSync(process.execPath,["--input-type=module","-e",`await import(${JSON.stringify(loader)}); console.log(JSON.stringify(process.env.EXPO_PUBLIC_API_BASE_URL));`],{cwd:directory,env:{...process.env,EXPO_PUBLIC_API_BASE_URL:""},encoding:"utf8"});
      expect(result.status).toBe(0);expect(JSON.parse(result.stdout.trim())).toBe("");
    } finally { rmSync(directory,{recursive:true,force:true}); }
  });
});
