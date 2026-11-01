import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
const worker = readFileSync(new URL("../hostgator/service-worker.js", import.meta.url), "utf8");
function load(scope: string, names: string[]) {
  const events: Record<string, (event: any) => void> = {}; const removed: string[] = [];
  vm.runInNewContext(worker, { URL, Response, self: { registration:{scope}, location:new URL(scope), addEventListener:(name:string,fn:any)=>{events[name]=fn;}, clients:{claim:async()=>{}}, skipWaiting:async()=>{} },
    caches:{keys:async()=>names,delete:async(key:string)=>{removed.push(key);},open:async()=>({addAll:async()=>{}})} });
  return { events, removed };
}
describe("service-worker cache ownership", () => {
  it("deletes only this preview's previous caches", async () => {
    const prefix="perform-ai:/perform-macgyver-review/app:";
    const {events,removed}=load("https://example.test/perform-macgyver-review/app/",[prefix+"v2",prefix+"v3","ready-mind-v1","perform-ai-app-v2","perform-ai:/app:v2"]);
    let done!:Promise<unknown>; events.activate({waitUntil:(p:Promise<unknown>)=>{done=p;}}); await done;
    expect(removed).toEqual([prefix+"v2"]);
  });
  it("can retire known legacy caches only at the original /app path", async () => {
    const {events,removed}=load("https://example.test/app/",["perform-ai-app-v2","unrelated"]);
    let done!:Promise<unknown>; events.activate({waitUntil:(p:Promise<unknown>)=>{done=p;}});await done;expect(removed).toEqual(["perform-ai-app-v2"]);
  });
  it("leaves other apps, PHP and non-GET requests to the browser", () => {
    const {events}=load("https://example.test/app/",[]);
    for(const [method,url] of [["GET","https://example.test/ready-mind/index.html"],["GET","https://example.test/app/macgyver.php"],["POST","https://example.test/app/a.js"]]) {
      let intercepted=false; events.fetch({request:{method,url},respondWith:()=>{intercepted=true;}});expect(intercepted).toBe(false);
    }
  });
});
