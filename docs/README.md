# 📚 Documentation

Welcome to the Manhwa Discovery documentation! This directory contains all project documentation and guides.

## 📖 Available Documentation

### For Contributors

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Complete contributor guide
  - Development environment setup
  - Coding standards (Python & JavaScript)
  - Commit conventions
  - Version management with Commitizen
  - Pull request process
  - Testing guidelines

- **[VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)** - Detailed version management guide
  - Quick reference for Commitizen commands
  - Semantic versioning explained
  - Conventional commits examples
  - Pre-commit hooks setup
  - Maintainer release workflow
  - Troubleshooting guide

### Project Policies

- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community standards and expectations
  - Expected behavior
  - Unacceptable behavior
  - Enforcement guidelines
  - Reporting procedures

- **[SECURITY.md](SECURITY.md)** - Security policies and vulnerability reporting
  - Supported versions
  - Reporting vulnerabilities
  - Security best practices
  - Response timeline
  - Hall of Fame for security researchers

### Project History

- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
  - All notable changes documented
  - Follows [Keep a Changelog](https://keepachangelog.com/) format
  - Semantic versioning changelog
  - Release notes for each version

## 🚀 Quick Links

### Getting Started
- [Main README](../README.md) - Project overview and quick start
- [Contributing Guide](CONTRIBUTING.md#getting-started) - First-time setup
- [Development Environment](CONTRIBUTING.md#development-environment) - Local setup

### Development
- [Coding Standards](CONTRIBUTING.md#coding-standards) - Style guides
- [Commit Conventions](CONTRIBUTING.md#commit-conventions) - Message format
- [Version Management](VERSION_MANAGEMENT.md) - Using Commitizen

### Technical Details
- [Root AGENTS.md](../AGENTS.md) - Complete architecture knowledge base
- [Backend AGENTS.md](../backend/AGENTS.md) - Backend-specific documentation
- [Frontend AGENTS.md](../frontend/AGENTS.md) - Frontend-specific documentation

### Support
- [Security Policy](SECURITY.md) - Report vulnerabilities
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines
- [GitHub Issues](https://github.com/tahmidul612/manhwa-discovery/issues) - Bug reports
- [GitHub Discussions](https://github.com/tahmidul612/manhwa-discovery/discussions) - Questions & ideas

## 📝 Documentation Standards

All documentation in this project follows these standards:

- **Format**: Markdown with frontmatter where applicable
- **Style**: Clear, concise, and beginner-friendly
- **Structure**: Hierarchical headings with table of contents
- **Links**: Relative paths for internal links
- **Examples**: Real-world examples with code blocks
- **Updates**: Keep in sync with code changes

## 🤝 Contributing to Documentation

Found a typo or want to improve the docs? We welcome documentation contributions!

1. Documentation changes don't require a full development setup
2. Edit the files directly or use GitHub's web interface
3. Follow the [Contributing Guide](CONTRIBUTING.md)
4. Use commit type `docs:` for documentation changes
5. Documentation changes don't bump the version

Example:
```bash
git commit -m "docs(contributing): add section on testing guidelines"
```

## 📌 Documentation Maintenance

### Keeping Docs Updated

When making code changes, remember to update related documentation:

| Change Type | Update These Docs |
|-------------|-------------------|
| New feature | README.md, CHANGELOG.md, relevant AGENTS.md |
| API changes | AGENTS.md, API documentation in code |
| New dependency | CONTRIBUTING.md (if affects setup) |
| Breaking change | CHANGELOG.md, CONTRIBUTING.md, README.md |
| Security fix | SECURITY.md, CHANGELOG.md |

### Documentation Review Checklist

Before submitting documentation changes:

- ✅ Spelling and grammar checked
- ✅ All links work (especially relative paths)
- ✅ Code examples tested and working
- ✅ Screenshots updated (if UI changed)
- ✅ Table of contents updated (if structure changed)
- ✅ Follows existing style and format
- ✅ No sensitive information exposed

---

<div align="center">

**Need Help?**

📖 [Ask in Discussions](https://github.com/tahmidul612/manhwa-discovery/discussions) | 🐛 [Report Issues](https://github.com/tahmidul612/manhwa-discovery/issues)

</div>
