# NexusOS enhancements and the WLS Verifier

Evidence reviewed: 24 November 2026.

NexusOS can record a reviewed WavelengthScript build and, with separate owner consent, commit that exact receipt to a public Explorer block. In the development pilot, WLS Verifier can replay the exported build and cross-reference it against the block without an internet connection. This is a software disclosure, not notice of a production verifier release.

## What NexusOS added

The CE→SE Pipeline translates a supported Python subset into WavelengthScript instructions. The editor shows the compiled program for review before launch. The supported launch profiles run in a bounded VM without filesystem, network or wallet capabilities. This is not unrestricted Python, a completed rewrite of NexusOS in WavelengthScript, or physical photonic execution.

Explorer’s My receipts view records the owner’s launch result, profile, cycles and digests. Supported core and Python launch profiles accept up to 64 KiB of UTF-8 source; the extended core launch profile accepts up to 128 KiB. Optional private attachments have separate limits: up to four files and 16 MiB combined. They are checked at launch but not consumed by the VM. The receipt is not a download or proof that an attachment is still stored.

Public inclusion is explicit and separate from launching, downloading a proof or sharing a file. Explorer exposes the versioned block and blinded commitments, not private source, attachment metadata or account identity. Public linkage is recorded in the relevant NexusOS record domain; it is not Bitcoin settlement, proof of reserves or independent network consensus.

## Cross-reference an exact build against Explorer

For an eligible new Python-to-WLS build in Preview, Download private WLS proof exports the signed compiled program and its expected result. If the owner chooses public inclusion for that same receipt, Explorer offers a separate Download WLS block link file. Share the private proof only with people meant to see the compiled program; it can reveal embedded values. Share the second file only with people allowed to associate that private proof with the public block.

Verify proof checks the issuer signature against a trusted key and checks the compiled-program digest. Run and compare executes the compiled program locally with the shared WLS runtime and compares the result digest and cycle count. It does not recompile the original Python independently.

Check NexusOS block link recomputes the commitment to the specific signed receipt and recalculates the public block hash. The block number, full block hash and WLS proof commitment can then be compared with Explorer. Two runs of identical code can have the same result but are different receipts; one run’s link does not verify the other. Older proofs and blocks remain unchanged and do not gain this exact-receipt link.

A portable file-acknowledgement proof is different. It checks signed, blinded record evidence and its supplied checkpoint linkage. It does not replay the transfer, retrieve the file, attest a remote device, or prove a person read it.

## Switch from online preparation to offline comparison

1. Online: On the source device, launch a reviewed build and save the private WLS proof. From that exact receipt in Explorer, opt into public inclusion if desired, then download the WLS block-link file. Keep Explorer open on a connected device or save its block details if both devices will be offline.
2. Prepare the verifying device: Open WLS Verifier while connected, choose Prepare offline if needed and wait for Ready offline. Save both downloads to Files or Downloads as files, not as screenshots, copied text, web links or an audit summary.
3. Offline: Disconnect Wi-Fi and mobile data. In WLS Verifier, choose the private proof under Evidence and tap Verify proof, then Run and compare. In Check NexusOS block link, choose the second file and run the check. The bundled sample can demonstrate replay but cannot substitute for the original proof for this block.
4. Compare: Match describes local replay. Commitment matches describes the exact receipt-to-block link. Compare the full block hash against live Explorer on a separate connected device or against a saved copy of the Explorer block details. Neither local check needs to call NexusOS.

There is no in-app network switch or live Explorer lookup in WLS Verifier. The device controls connectivity; Explorer needs a connection to show live history. A saved comparison does not provide fresh chain state or revocation information.

## Related NexusOS improvements and their limits

WLS-authorised file requests are separate from build attachments. The signed-in flow binds an exact recipient and file digest, requires recipient acceptance, verifies bytes locally and records a separate acknowledgement. The WLS file workflow is limited to 64 KiB. Directory selection and invitation links help users find the correct operation; an invite, VM halt or accepted request does not mean the file was delivered. Connection success depends on the devices and networks; offline verifier operation is not proof of offline Bluetooth transfer or later reconciliation.

The Social Broadcast source separates private drafts and public or private NexusOS P2P offers from opt-in sends to a connected social account. The Instagram Reels and YouTube upload paths depend on authorised provider configuration and eligibility; controlled provider tests do not establish live publishing. An uncertain external write is not automatically repeated.

Navigation brings the pipeline, receipts, Explorer and verifier handoffs together. In development, the preview client is versioned so an older cached copy is not reused after an interface change. The disclosure does not change financial holds, enable new monetary paths or verify live balances. The wider dated release inventory remains separate from this November update.

## What was demonstrated and audited

Participant-reported development evidence: a proof exported on Samsung was verified and replayed on an iPad with Wi-Fi and mobile data off. A separate altered-copy test produced an issuer-signature rejection. For the block cross-reference, the exported Preview block #25 link showed the same full block hash and WLS proof commitment as Explorer’s public record, and the participant subsequently confirmed the pipeline worked. These are development observations, not independent device attestation or universal compatibility.

Reference for that comparison: the Preview Explorer public record for block #25, envelope version 2. Block hash: 1c22442d63f6ddd6cce9d70906a6db100b50a811929ae55529b609b536a46850. WLS proof commitment: ca8cb6b57a86d77ef152491ec35446b45a76a79aeca6a5806e67ef2ec979cc8d. These public values are a comparison reference, not the private proof, the value used to open its commitment, a live production block, or an independent checkpoint.

Automated checks covered owner-only export, exact receipt binding, refusal before inclusion, incompatible or altered evidence, and unchanged legacy behavior. Tests used isolated PostgreSQL and disposable signing keys. Chromium and WebKit exercised offline replay and block matching with the verifier host stopped. Neither these bounded tests nor the dated audit records are an independent security certification or a full release regression.

Download audit summary produces a redacted local report of the proof checks and replay status. It is not a proof, cannot be re-imported as one, and is not a substitute for comparing the block-link result.

## What independent means today

The verifier is a separate application and runs the proof checks and shared WLS runtime on the reviewing device. It does not send proofs to the NexusOS backend or require a NexusOS account for verification. The working pilot is shared-origin Workspace Preview, with a disposable issuing key. It is not independently distributed and does not establish a second independently written compiler or VM.

A reproducible standalone release candidate exists and trusts synthetic examples only. The shared-origin production artifact serves a notice, not the pilot verifier. A production release needs a separately controlled HTTPS origin and release process, authenticated builds, independent review and an approved issuer-key policy. Signed offline trust updates have been rehearsed with test authority; no offline client learns of a compromise on its own.

## Whole-chain history is a separate milestone

The current build checker matches one public block against a signed receipt. It does not export or independently validate the complete WLS build chain. A future history export would identify the record domain and supply its versioned public blocks so a verifier could recompute and check every previous-hash link, without exporting private payloads.

A published GitHub genesis reference is useful only after its exact bytes and hash are established for the same record domain and pinned to a specific revision. Do not assume a NexusOS genesis reference is the first WLS build block. Two different histories can share a genesis and both have internally consistent links. An independently obtained later checkpoint can distinguish which history was recorded up to that checkpoint. No full-chain export, new external checkpoint or independent consensus is claimed here.
