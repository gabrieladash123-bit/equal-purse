# Deployment proofs

Live proof collection is pending. No deployment address or successful consensus receipt is claimed yet.

The published workflow deploys three separate election instances, casts authorized ballots with six disposable encrypted CLI accounts, checks FILLED/UNDERFILLED/REVIEW, and exercises missing-ballot, duplicate-ballot, unregistered-voter and repeated-close rejection. It preserves raw vote counts and expected execution failures in sanitized receipts.

The verifier checks deployed source bytes, exact decoded constructor/call arguments, actual signers, strict majority including idle votes, fixture commitments, every source decision, complete snapshot transitions and exact-rational allocation against an independent payer-subset oracle.
