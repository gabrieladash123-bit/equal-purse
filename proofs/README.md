# Deployment proofs

The [successful CLI proof workflow](https://github.com/gabrieladash123-bit/equal-purse/actions/runs/39223477938) deployed three election instances on **gasless StudioNet, chain 61999**, a simulation network. These are not Bradbury or mainnet deployments. Contract source SHA-256: `6377139473d89477b745221c8d1eda864c33cc3621c0429e8097ab95ee8da993`; source commit `d262fc6991dd2fed08d32b5a55eb55c4ca851ca0`; fixture commit `4bada07e9ccfdac31ae2739d090f7d6d69cd3269`.

The canonical suite contains **23 distinct FINALIZED / MAJORITY_AGREE receipts: 19 successful executions and 4 expected ERROR executions**. Six disposable signing wallets cast 13 source-bound ballots across the three elections. There are 3 deployments and 3 successful closes. Provider configuration is removed from receipts; execution results, source bytes, call data, actual signers and vote maps are preserved. Idle votes are included in quorum denominators and never counted as agreement.

The verifier checks deployed source bytes, exact decoded constructor/call arguments, actual signers, strict majority including idle votes, fixture commitments, every source decision, complete snapshot transitions and exact-rational allocation against an independent payer-subset oracle.

## Election outcomes

| Scenario | Contract | Final result | Deploy | Close and snapshot |
| --- | --- | --- | --- | --- |
| Six voters; majority approves three projects, minority approves transit | [`0x02789e48c9dAF370A2b4d4160BfFEc3edb65e2DC`](https://explorer-studio.genlayer.com/address/0x02789e48c9dAF370A2b4d4160BfFEc3edb65e2DC) | FILLED: library, clinic, transit | [5/0/0 votes](https://explorer-studio.genlayer.com/tx/0xc07b18bcc2bb68c9b24f4a7dab2bf2ad636eb3a0af61f05255c978de2ddd8dba) | [Close: 5/0/0](https://explorer-studio.genlayer.com/tx/0x6cac9b343c3909dd74513e5319135eb0bf0d4fecfa2ff45f19f1487e48040495), [state](representation-final-state.json), [complete trace](representation-trace.json) |
| Overlapping supporters and an exhausted payer | [`0xD1842F687163290610778539ea28A9D407d9F6ff`](https://explorer-studio.genlayer.com/address/0xD1842F687163290610778539ea28A9D407d9F6ff) | UNDERFILLED: library, clinic; one seat remains empty | [5/0/0 votes](https://explorer-studio.genlayer.com/tx/0x21d8bac2c969d01a2ff703eca867d0d84f34e7ea7095ce42920c1c282fef70b7) | [Close: 4/0/1](https://explorer-studio.genlayer.com/tx/0x951cf9e988bedc838377532cefb782f440c5545ad6236c73471b2625a5561fac), [state](capped-payment-final-state.json), [complete trace](capped-payment-trace.json) |
| Garden approval depends on an undecided grant | [`0x7bdD307b5f680092F754eC8ac7932A6e13fdEa46`](https://explorer-studio.genlayer.com/address/0x7bdD307b5f680092F754eC8ac7932A6e13fdEa46) | REVIEW: no winners or spending | [5/0/0 votes](https://explorer-studio.genlayer.com/tx/0xc0dd5ffa04d73cb2232a880cb3740fe3fe1ab273c6755a90d2f1464c1806820a) | [Close: 4/0/1](https://explorer-studio.genlayer.com/tx/0x01f375a1148499bf1171565c03a18461fabbe7ed1513118144b9fba2cb124249), [state](conditional-consent-final-state.json), [complete trace](conditional-consent-trace.json) |

Vote counts above are **agree/disagree/idle**, including the leader. All ballot receipts are 3/0/2. The first election spends the four majority voters' budgets on library and clinic, leaving the two transit supporters able to select transit. Raw approval totals with project-order ties would instead select library, clinic and garden.

In the second election, clinic's cap is **7/3**. Amber pays its remaining **5/3**, ochre pays **7/3**, and the two other voters pay zero for clinic. Four units remain collectively, but no unselected project has enough willing supporters; the third seat remains empty. In the third election, jade's garden position is UNKNOWN, so no committee is produced and every two-unit budget remains intact.

## Expected rejection proofs

Each transaction below finalized MAJORITY_AGREE with execution ERROR and preserved the complete prior state. These are passing rejection checks, not successful casts or closes.

| Rejection | Transaction | Votes | Exact error |
| --- | --- | --- | --- |
| Close before all ballots | [Receipt](https://explorer-studio.genlayer.com/tx/0x83f5d31da0ca21b5443a23c374b22a980281299f582c38510ae1731cb0cf8248) | 5/0/0 | Missing ballots |
| Duplicate ballot | [Receipt](https://explorer-studio.genlayer.com/tx/0x20476ccc26c0f8c8c4f636fb8649a622692d281760be0dbe59460ad3119c5b44) | 5/0/0 | Ballot already cast |
| Close a terminal election again | [Receipt](https://explorer-studio.genlayer.com/tx/0xcb80ac7dadd0d9e8cbd82ce826f43ab5a0325f5ff615c477b8450ad360617c4c) | 3/0/2 | Election closed |
| Unregistered wallet casts | [Receipt](https://explorer-studio.genlayer.com/tx/0x9bd4b41ae143f1227f210d080cc5775e127b6e9ffe98351bc6d49d51c371f45b) | 5/0/0 | Voter only |

## Reproduce the verification

[Fresh verification](verification.json), [hosted independent verification](cloud-verification.json), [source-bound transaction journal](transactions.json), [deployment configuration](suite.json), [56 local direct tests](local-direct-tests.xml), [56 hosted direct tests](cloud-direct-tests.xml).

Set `GENLAYER_CLI_PATH` to the installed CLI `genlayer/dist/index.js`; for view calls optionally set `PURSE_ACCOUNT` to an existing local CLI account. Run `node scripts/verify-proofs.cjs` to repeat read-only network checks or add `--offline` to replay saved artifacts. Fresh verification compares all 23 live receipts and all three current election states. The JavaScript oracle independently enumerates saturated payer subsets; it does not copy the contract's sorted-balance sweep.

All source ballots are synthetic and authored in one repository. The six wallets are disposable test participants, not evidence of six distinct people. Consensus interpretation of authorized text does not establish real-world project delivery or independent publisher authenticity. Voting budgets have no monetary backing. [Testing limits](../docs/TESTING.md) distinguish mocked checks from distributed consensus.

## Preserved rejected deployment

The [first deployment](https://explorer-studio.genlayer.com/tx/0x496f0a88bec55b61c0f36823c08807646cc056271819e7da45c1ef5039b7c581) finalized with `MAJORITY_AGREE` but execution `ERROR`: 4 agree, 0 disagree, 1 idle. GenVM supplied native Address objects; the constructor attempted to wrap them again and raised a TypeError. No contract was created. [Sanitized receipt](attempts/39222547418/deployment-receipt.json) and [transaction journal](attempts/39222547418/transactions.json) are retained. This is not a passing deployment proof.

The corrected constructor accepts native Address values directly and converts raw byte addresses only when necessary. A direct regression now supplies native Address objects at constructor decoding, and all 56 tests pass. [Corrected public CI](https://github.com/gabrieladash123-bit/equal-purse/actions/runs/39223471987) and [the corrected live suite](https://github.com/gabrieladash123-bit/equal-purse/actions/runs/39223477938) both passed. The failed attempt is excluded from the canonical 23 receipts.
