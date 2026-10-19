# Protocol and consensus boundary

## What requires GenLayer

An external prose mandate can approve a project, reject it, condition approval on an unresolved fact, or merely rank alternatives. Interpreting these distinctions changes who may pay for each project and therefore which committee wins. Callers supply only a URL and raw SHA-256; they cannot supply classifications or computed balances.

The deployment freezes voter ID/signing-wallet pairs and ordered project meanings. The transaction signature authorizes use of the submitted document for that registered voter. The fetched JSON must identify the same voter. This is authorization of a ballot, not proof that a repository publisher controls a wallet or that a voter is a unique human.

Each nondeterministic leader execution fetches the entire document, checks its bytes against SHA-256, rejects duplicate JSON keys, checks the voter identity, and extracts all project decisions. Validators repeat acquisition and extraction without seeing leader decisions in their extraction prompt. Every exact project/vote pair must match. A second audit sees full source, fixed meanings and leader anchors, and must return exact true booleans for both decision correctness and substantive anchor support. Anchors may differ from the validator's own extraction but must resolve to fetched statements and support each proposed decision. No confidence score or numerical tolerance can cross an approval boundary.

HTTP/server, commitment, schema and model errors prevent ballot storage. Validators disagree with unsuccessful nondeterministic executions; a model error cannot become an accepted decision. Deterministic eligibility errors occur before nondeterminism. Direct testing explicitly calls the validator callback; mocked tests do not establish model reliability or distributed consensus.

## Exact allocation

Let `n` be the voter count and `k` the number of seats. Start each voter with budget `k`; each project costs `n`. This is the usual equal-cost rule scaled by `n`, so no floating-point arithmetic is needed.

For a candidate with supporters S, find the smallest nonnegative cap rho satisfying:

`sum(min(balance[i], rho) for i in S) = n`.

A candidate is unaffordable if its supporters' combined balance is less than `n`. Otherwise the implementation sweeps balances in increasing order, saturating low-budget payers until the remaining cost can be equally split. Select the smallest cap, then the immutable project index for exact ties. Pay only from supporters, record every affordable alternative, and repeat until k projects win or none is affordable.

All values use Python Fraction in deterministic GenVM execution. Serialized fractions are reduced `[numerator, denominator]` pairs. Each step pays exactly n, all balances remain nonnegative, and total remaining budget is `n*(k-number_of_winners)`. Unused aggregate budget alone cannot buy a project: it must belong to that project's supporters. There is no transfer of unused budget between voters.

The separate JavaScript proof oracle enumerates every possible set of saturated payers instead of copying the production balance sweep. Python tests use a second subset-enumeration oracle over all 1,536 three-voter/three-project approval elections and 512 seeded fractional cap cases. Tests also cover each stateful fixture and explicitly replay validators.

## Storage and lifecycle

`voters_json` and `projects_json` freeze policy. A TreeMap stores one complete source-bound ballot per voter, including normalized source statements, URL/hash, approval decisions and indices. `ballot_count` bounds close readiness. `result_json` stores the terminal committee and accounting trace; `closed` prevents later casts or recounts. There is no editable owner policy, versioned graph proposal, certificate issuance or redemption mechanism.

Submission order cannot alter results: ballots are read in immutable voter order. Voters cannot cast on behalf of another roster member. Each voter may authorize the same hash only if its source identity matches; there is no global commitment-consumption lifecycle across elections.

Only a complete roster can close. UNKNOWN gives REVIEW with no spending, even if other known votes would suffice to elect some candidates. This intentionally conservative terminal behavior and the absence of a deadline are explicit liveness limitations. No published EJR or other fairness theorem is claimed for an incomplete/UNKNOWN election. No optional completion algorithm is applied to an underfilled outcome.

## Operational boundary

The frontend and indexer, if built separately, may preview public ballots. They cannot authorize a cast, determine approvals or change balances. Source publishers provide texts; no external reality is certified. Downstream applications may read the selected committee but must decide their own implementation, custody and execution policy. The contract holds and sends no funds.

References: [Method of Equal Shares](https://equalshares.net/explanation/), [Peters, Pierczynski and Skowron, Proportional Participatory Budgeting with Additive Utilities](https://dominik-peters.de/publications/equal-shares.pdf).
