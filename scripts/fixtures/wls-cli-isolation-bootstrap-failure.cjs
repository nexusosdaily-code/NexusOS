// Synthetic entrypoint startup failure, after the isolation guard but before any CLI.
// No environment reads, external services or user-controlled error contents.
throw new Error("WLS_SYNTHETIC_BOOTSTRAP_FAILURE");
