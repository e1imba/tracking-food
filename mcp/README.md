# MCP integration policy

Integrations are optional and added incrementally. Prefer GitHub integration for issues and PRs; Playwright for UI tests with synthetic data; Context7 for library documentation if the provider and permissions are verified; Figma only once there is a design. PostgreSQL integration, if needed, is restricted to the development database and preferably read-only. Never connect production credentials by default. Verify support in both Codex Cloud and local IDE before configuration.
