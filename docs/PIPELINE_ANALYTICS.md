# WavelengthScript pipeline analytics

These events extend the existing shared analytics wrapper. They do not add a
tracker script or change automatic pageview tracking.

| Event | When it fires | Properties |
| --- | --- | --- |
| `pipeline_language_selected` | A visitor deliberately selects a source language | `surface`, `language` |
| `pipeline_stage_result` | A requested compile or execution finishes or fails | `surface`, `stage`, `outcome`, `language`, `mode` |

The surface is `ce_se_pipeline`. Stages are `compile` and `execute`; outcomes are
`success` and `failure`. Python uses `python_vm`; other languages use
`encoding_preview`. A completed preview must not be interpreted as execution of
the original source language. Run-all reports a result for each completed stage.
Execution success is reported only on completion, not when the button is clicked.
Automatic translation, page mounts and cancelled preview animations do not
generate these events. This is outcome instrumentation, not a count of every
attempt, unsupported translation or abandonment.

Only fixed language identifiers and metadata are sent. No source code, output,
exception messages, wallet data or identifiers are included in these events.
The existing wrapper handles missing trackers, exceptions and rejected promises.
These events indicate observed interactions, not verified human identity.

Enable analytics in Publishing settings and publish or republish to collect the
events. The injected tracker is normally absent during development.

Useful questions:
- Which source languages are selected most frequently?
- How do Python VM execution success/failure counts compare?
- How many compile successes are followed by execution successes?

The last comparison is an aggregate comparison, not a proven per-person funnel.
