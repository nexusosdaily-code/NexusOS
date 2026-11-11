import { describe, expect, it } from "vitest";
import { Block, Transaction, Psbt, address, networks } from "bitcoinjs-lib";

// Real serialized synthetic transactions, never signed or broadcast. These
// fixtures test transaction-root integrity, not proof of work or full consensus.
function blockWithTransactions(count: number): Block {
  const block = new Block();
  block.prevHash = new Uint8Array(32);
  block.transactions = Array.from({ length: count }, (_, index) => {
    const tx = new Transaction();
    const previous = new Uint8Array(32);
    previous[0] = index + 1;
    tx.addInput(previous, 0);
    tx.addOutput(Uint8Array.of(0x51), BigInt(index + 1));
    return tx;
  });
  block.merkleRoot = Block.calculateMerkleRoot(block.transactions);
  return Block.fromHex(block.toHex());
}

describe("bitcoinjs-lib GHSA-8vv3-6qpc-gpw6 regression", () => {
  it.each([1, 3, 6, 9])("accepts an unmutated %i-transaction root", count => {
    expect(blockWithTransactions(count).checkTxRoots()).toBe(true);
  });

  it.each([10, 12])("rejects a forged %i-transaction list sharing the honest root and header", count => {
    const honest = blockWithTransactions(9);
    const forged = Block.fromHex(honest.toHex());
    const last = forged.transactions!.at(-1)!;
    while (forged.transactions!.length < count) forged.transactions!.push(last);
    const parsed = Block.fromHex(forged.toHex());
    // Demonstrate the exploit precondition, not merely a mismatched root.
    expect(Block.calculateMerkleRoot(parsed.transactions!)).toEqual(honest.merkleRoot);
    expect(parsed.getId()).toBe(honest.getId());
    expect(parsed.toHex()).not.toBe(honest.toHex());
    expect(honest.checkTxRoots()).toBe(true);
    expect(parsed.checkTxRoots()).toBe(false);
  });

  it("rejects duplication detected at an internal tree level", () => {
    const honest = blockWithTransactions(6);
    const forged = Block.fromHex(honest.toHex());
    forged.transactions!.push(...forged.transactions!.slice(-2));
    const parsed = Block.fromHex(forged.toHex());
    expect(Block.calculateMerkleRoot(parsed.transactions!)).toEqual(honest.merkleRoot);
    expect(parsed.getId()).toBe(honest.getId());
    expect(parsed.checkTxRoots()).toBe(false);
  });

  it("still rejects an ordinary changed transaction", () => {
    const block = blockWithTransactions(3);
    block.transactions![1].outs[0].value += 1n;
    expect(block.checkTxRoots()).toBe(false);
  });

  it("preserves address decoding and unsigned PSBT round trips", () => {
    const script = address.toOutputScript("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", networks.bitcoin);
    expect(address.fromOutputScript(script, networks.bitcoin))
      .toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    const psbt = new Psbt({ network: networks.bitcoin });
    psbt.addInput({
      hash: "01".repeat(32), index: 0,
      witnessUtxo: { script: Uint8Array.from([0, 20, ...new Uint8Array(20)]), value: 1000n },
    });
    psbt.addOutput({ script, value: 900n });
    const parsed = Psbt.fromHex(psbt.toHex());
    expect(parsed.txInputs).toHaveLength(1);
    expect(parsed.txOutputs[0].value).toBe(900n);
    expect(parsed.toHex()).toBe(psbt.toHex());
  });
});
