import { AsyncLocalStorage } from "node:async_hooks";

// Only explicitly wrapped legacy wallet handlers enter this context. Storage
// helpers must use the exported db, not start a second pool transaction.
export interface WalletScope {
  db: any;
  active: boolean;
  afterCommit: Array<() => void | Promise<void>>;
}
export const walletScope = new AsyncLocalStorage<WalletScope>();

export function transactionAwareDatabase<T extends object>(database: T): T {
  return new Proxy(database, {
    get(target, property) {
      const scope = walletScope.getStore();
      // A leaked timer must not write through a transaction that has committed.
      if (scope && !scope.active) throw new Error("Wallet transaction has ended");
      const current = scope?.db ?? target;
      const value = Reflect.get(current, property, current);
      return typeof value === "function" ? value.bind(current) : value;
    },
  });
}

export function afterWalletCommit(effect: () => void | Promise<void>) {
  const scope = walletScope.getStore();
  if (scope) {
    if (!scope.active) throw new Error("Wallet transaction has ended");
    scope.afterCommit.push(effect);
  } else {
    void Promise.resolve().then(effect).catch(error => console.error("[Wallet effect]", error.message));
  }
}
