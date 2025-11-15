# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The AERAS team takes the security of our software seriously. If you believe you have found a security vulnerability in the Puller App, please report it to us as described below.

### Where to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:
- **Email**: [Your security email here]
- **GitHub Security Advisory**: [Use GitHub's private vulnerability reporting](https://github.com/u2204125/aeras-puller-app/security/advisories/new)

### What to Include

Please include the following information in your report:
- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### Response Timeline

- We will acknowledge your report within **48 hours**
- We will provide a detailed response within **7 days** indicating next steps
- We will keep you informed of the progress towards a fix
- We may ask for additional information or guidance

### Security Considerations for PWA

#### Data Storage
- **LocalStorage**: Used for non-sensitive data only (user preferences, UI state)
- **SessionStorage**: Temporary data cleared on app close
- **IndexedDB**: Not used for sensitive authentication tokens
- **Service Worker Cache**: Only caches public assets, never sensitive data

#### Authentication
- JWT tokens stored securely (httpOnly cookies preferred in production)
- Phone number validation on both client and server
- No hardcoded credentials or API keys in source code
- Environment variables for all sensitive configurations

#### Network Security
- **HTTPS Only**: Enforced for all API calls in production
- **WebSocket Security**: wss:// protocol in production
- **CORS**: Properly configured on backend
- **Content Security Policy**: Implemented to prevent XSS

#### Service Worker Security
- Service worker only caches public assets
- No sensitive data in cache storage
- Cache invalidation on version updates
- Secure communication between app and service worker

#### Location Privacy
- GPS coordinates sent over encrypted connections
- User consent required before location tracking
- Location data only shared with authorized backend
- No third-party location tracking

#### Common Vulnerabilities Mitigated
- ✅ XSS (Cross-Site Scripting): React's built-in escaping + CSP
- ✅ CSRF: Token-based authentication
- ✅ Man-in-the-Middle: HTTPS/WSS enforced
- ✅ Injection Attacks: Input validation and sanitization
- ✅ Insecure Dependencies: Regular npm audit runs

### Security Best Practices for Contributors

1. **Never commit**:
   - API keys, tokens, or secrets
   - Private keys or certificates
   - Passwords or connection strings
   - `.env` files with real credentials

2. **Always**:
   - Use environment variables for configuration
   - Validate and sanitize user inputs
   - Use HTTPS in production
   - Run `pnpm audit` before PRs
   - Follow the principle of least privilege

3. **Code Review**:
   - All changes require security review
   - Pay special attention to authentication flows
   - Review third-party dependencies carefully

### Security Updates

- Security patches released as soon as possible
- Critical vulnerabilities fixed within 24-48 hours
- Users notified via GitHub releases and README
- CHANGELOG.md updated with security fixes

### Dependency Security

We use automated tools to monitor dependencies:
- `pnpm audit` run regularly
- Dependabot alerts enabled on GitHub
- Regular updates to patch known vulnerabilities
- Manual review of dependency changes

### Responsible Disclosure

We practice responsible disclosure:
1. Security vulnerabilities are patched before public disclosure
2. Credit given to reporters (unless they prefer to remain anonymous)
3. Public disclosure only after fix is widely deployed

## Additional Resources

- [OWASP PWA Security](https://owasp.org/www-project-mobile-top-10/)
- [Web App Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Service Worker Security](https://web.dev/service-worker-security/)

---

Thank you for helping keep AERAS Puller App and our users safe!
