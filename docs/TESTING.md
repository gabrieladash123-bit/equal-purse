# Verification layers

## 56 direct tests

`python -m pytest tests/direct -q` runs the real pinned direct VM with mocked web and model responses. Successful ballot cases explicitly invoke `direct_vm.run_validator()`. Validator tests change one independently extracted project decision, fetched source bytes, or each substantive audit boolean and require rejection.

| Area | Checks |
| --- | --- |
| Complete stateful elections | FILLED, UNDERFILLED, REVIEW; reverse cast order; immutable terminal state |
| Authorization | Unregistered sender, duplicate ballot, fixed voter/project configuration |
| Source acquisition | Hash binding, voter identity, duplicate JSON keys, non-UTF8, size limits, invalid source schema, HTTP 4xx/5xx |
| Decision validation | Complete ordered project list, exact enum decisions, valid bounded integer anchors, strict true audit booleans |
| Atomicity and liveness | Failed cast can retry; incomplete roster cannot close; closed election rejects changes |
| Allocation | Exact fractional cap, exhausted payer, supporter-only charges, nonnegative remaining balances, no forced filling |

Two of the 56 tests contain mathematical case loops: all **1,536** three-voter/three-project approval elections across three seat counts, and **512** seeded fractional-cap cases. These are case checks within two tests, not thousands of separate pytest tests. Their oracle enumerates saturated payer subsets; production uses a sorted-balance sweep. A separate regression passes native Address objects to the constructor, matching live GenVM calldata rather than direct mode's raw byte addresses.

These tests verify control flow and accounting under supplied model outputs. They do not prove model interpretation accuracy, prompt-injection immunity or distributed validator agreement.

## Public CI

The `Contract checks` workflow repeats pinned GenVM lint, the 56 direct tests, the independent JavaScript scenario oracle and JavaScript syntax checks on Linux/Python 3.13/Node 24. Local reports are saved as JUnit XML under `proofs/`.

## Live scenario proofs

The separate manually dispatched workflow uses GenLayer CLI 0.39.2 and six encrypted disposable signing accounts on gasless StudioNet, chain 61999. It deploys three independent elections and runs a fixed sequence of casts, closes and expected rejections. Keys and passwords are never exported to proof artifacts.

`scripts/verify-proofs.cjs` re-fetches public receipts, checks strict majority including idle votes, validates actual transaction calldata/target/signer, compares deployed source bytes, verifies all committed source documents and classifications, replays complete state snapshots, independently recomputes exact allocation, and compares current onchain state with the recorded final state.

To verify downloaded artifacts without network, use `node scripts/verify-proofs.cjs --offline`. For fresh verification omit `--offline`, set `GENLAYER_CLI_PATH` to the installed `genlayer/dist/index.js`, and optionally set `PURSE_ACCOUNT` to an existing local CLI account for view calls. Fresh verification is read-only and does not need the disposable voter keys. The verifier writes a sanitized `proofs/verification.json` summary only after every check passes.

See [proof receipts and scenario results](../proofs/README.md) for actual outcomes. Lifecycle finality alone is never reported as successful execution.
