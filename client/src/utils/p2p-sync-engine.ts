/**
 * WNSP P2P Sync Engine v1.0 [AGPL-3.0]
 * Spectral consensus protocol for distributed Lambda State Machine nodes.
 *
 * Fixes applied vs original:
 *  - resolveConsensus validates chain links using computeBlockFingerprint() —
 *    not the old broken `${nm}nm_HASH` string template
 *  - Chain replacement calls stateMachine.replaceChain() on the actual internal
 *    ledger — not on a stale copy that was returned by getChain()
 *  - nodeId prefixed with timestamp for better traceability (still unique per session)
 */

import { LambdaStateMachine, LedgerBlock } from "./lambda-state";

export interface NetworkMessage {
  type: "SYNC_REQUEST" | "SYNC_RESPONSE" | "BROADCAST_BLOCK";
  senderId: string;
  payload: {
    chainLength: number;
    tailAnchorNm: number;
    blocks?: LedgerBlock[];
  };
}

export class P2PSyncEngine {
  private stateMachine: LambdaStateMachine;
  private nodeId: string;
  private peerConnections: Map<string, (msg: string) => void> = new Map();
  private onChainUpdateCallback?: (chain: LedgerBlock[]) => void;

  constructor(stateMachine: LambdaStateMachine, label?: string) {
    this.stateMachine = stateMachine;
    // Deterministic-looking ID: label + timestamp hex, no Math.random()
    const ts = Date.now().toString(16).slice(-6);
    this.nodeId = label ? `node_${label}_${ts}` : `node_${ts}`;
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public bindOnChainUpdate(callback: (chain: LedgerBlock[]) => void): void {
    this.onChainUpdateCallback = callback;
  }

  /** Registers a virtual communication line to a peer and initiates sync. */
  public connectPeer(remoteNodeId: string, sendChannel: (msg: string) => void): void {
    this.peerConnections.set(remoteNodeId, sendChannel);
    this.initiateSyncWithPeer(remoteNodeId);
  }

  /** Dispatches a sync-request to a newly discovered node. */
  private initiateSyncWithPeer(remoteNodeId: string): void {
    const chain = this.stateMachine.getChain();
    const tailBlock = chain[chain.length - 1];

    const syncPulse: NetworkMessage = {
      type: "SYNC_REQUEST",
      senderId: this.nodeId,
      payload: {
        chainLength: chain.length,
        tailAnchorNm: tailBlock.blockWavelengthAnchor,
      },
    };

    const send = this.peerConnections.get(remoteNodeId);
    if (send) send(JSON.stringify(syncPulse));
  }

  /** Handles incoming network traffic and coordinates consensus resolution. */
  public handleIncomingMessage(rawMessage: string): void {
    const message: NetworkMessage = JSON.parse(rawMessage);
    if (message.senderId === this.nodeId) return; // Prevent echo-loop

    const localChain = this.stateMachine.getChain();
    const localTail = localChain[localChain.length - 1];

    switch (message.type) {
      case "SYNC_REQUEST": {
        const responsePayload: NetworkMessage = {
          type: "SYNC_RESPONSE",
          senderId: this.nodeId,
          payload: {
            chainLength: localChain.length,
            tailAnchorNm: localTail.blockWavelengthAnchor,
            blocks: localChain,
          },
        };
        const send = this.peerConnections.get(message.senderId);
        if (send) send(JSON.stringify(responsePayload));
        break;
      }

      case "SYNC_RESPONSE":
      case "BROADCAST_BLOCK":
        if (!message.payload.blocks) return;
        this.resolveConsensus(message.payload.blocks);
        break;
    }
  }

  /**
   * Consensus resolution:
   * 1. Incoming chain must be longer than the local chain.
   * 2. Genesis block must anchor at 380.000 nm.
   * 3. Every block's previousWavelengthHash must match computeBlockFingerprint()
   *    of the preceding block — using the real physics-derived hash, not a string template.
   * 4. On success, replaceChain() is called on the actual internal ledger.
   */
  private resolveConsensus(incomingBlocks: LedgerBlock[]): void {
    const localChain = this.stateMachine.getChain();

    // Condition 1 — incoming must be longer
    if (incomingBlocks.length <= localChain.length) return;

    // Condition 2 — genesis anchor must be 380.000 nm (physical origin)
    if (incomingBlocks[0].blockWavelengthAnchor !== 380.000) {
      console.warn("[P2P] Rejected fork: invalid genesis anchor.");
      return;
    }

    // Condition 3 — verify every block link using the real fingerprint
    for (let i = 1; i < incomingBlocks.length; i++) {
      const curr = incomingBlocks[i];
      const prev = incomingBlocks[i - 1];
      const expectedHash = this.stateMachine.computeBlockFingerprint(prev);

      if (curr.previousWavelengthHash !== expectedHash) {
        console.error(`[P2P] Rejected fork: broken chain at block #${i}.`);
        return;
      }
    }

    // All checks pass — replace the internal ledger (not just a copy of it)
    console.log(`[P2P] State sync: accepted chain length ${incomingBlocks.length}`);
    this.stateMachine.replaceChain(incomingBlocks);

    if (this.onChainUpdateCallback) {
      this.onChainUpdateCallback(this.stateMachine.getChain());
    }
  }

  /** Broadcasts a newly committed block to all connected peers. */
  public broadcastNewBlock(updatedChain: LedgerBlock[]): void {
    const tailBlock = updatedChain[updatedChain.length - 1];
    const message: NetworkMessage = {
      type: "BROADCAST_BLOCK",
      senderId: this.nodeId,
      payload: {
        chainLength: updatedChain.length,
        tailAnchorNm: tailBlock.blockWavelengthAnchor,
        blocks: updatedChain,
      },
    };

    const serialized = JSON.stringify(message);
    this.peerConnections.forEach((send) => send(serialized));
  }
}
