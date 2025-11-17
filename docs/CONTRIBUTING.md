# Contributing to NexusOS Advance Systems

Thank you for your interest in contributing to NexusOS! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [How to Contribute](#how-to-contribute)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Documentation](#documentation)
8. [Pull Request Process](#pull-request-process)
9. [Community](#community)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive Behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable Behavior:**
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Python 3.11+** installed
- **PostgreSQL 14+** running
- **Git** for version control
- Basic understanding of:
  - Streamlit framework
  - SQLAlchemy ORM
  - NumPy/SciPy
  - DAG-based systems

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/nexusos-advance-systems.git
cd nexusos-advance-systems

# Add upstream remote
git remote add upstream https://github.com/original/nexusos-advance-systems.git
```

---

## Development Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Install core dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt
```

### 3. Set Up Database

```bash
# Create database
createdb nexusos_dev

# Set environment variable
export DATABASE_URL="postgresql://localhost/nexusos_dev"
```

### 4. Initialize Database Schema

```bash
python -c "from models import Base, engine; Base.metadata.create_all(engine)"
```

### 5. Run the Application

```bash
streamlit run app.py --server.port 5000
```

---

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

#### 🐛 Bug Reports

Found a bug? Please create an issue with:
- Clear, descriptive title
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (OS, Python version, etc.)
- Screenshots (if applicable)

**Bug Report Template:**
```markdown
**Description:**
Brief description of the bug

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior:**
What you expected to happen

**Actual Behavior:**
What actually happened

**Environment:**
- OS: [e.g., Ubuntu 22.04]
- Python: [e.g., 3.11.5]
- PostgreSQL: [e.g., 14.9]

**Additional Context:**
Any other relevant information
```

#### ✨ Feature Requests

Have an idea? Create an issue with:
- Clear, descriptive title
- Use case / problem it solves
- Proposed solution
- Alternatives considered

#### 📚 Documentation Improvements

- Fix typos, grammar, or formatting
- Add examples or clarifications
- Translate documentation
- Create tutorials or guides

#### 🧪 Testing

- Add unit tests
- Add integration tests
- Improve test coverage
- Add performance benchmarks

#### 💻 Code Contributions

See [Pull Request Process](#pull-request-process) below.

---

## Coding Standards

### Python Style Guide

We follow [PEP 8](https://pep8.org/) with some modifications:

#### Code Formatting

```bash
# Use black for auto-formatting
black .

# Use isort for import sorting
isort .
```

#### Type Hints

Always use type hints for function signatures:

```python
# Good
def calculate_nexus(alpha: float, beta: float, N: float) -> float:
    return alpha * N + beta

# Bad
def calculate_nexus(alpha, beta, N):
    return alpha * N + beta
```

#### Docstrings

Use Google-style docstrings:

```python
def run_simulation(params: dict, timesteps: int) -> dict:
    """Run economic simulation with given parameters.
    
    Args:
        params: Dictionary of simulation parameters (alpha, beta, etc.)
        timesteps: Number of timesteps to simulate
    
    Returns:
        Dictionary containing time-series results (N, I, B, etc.)
    
    Raises:
        ValueError: If parameters are invalid
        
    Example:
        >>> params = {'alpha': 0.5, 'beta': 0.3}
        >>> results = run_simulation(params, timesteps=1000)
    """
    pass
```

#### Naming Conventions

```python
# Variables and functions: snake_case
user_balance = 100
def calculate_total_value():
    pass

# Classes: PascalCase
class NexusEngine:
    pass

# Constants: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMESTEPS = 1000

# Private methods/attributes: leading underscore
def _internal_helper():
    pass
```

### Project-Specific Guidelines

#### 1. Modular Design

Keep components independent:

```python
# Good: Clear separation
from nexus_engine import NexusEngine
from signal_generator import SignalGenerator

engine = NexusEngine()
signals = SignalGenerator().generate()

# Bad: Tight coupling
class NexusEngine:
    def __init__(self):
        self.signals = self._generate_signals()  # Embedded logic
```

#### 2. Error Handling

Always use specific exceptions:

```python
# Good
if alpha < 0:
    raise ValueError(f"Alpha must be non-negative, got {alpha}")

# Bad
if alpha < 0:
    raise Exception("Bad alpha")
```

#### 3. Performance-Critical Code

Use Numba JIT for loops:

```python
from numba import jit

@jit(nopython=True)
def fast_calculation(array: np.ndarray) -> float:
    total = 0.0
    for i in range(len(array)):
        total += array[i] ** 2
    return total
```

#### 4. Database Queries

Always use SQLAlchemy ORM (never raw SQL):

```python
# Good
session.query(User).filter(User.username == username).first()

# Bad
session.execute(f"SELECT * FROM users WHERE username = '{username}'")
```

---

## Testing Guidelines

### Test Structure

```
tests/
├── test_nexus_engine.py
├── test_wavelength_crypto.py
├── test_task_orchestration.py
├── test_multi_agent.py
└── ...
```

### Writing Tests

Use `pytest` framework:

```python
import pytest
from nexus_engine import NexusEngine

def test_nexus_conservation_law():
    """Test that conservation law holds during simulation."""
    params = {'alpha': 0.5, 'beta': 0.3, 'delta': 0.1}
    engine = NexusEngine(params)
    results = engine.run_simulation(timesteps=100)
    
    # Check conservation: N = I_cum - B_cum
    final_N = results['N'][-1]
    total_issuance = sum(results['I'])
    total_burn = sum(results['B'])
    
    assert abs(final_N - (total_issuance - total_burn)) < 0.01

def test_invalid_parameters():
    """Test that invalid parameters raise ValueError."""
    with pytest.raises(ValueError):
        NexusEngine({'alpha': -1})  # Negative alpha
```

### Running Tests

```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_nexus_engine.py

# Run with coverage
pytest --cov=. --cov-report=html tests/

# Run specific test
pytest tests/test_nexus_engine.py::test_nexus_conservation_law
```

### Coverage Requirements

- New code must have **>80% coverage**
- Critical paths (economic simulation, crypto) must have **>95% coverage**

---

## Documentation

### Code Documentation

- **All public functions** must have docstrings
- **All classes** must have class-level docstrings
- **Complex algorithms** must have inline comments

### README Updates

If adding a new feature:
1. Update the Features section
2. Add usage example
3. Update architecture diagram (if applicable)

### Whitepaper Updates

For theoretical contributions:
1. Add section to `WHITEPAPER.md`
2. Include mathematical formulations
3. Add references

---

## Pull Request Process

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch Naming Convention:**
- Features: `feature/description`
- Bug fixes: `bugfix/description`
- Documentation: `docs/description`
- Performance: `perf/description`

### 2. Make Changes

- Write code following coding standards
- Add tests
- Update documentation
- Run linters and formatters

```bash
black .
isort .
flake8 .
mypy .
```

### 3. Commit Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

git commit -m "feat(crypto): add AES-256 fallback encryption"
git commit -m "fix(dashboard): resolve auto-refresh memory leak"
git commit -m "docs(readme): add installation instructions"
git commit -m "test(engine): add conservation law tests"
git commit -m "perf(agent): vectorize transaction processing"
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding tests
- `perf`: Performance improvement
- `refactor`: Code refactoring
- `style`: Formatting changes
- `chore`: Maintenance tasks

### 4. Run Tests

```bash
pytest tests/
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

Go to GitHub and create a Pull Request with:

**Title:** Clear, descriptive title (follows conventional commits)

**Description:**
```markdown
## Description
Brief description of changes

## Motivation
Why is this change needed?

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated and passing
- [ ] No breaking changes (or documented)
```

### 7. Code Review

- Address reviewer feedback
- Make requested changes
- Push updates to same branch (PR updates automatically)

### 8. Merge

Once approved, maintainers will merge your PR.

---

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Pull Requests**: Code review, feedback

### Getting Help

**For Usage Questions:**
- Check existing documentation
- Search closed issues
- Post in GitHub Discussions

**For Bug Reports:**
- Search existing issues first
- Create new issue with full details

**For Security Issues:**
- **DO NOT** create public issue
- Email: security@nexusos.example.com
- See [SECURITY.md](SECURITY.md)

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Featured in project README (significant contributions)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

If you have questions about contributing, feel free to:
- Open a GitHub Discussion
- Comment on relevant issues
- Reach out to maintainers

**Thank you for contributing to NexusOS Advance Systems!** 🚀

---

*Last updated: November 2025*
