# Changelog

All notable changes to the AERAS Puller App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Phone number-based authentication for pullers
- Real-time GPS tracking with automatic location updates
- Interactive maps with React Leaflet for navigation
- Ride request modal with 30-second auto-reject timer
- Loud audio alerts for incoming ride requests
- Online/offline status toggle
- Live points balance tracking
- WebSocket integration for real-time updates
- PWA support with service worker caching
- Offline-first functionality
- Pickup and destination navigation screens
- Ride completion modal with points summary
- MQTT integration for IoT messaging
- Mobile-first responsive design
- Tailwind CSS for consistent styling
- Zustand state management
- Full TypeScript support

### Features
- **Authentication**: Secure phone number login
- **GPS Tracking**: Continuous location updates every 5 seconds
- **Real-time Notifications**: Instant ride request alerts via WebSocket
- **Navigation**: Turn-by-turn directions using Leaflet maps
- **PWA**: Install as native app on mobile devices
- **Offline Support**: Service worker caching for offline functionality
- **Audio Alerts**: Never miss ride requests with loud notifications
- **Points System**: Live points balance and earnings tracking

### Technical
- Built with React 18.2 and TypeScript 5.2
- Vite 5.0 for fast development and builds
- Tailwind CSS 3.3 for styling
- Socket.IO 4.6 for real-time communication
- MQTT.js 5.14 for IoT messaging
- React Leaflet 4.2 for interactive maps
- Zustand 4.4 for state management
- Vite PWA Plugin 0.17 for PWA support

### Developer Experience
- ESLint configuration for code quality
- Prettier for code formatting
- EditorConfig for consistent coding styles
- VS Code settings and extension recommendations
- TypeScript strict mode enabled

## [Unreleased]

### Planned
- Push notifications for ride requests
- In-app chat with riders
- Route history and analytics
- Earnings dashboard
- Multi-language support
- Dark mode theme
- Voice navigation
- Offline queue for failed requests

---

[1.0.0]: https://github.com/u2204125/aeras-puller-app/releases/tag/v1.0.0
