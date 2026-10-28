# Custom analytics events

Replit's publishing proxy supplies the analytics tracker when analytics is enabled.
Do not add a second tracking script, website ID or analytics environment variables.
Pageviews are automatic. Application events use the shared safe wrapper in
`client/src/lib/analytics.ts`, which tolerates an absent, blocked or failing tracker.

## Research engagement

| Event | Meaning | Properties |
|---|---|---|
| `research_link_opened` | A visitor clicks a repository, numbered disclosure, related-work source or Act link on the transparency page | `surface`, `destination`; `act` for Act links or stable `reference` ID for a related-work source |
| `research_filter_used` | A search settles for 500 ms, or a previously tracked search is cleared | `surface`, `action` (`filter` or `clear`), `result_count` |
| `research_disclosure_opened` | A visitor follows an evidence notice to the transparency record | `surface`, fixed editorial `context` |

Related-work IDs are `colour_alphabet`, `wavelength_shift_keying`, `blackbird`,
`perceval` and `itu_g694_1`. No search terms, hashes of terms, identities, free-form
content, query strings or private document content are sent by these events.
Mounting or re-rendering the page is not a link-click event. Pending filter events
are cancelled on navigation away. Case/whitespace-only changes are deduplicated.

## Campaign contribution funnel

| Event | Meaning | Properties |
|---|---|---|
| `campaign_contribution_started` | The existing contribution mutation begins its request | `surface`, numeric public `tier` |
| `campaign_contribution_result` | The contribution mutation receives a successful response or fails | `surface`, `tier`, `outcome` (`success` or `failure`) |

The result measures the existing `/api/campaign/donate` record/allocation flow.
It is **not proof of an external payment**, settlement or hardware delivery.
No user ID, wallet address, receipt, contract, signature, transaction ID, balance,
exact financial amount or raw error message is included.
Success is not emitted when the modal opens or the submit button is clicked.
Tests mock all requests; they must never issue live contributions to test events.

Existing authentication, wallet, staking, crowdfund, research calculation,
developer and Telegram events remain in place; these additions do not duplicate
those event names or alter access rules.

## Enable collection

Go to Publishing settings, enable analytics, and publish or republish the app.
These code changes take effect on the next publish. Tracker calls are deliberately
safe no-ops in development or while the injected tracker is unavailable.
These are browser-side interaction metrics, not an authoritative financial audit.

Useful questions after data arrives:
- Which Acts and related-work sources receive the most clicks?
- How often do research searches return no results?
- Which campaign tiers have the highest recorded-contribution completion rate?
