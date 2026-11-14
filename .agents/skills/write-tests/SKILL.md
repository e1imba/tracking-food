# write-tests

Use synthetic data only. Focus on data integrity, auth/ownership, time zones, edit/delete and regression coverage.

For auth changes, test protected access, expired sessions and sign-out. Verify the
real OAuth flow locally with two Google accounts. Use synthetic identities in CI.
For journal features, test that one account cannot access or change another account's data.

Read `AGENTS.md` and the two canonical specifications before proceeding.
