import React from "react";

/** Keep the broadcast page and public guide's privacy disclosure consistent. */
export function LivePrivacyNotice({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="Live broadcasting privacy and free use"
      data-testid="live-privacy-notice"
      className={`space-y-3 text-sm leading-relaxed ${className}`}
    >
      <h2 className="text-lg font-semibold">Privacy and free use</h2>
      <p>
        <strong>Free live broadcasting.</strong> There is no platform charge to
        start or watch a live broadcast. Mobile-data and internet-provider charges
        may still apply.
      </p>
      <p>
        <strong>Choose private for confidential conversations.</strong> Private
        rooms are restricted to the broadcaster and invited, signed-in
        participants. Public broadcasts are discoverable by others; do not put
        confidential personal information in public titles or broadcasts.
      </p>
      <p>
        <strong>Live media is encrypted in transit using WebRTC.</strong> Broadcasts
        are not automatically recorded. Optional recording controls and
        participants recording what they receive mean confidentiality cannot be
        guaranteed after information is shared.
      </p>
      <p>
        <strong>This is not a zero-data-tracking service.</strong> Account,
        invitation and room-participation records are retained. Website traffic,
        security and operational logs can include IP addresses, browser details,
        request paths and activity times. Direct P2P connections can also reveal
        network addresses to the other participant.
      </p>
    </section>
  );
}
