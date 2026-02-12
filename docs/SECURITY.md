# 🔒 Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

**Note**: This project is currently in active development. Security updates are applied to the `main` branch.

---

## 🚨 Reporting a Vulnerability

We take the security of Manhwa Discovery seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities. Instead:

1. **Email**: Send details to the project maintainers via GitHub Issues with the label `security` (we'll set up private reporting)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We'll acknowledge your report within **48 hours**
- **Updates**: You'll receive updates on the progress every **5-7 days**
- **Resolution Timeline**: We aim to resolve critical vulnerabilities within **30 days**
- **Disclosure**: Once fixed, we'll coordinate with you on public disclosure timing
- **Credit**: Security researchers who responsibly disclose vulnerabilities will be credited (unless they prefer to remain anonymous)

---

## 🛡️ Security Best Practices

### For Contributors

When contributing to Manhwa Discovery, please follow these security guidelines:

#### Environment Variables & Secrets

- ✅ **NEVER** commit `.env` files
- ✅ **NEVER** commit API keys, tokens, or passwords in code comments
- ✅ Use environment variables for all sensitive configuration
- ✅ Change default secrets (`JWT_SECRET`, `SESSION_SECRET`) in production
- ✅ Store secrets securely (use secret managers in production)

#### Authentication & Authorization

- ✅ Always use JWT authentication via `Depends(get_current_user)` on protected routes
- ✅ Validate all user input before processing
- ✅ Implement rate limiting on authentication endpoints
- ✅ Use secure, random strings for JWT secrets (minimum 32 characters)
- ✅ Set appropriate token expiration times

#### Data Handling

- ✅ Sanitize all user input to prevent injection attacks
- ✅ Use parameterized queries for database operations
- ✅ Encrypt sensitive data at rest (OAuth tokens should be encrypted)
- ✅ Implement proper error handling (don't expose stack traces to clients)
- ✅ Log security-relevant events (failed auth attempts, suspicious activity)

#### Dependencies

- ✅ Keep dependencies up to date
- ✅ Review dependency security advisories regularly
- ✅ Use `uv sync` to maintain lock file integrity
- ✅ Scan for known vulnerabilities before merging PRs

### For Deployment

#### Production Configuration

- ✅ Set `DEBUG=false` in production (prevents information disclosure)
- ✅ Use strong, randomly generated secrets
- ✅ Enable HTTPS/TLS for all external connections
- ✅ Configure CORS properly (don't use `allow_origins=["*"]`)
- ✅ Implement rate limiting on all public endpoints
- ✅ Use secure headers (CSP, HSTS, X-Content-Type-Options, etc.)

#### Database Security

- ✅ Use strong MongoDB authentication credentials
- ✅ Limit MongoDB network exposure (bind to localhost or private network)
- ✅ Enable MongoDB authentication and authorization
- ✅ Regularly backup database with encryption
- ✅ Implement least-privilege access for database users

#### Redis Security

- ✅ Set a strong Redis password (`requirepass` in redis.conf)
- ✅ Limit Redis network exposure (bind to localhost or private network)
- ✅ Disable dangerous Redis commands in production
- ✅ Use Redis ACLs for fine-grained access control

#### Container Security

- ✅ Run containers as non-root users
- ✅ Use minimal base images (Alpine Linux)
- ✅ Scan Docker images for vulnerabilities
- ✅ Keep Docker and docker-compose up to date
- ✅ Don't mount sensitive host directories in containers

---

## ⚠️ Known Security Considerations

The following are known security considerations in the current implementation:

### OAuth Tokens (TODO)

**Status**: ⚠️ In Progress

OAuth tokens from AniList are currently stored unencrypted in MongoDB. This is a known issue that will be addressed in a future update.

**Mitigation**:

- Tokens are stored server-side only (not exposed to frontend)
- Database access is restricted
- Future versions will implement token encryption

**Tracking**: See issue #TBD for progress on token encryption implementation

### Debug Mode

**Status**: ✅ Documented

Setting `DEBUG=true` exposes detailed error messages and stack traces. This is useful for development but **must be disabled in production**.

**Mitigation**:

- `.env.example` sets `DEBUG=false` by default
- Documentation warns against enabling DEBUG in production
- Error handlers return generic messages to clients when DEBUG is off

### Rate Limiting

**Status**: ⚠️ Partial Implementation

Rate limiting is implemented for external APIs (MangaDex) but not yet for all internal endpoints.

**Mitigation**:

- MangaDex client has built-in rate limiting (5 req/sec)
- Middleware structure supports adding rate limiters
- Future versions will add comprehensive rate limiting

---

## 📚 Security Resources

### External API Security

- **AniList API**: Follow [AniList's Terms of Service](https://anilist.co/terms) and [Privacy Policy](https://anilist.co/privacy)
- **MangaDex API**: Follow [MangaDex's Terms of Service](https://mangadex.org/terms) and API guidelines

### Dependencies

- **Python**: Review [Python Security Documentation](https://python.readthedocs.io/en/stable/library/security_warnings.html)
- **FastAPI**: Check [FastAPI Security Utilities](https://fastapi.tiangolo.com/tutorial/security/)
- **React**: Follow [React Security Best Practices](https://react.dev/learn/writing-secure-code)

### Security Scanning Tools

We recommend using these tools for security scanning:

- **Backend**:
  - `bandit` for Python security linting
  - `safety` for dependency vulnerability scanning

- **Frontend**:
  - `npm audit` for JavaScript dependency vulnerabilities
  - `snyk` for comprehensive security scanning

- **Containers**:
  - `trivy` for Docker image scanning
  - `docker scan` for vulnerability detection

---

## 📝 Security Changelog

### Upcoming

- [ ] Implement OAuth token encryption
- [ ] Add comprehensive rate limiting
- [ ] Set up automated security scanning in CI/CD
- [ ] Add Content Security Policy headers
- [ ] Implement request signing for sensitive operations

### Completed

- [x] JWT-based authentication
- [x] CORS configuration
- [x] Input validation with Pydantic
- [x] Secure password handling (not applicable - OAuth only)
- [x] MangaDex API rate limiting

---

## 🤝 Security Contributors

We appreciate security researchers and contributors who help keep Manhwa Discovery secure. If you've responsibly disclosed a vulnerability, you'll be credited here (unless you prefer anonymity).

---

## 📞 Contact

For security-related questions or concerns that aren't vulnerabilities, you can:

- Open a discussion in the [Security category](https://github.com/tahmidul612/manhwa-discovery/discussions/categories/security)
- Check the [FAQ in CONTRIBUTING.md](CONTRIBUTING.md#getting-help)

---

<div align="center">

**Thank you for helping keep Manhwa Discovery secure!** 🙏

</div>
