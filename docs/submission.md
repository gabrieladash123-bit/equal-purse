Category: **Builder → Intelligent Contracts**

Title: **EqualPurse: Consensus equal-shares committee selection**

Notes / Description:

> EqualPurse implements the Method of Equal Shares as a standalone GenLayer committee selector. Registered wallets authorize commit-pinned prose ballots. Leader and validators independently fetch full texts, verify SHA-256 and classify every project as APPROVE, REJECT or UNKNOWN; exact vote agreement and source-anchor audits gate storage. Exact rational water-filling selects the lowest affordable payment cap, charges only supporters and records balances. UNKNOWN blocks selection; unaffordable seats stay empty. Three gasless StudioNet instances demonstrate minority representation, a 7/3 cap with an exhausted payer, and conditional-consent REVIEW. All 23 finalized MAJORITY_AGREE receipts match decoded calls and fresh state; four are expected authorization/lifecycle errors. Includes 56 direct tests, 1,536 small-election checks and 512 fractional-cap cases. Fixtures are synthetic, voting units are not money, and the fixed roster is a trust assumption.

Evidence:

- [Repository](https://github.com/gabrieladash123-bit/equal-purse)
- [Contract source](https://github.com/gabrieladash123-bit/equal-purse/blob/main/contracts/equal_purse.py)
- [StudioNet contract explorer](https://explorer-studio.genlayer.com/address/0x02789e48c9dAF370A2b4d4160BfFEc3edb65e2DC)
- [Deployment transaction](https://explorer-studio.genlayer.com/tx/0xc07b18bcc2bb68c9b24f4a7dab2bf2ad636eb3a0af61f05255c978de2ddd8dba)
- [All three instances and onchain proofs](https://github.com/gabrieladash123-bit/equal-purse/blob/main/proofs/README.md)
- [Passing public CI](https://github.com/gabrieladash123-bit/equal-purse/actions/runs/39223471987)
- [Passing live proof workflow](https://github.com/gabrieladash123-bit/equal-purse/actions/runs/39223477938)
