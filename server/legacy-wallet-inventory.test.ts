import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import ts from "typescript";
import { LEGACY_WALLET_MUTATIONS } from "../client/src/lib/wallet-request";

const boundary=readFileSync("server/legacy-wallet-transaction.ts","utf8");
const routeText=readFileSync("server/routes.ts","utf8");
const source=ts.createSourceFile("routes.ts",routeText,ts.ScriptTarget.Latest,true);
const inventoried=new Set([...boundary.matchAll(/"(\/api\/[^"]+)"/g)].map(match=>match[1]));
function routeOf(node:ts.Node):string|undefined {
  for(let n:ts.Node|undefined=node;n;n=n.parent) {
    if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.getText(source)==="app"&&ts.isStringLiteral(n.arguments[0])) {
      return n.arguments[0].text;
    }
  }
}
it("accounts for every direct sats writer, raw SQL writer and new arithmetic helper invocation",()=>{
  const findings:Array<{path?:string;text:string}>=[];
  function visit(node:ts.Node) {
    if(ts.isCallExpression(node)&&node.expression.getText(source)==="changeLegacySats") {
      findings.push({path:routeOf(node),text:node.getText(source)});
    }
    if(ts.isPropertyAssignment(node)&&node.name.getText(source)==="satsBalance"&&
      ts.isObjectLiteralExpression(node.parent)&&ts.isCallExpression(node.parent.parent)&&
      ts.isPropertyAccessExpression(node.parent.parent.expression)&&node.parent.parent.expression.name.text==="set") {
      findings.push({path:routeOf(node),text:node.getText(source)});
    }
    if(ts.isTemplateExpression(node)&&/UPDATE lightning_wallets|INSERT INTO lightning_wallets/.test(node.getText(source))) {
      findings.push({path:routeOf(node),text:node.getText(source)});
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  expect(findings.length).toBeGreaterThan(20);
  for(const finding of findings) {
    if(!finding.path) {
      // Only the named sweep helper is outside an HTTP handler; it has its own
      // durable per-event transaction, independently exercised in PostgreSQL.
      expect(finding.text).toContain("changeLegacySats");
    } else expect(inventoried.has(finding.path),finding.path).toBe(true);
  }
  expect(routeText.indexOf("installLegacyWalletBoundaries(app);")).toBeLessThan(routeText.indexOf("return httpServer;"));
});
it("keeps browser retry identities aligned with every mandatory server boundary",()=>{
  const mandatory=boundary.match(/export const LEGACY_WALLET_ROUTES = \[([\s\S]*?)\] as const/)![1];
  const paths=[...mandatory.matchAll(/"(\/api\/[^"]+)"/g)].map(match=>match[1]);
  expect(new Set(paths)).toEqual(LEGACY_WALLET_MUTATIONS);
});
it("never restores an existing genesis sats allocation or blindly resets failed payment attempts",()=>{
  expect(readFileSync("server/genesis_user.ts","utf8")).not.toMatch(/\.update\(lightningWallets\)/);
  expect(routeText).not.toContain("SET status='queued', attempts=0");
  expect(readFileSync("server/p2p-commerce-routes.ts","utf8")).toContain("P2P_PAYMENTS_RELEASED = false");
});
