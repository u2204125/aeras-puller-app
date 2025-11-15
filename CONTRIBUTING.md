# Contributing to AERAS Puller App

Thank you for your interest in contributing to the AERAS Puller App! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Guidelines](#coding-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/aeras-puller-app.git`
3. Add upstream remote: `git remote add upstream https://github.com/ORIGINAL_OWNER/aeras-puller-app.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

1. Install dependencies:
   ```bash
   cd puller-app
   pnpm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your backend URL:
   ```env
   VITE_API_URL=http://localhost:3000/api/v1
   VITE_SOCKET_URL=http://localhost:3000
   VITE_MQTT_BROKER_URL=ws://broker.hivemq.com:8000/mqtt
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

## How to Contribute

### Types of Contributions

- **Bug fixes**: Fix issues and improve stability
- **New features**: Add new functionality
- **Documentation**: Improve or add documentation
- **Performance**: Optimize code and improve performance
- **UI/UX**: Enhance user interface and experience
- **Tests**: Add or improve test coverage
- **PWA**: Improve Progressive Web App features

### Contribution Workflow

1. **Find or create an issue**: Before starting work, check if an issue exists or create one
2. **Assign yourself**: Comment on the issue to let others know you're working on it
3. **Create a branch**: Use descriptive branch names (e.g., `fix/ride-status`, `feature/offline-mode`)
4. **Make changes**: Follow coding guidelines and keep commits atomic
5. **Test thoroughly**: Ensure your changes work as expected
6. **Submit a PR**: Create a pull request with a clear description

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid using `any` type
- Use meaningful variable and function names

### React

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Implement proper error boundaries
- Use Zustand for state management

### Code Style

- Follow the existing code style
- Use ESLint and fix all linting errors: `pnpm lint`
- Use Tailwind CSS for styling
- Use meaningful commit messages

### Commit Messages

Follow the conventional commits specification:

```
feat: add offline ride queue
fix: resolve geolocation permission issue
docs: update installation instructions
style: format code with prettier
refactor: simplify ride acceptance logic
test: add tests for MQTT connection
chore: update dependencies
```

### File Organization

- Components in `src/components/`
- Services in `src/services/`
- Store in `src/store/`
- Types in `src/types/`
- Utils in `src/utils/`

## Pull Request Process

1. **Update documentation**: If you've added features, update the README
2. **Test your changes**: Ensure everything works correctly
3. **Update the changelog**: Add your changes to CHANGELOG.md
4. **Create the PR**: 
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changed and why
   - Add screenshots for UI changes

5. **Code review**: 
   - Address review comments promptly
   - Keep discussions constructive
   - Make requested changes

6. **Merge**: Once approved, a maintainer will merge your PR

## Mobile Development

### Testing on Mobile

- Test on real devices when possible
- Use Chrome DevTools mobile emulation
- Test offline functionality
- Verify geolocation works
- Check PWA installation

### Performance

- Minimize bundle size
- Optimize images
- Lazy load components
- Use service workers efficiently

## PWA Guidelines

- Update `manifest.json` for app metadata
- Configure service worker properly
- Test offline functionality
- Ensure installability

## Security

- Never commit sensitive data
- Use environment variables for secrets
- Validate all user inputs
- Follow secure coding practices

## Questions?

If you have questions:

- Check the [README](README.md) and documentation
- Search existing issues
- Create a new issue with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AERAS Puller App! 🚀
