# 🔖 Version Management Guide

This project uses [Commitizen](https://commitizen-tools.github.io/commitizen/) for automated semantic versioning and changelog generation.

## Quick Reference

### Check Current Version

```bash
uv run cz version -p
```

### Create a Commit (Interactive)

```bash
uv run cz commit
```

This opens an interactive prompt to create properly formatted conventional commits.

### Preview Version Bump

```bash
uv run cz bump --dry-run
```

Shows what version would be created based on commits since last tag.

### Bump Version

```bash
# Automatic bump based on commits
uv run cz bump

# With changelog update
uv run cz bump --changelog

# Manual increment
uv run cz bump --increment PATCH
uv run cz bump --increment MINOR
uv run cz bump --increment MAJOR
```

### Generate/Update Changelog

```bash
uv run cz changelog
```

## How It Works

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

| Component | When to Bump | Triggered By |
|-----------|--------------|--------------|
| MAJOR | Breaking changes | `feat!:`, `fix!:`, `BREAKING CHANGE:` |
| MINOR | New features | `feat:` |
| PATCH | Bug fixes, improvements | `fix:`, `perf:`, `refactor:` |

### Conventional Commits

Format: `<type>(<scope>): <description>`

**Types:**
- `feat:` - New feature (bumps MINOR)
- `fix:` - Bug fix (bumps PATCH)
- `perf:` - Performance improvement (bumps PATCH)
- `refactor:` - Code refactoring (bumps PATCH)
- `docs:` - Documentation only (no bump)
- `style:` - Formatting changes (no bump)
- `test:` - Tests only (no bump)
- `chore:` - Maintenance tasks (no bump)
- `ci:` - CI/CD changes (no bump)

**Breaking Changes:**
Add `!` after type or add `BREAKING CHANGE:` in commit body to trigger MAJOR bump.

### Examples

```bash
# Patch bump (0.1.0 → 0.1.1)
git commit -m "fix(auth): resolve JWT expiration issue"

# Minor bump (0.1.0 → 0.2.0)
git commit -m "feat(search): add fuzzy matching for alt titles"

# Major bump (0.1.0 → 1.0.0) - only when not in 0.x.x
git commit -m "feat(api)!: change response format

BREAKING CHANGE: Search results now return nested objects"
```

## Configuration

Location: `pyproject.toml`

```toml
[tool.commitizen]
name = "cz_conventional_commits"
version = "0.1.0"
version_scheme = "pep440"
version_provider = "pep621"
update_changelog_on_bump = true
major_version_zero = true
tag_format = "v$version"
changelog_file = "CHANGELOG.md"

version_files = [
    "pyproject.toml:^version",
    "backend/__init__.py:^__version__",
]
```

### Key Settings

- **major_version_zero**: While in `0.x.x`, breaking changes bump MINOR instead of MAJOR
- **version_scheme**: Uses PEP 440 (Python standard)
- **tag_format**: Creates tags like `v0.1.0`
- **version_files**: Automatically updates version in these files

## Pre-commit Hooks

### Installation

```bash
uv run pre-commit install --hook-type commit-msg --hook-type pre-push
```

### What Gets Checked

- ✅ Commit messages follow conventional format
- ✅ Python code formatting (Black)
- ✅ Python linting (Ruff)
- ✅ Trailing whitespace
- ✅ YAML syntax
- ✅ File size limits
- ✅ Merge conflicts

### Manual Run

```bash
uv run pre-commit run --all-files
```

## Maintainer Workflow

### Creating a Release

```bash
# 1. Ensure clean working directory
git status

# 2. Fetch latest changes
git pull origin main

# 3. Review commits since last release
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# 4. Bump version and update changelog
uv run cz bump --changelog

# 5. Review changes
git show HEAD
cat CHANGELOG.md

# 6. Push with tags
git push origin main --follow-tags
```

### Version History

```bash
# List all version tags
git tag -l

# Show specific tag
git show v0.1.0

# See commits between versions
git log v0.1.0..v0.2.0 --oneline
```

## Troubleshooting

### "No commits to bump"

This means no commits since the last tag are eligible for version bumping (only docs, tests, chore commits).

**Solution:**
```bash
# Force a patch bump
uv run cz bump --increment PATCH --allow-no-commit
```

### "Version inconsistency detected"

Version in `pyproject.toml` doesn't match version files.

**Solution:**
```bash
# Check current versions
grep "version" pyproject.toml
grep "__version__" backend/__init__.py

# Manually fix inconsistencies, then bump
uv run cz bump --check-consistency
```

### "No tag matching configuration"

No git tag exists yet for the current version.

**Solution:**
```bash
# Create initial tag manually
git tag -a v0.1.0 -m "chore: initial release"

# Or use commitizen
uv run cz bump --yes
```

## Resources

- [Commitizen Documentation](https://commitizen-tools.github.io/commitizen/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

## FAQ

**Q: What happens to version when I run `cz bump`?**

A: Commitizen:
1. Analyzes commits since last tag
2. Determines increment type (MAJOR/MINOR/PATCH)
3. Updates version in all configured files
4. Updates CHANGELOG.md (if `--changelog` used)
5. Creates a git commit with the changes
6. Creates an annotated git tag

**Q: Can I manually set the version?**

A: Yes, but it's not recommended:
```bash
uv run cz bump 1.0.0
```

**Q: How do I skip the changelog update?**

A: Don't use the `--changelog` flag:
```bash
uv run cz bump  # No changelog update
```

**Q: What if I made a mistake in a commit message?**

A: Amend the commit before bumping:
```bash
git commit --amend
# Then bump as normal
```

**Q: Why is MAJOR version still 0?**

A: The project is configured with `major_version_zero = true`, meaning it's in initial development. Breaking changes bump MINOR until you're ready for 1.0.0.

To create 1.0.0, remove `major_version_zero` from config and make a breaking change commit.
