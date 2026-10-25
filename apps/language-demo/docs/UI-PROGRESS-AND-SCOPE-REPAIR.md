# Studio feedback and workflow-scope repair

The reported Create Exchange grey button was the saved-exchange state, not an inference request. The subsequent EXECUTION_SCOPE_MISMATCH was a comparison approval being used from the separate manual sender workspace, not incompatible models.

Changes:
- Explain that Create Exchange saves locally and remains disabled; direct the user to Run interpreter.
- Show an accessible live progress banner with elapsed time and the currently recorded model/role. Polling reads state only; it does not infer. Disable buttons while the operation is pending.
- Point manual-workspace users to the paired Start Comparison path.
- Show already configured interpreter/recipient identities without asking users to configure five roles. No model or provider default changed.
- Expose a separate manual plan and explicit manual authorization action. Changing workflow revokes approval and records the scope transition; restart never restores authorization. The backend cross-scope inference gate remains in place.
- Disable manual inference controls when comparison scope is active and explain both recovery paths in plain English.

Verification: 51 Studio tests passed. Real Chromium verified delayed injected-model progress, local-only creation, saved-state/reload guidance, blocked cross-scope controls and explicit manual approval recovery. Provider adapter UI and comparison review/failure regressions passed; earlier legacy Simple progress regression also passed. No real provider requests, manuscript changes, commits or pushes. git diff --check passed. Previous evidence directories were not rewritten.

Restart the running Node server with its existing command and data directory, then reload the page to pick up the backend repair. For LC-02 use Start Comparison, not the manual Create Exchange / Run interpreter sequence. For a manual exchange, approve its own displayed plan under Request limits and remote execution gate, then use Run interpreter. No model changes are needed to fix this error.
