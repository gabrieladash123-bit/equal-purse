# EqualPurse

A standalone GenLayer proportional committee selector. Voter-authorized prose ballots become independently verified approval decisions; exact rational equal-share budgets determine the winning committee.

**Deployed on gasless StudioNet, chain 61999:** [`0x02789e48c9dAF370A2b4d4160BfFEc3edb65e2DC`](https://explorer-studio.genlayer.com/address/0x02789e48c9dAF370A2b4d4160BfFEc3edb65e2DC). [Deployment](https://explorer-studio.genlayer.com/tx/0xc07b18bcc2bb68c9b24f4a7dab2bf2ad636eb3a0af61f05255c978de2ddd8dba) · [Three instances and 23 verified receipts](proofs/README.md) · [Passing CI: 56 tests](https://github.com/gabrieladash123-bit/equal-purse/actions/runs/39223471987) · [Submission text](docs/submission.md).

This is a new GenLayer implementation of the established **Method of Equal Shares**, not a claim to have invented the voting rule. Each voter starts with `k` virtual units, each project costs `n`, and supporters pay an equal cap subject to their remaining balances. The affordable project with the lowest cap wins next. Equal caps use immutable project order. There is no forced completion when remaining supporters cannot pay.

## Workflow

1. Deploy with a fixed repository, 3–6 voter IDs and distinct signing wallets, 2–6 project meanings and 1–3 seats.
2. Each registered wallet calls `cast(url, sha256)` once, authorizing its own commit-pinned source document. Ballots contain prose positions, not caller-supplied approval vectors.
3. Leader and validators independently fetch exact bytes and classify every project as APPROVE, REJECT or UNKNOWN. Validators require exact independent agreement and separately audit all source anchors against the complete ballot. Conditions, omissions, contradictions and rankings alone never silently become approval or rejection.
4. After all voters submit, anyone closes. Any UNKNOWN yields REVIEW without a committee or spending. Otherwise exact fraction arithmetic records each cap, payment, remaining balance, affordable alternative and selected project. FILLED and UNDERFILLED are distinct terminal outcomes.

The balances are internal voting accounting. They are not tokens, money, payment promises, service delivery certification or evidence that projects were implemented. The application boundary is a public, auditable committee decision.

## Examples and checks

| Fixture | Result | Distinct behavior |
| --- | --- | --- |
| Four voters approve library/clinic/garden; two approve transit; three seats | library, clinic, transit | Repeated majority approvals spend the same voters' budgets; raw approval totals would select library/clinic/garden |
| Overlapping approval groups; four voters, three seats | library, clinic; UNDERFILLED | Clinic's second-round cap is 7/3; one supporter pays its remaining 5/3 while the other pays 7/3 |
| A ballot conditions garden approval on an undecided grant | REVIEW | UNKNOWN blocks selection; no guess or default rejection |

```sh
pip install -r requirements-dev.txt
genvm-lint download --version v0.2.16
genvm-lint check contracts/equal_purse.py --json
python -m pytest tests/direct -q
node scripts/check-scenarios.cjs
```

- [Pinned contract](contracts/equal_purse.py)
- [Consensus, exact arithmetic and trust model](docs/architecture.md)
- [Direct tests](tests/direct/test_election.py)
- [Testing layers and independent mathematical checks](docs/TESTING.md)
- [Synthetic prose ballots](ballots)
- [Deployment and scenario receipts](proofs/README.md)

## Limits

The voter roster is an explicit trust assumption: wallets do not prove distinct people. Ballots are public and immutable; there is no privacy, delegation, deadline, replacement, Sybil resistance or recovery from a missing voter. A mistaken UNKNOWN requires a new election. Consensus interprets source text; it does not establish independent publisher authenticity or real-world execution. The implementation deliberately exposes underfilling rather than silently adding an alternative completion rule.

The voting algorithm follows [the Method of Equal Shares explanation](https://equalshares.net/explanation/) and [the original paper](https://dominik-peters.de/publications/equal-shares.pdf). The GenLayer source acquisition, signer-bound ballot intake, decision equivalence and auditable accounting form this contract's contribution.
