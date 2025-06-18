# Vodka Chat Backend

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

## Description

Vodka is a real-time chat application built with NestJS, featuring modern communication features and robust backend architecture. This repository contains the backend implementation of the Vodka chat application.

## Features

- 🔐 Authentication & Authorization
- 💬 Real-time messaging with WebSocket
- 👥 Group chat functionality
- 👤 User management
- 📱 Contact management
- 📨 Message history
- 🔍 Search functionality
- 📱 QR Code generation for easy sharing
- 🤖 AI-powered features
- 📧 Email notifications
- 📱 SMS notifications
- 💾 File storage
- 🔄 Caching system

## Tech Stack

- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** Prisma ORM
- **Real-time:** WebSocket
- **Authentication:** JWT
- **Storage:** File system
- **Caching:** Redis
- **AI Integration:** OpenAI
- **Notifications:** Email & SMS services

## Project Structure

```
src/
├── ai/           # AI integration features
├── auth/         # Authentication & authorization
├── cache/        # Caching system
├── contact/      # Contact management
├── event/        # Event handling
├── friend/       # Friend management
├── group/        # Group chat functionality
├── mail/         # Email service
├── message/      # Message handling
├── prisma/       # Database schema and migrations
├── qr-code/      # QR code generation
├── sms/          # SMS service
├── storage/      # File storage
└── user/         # User management
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Redis (for caching)
- Database (configured in Prisma)

### Installation

```bash
# Install dependencies
$ npm install

# Set up environment variables
$ cp .env.example .env
# Edit .env with your configuration
```

### Running the Application

```bash
# Development
$ npm run start

# Watch mode
$ npm run start:dev

# Production mode
$ npm run start:prod
```

### Database Setup

```bash
# Generate Prisma client
$ npx prisma generate

# Run migrations
$ npx prisma migrate dev
```

## API Documentation

The API documentation is available at `/api` when running the application in development mode.

## Testing

```bash
# Unit tests
$ npm run test

# E2E tests
$ npm run test:e2e

# Test coverage
$ npm run test:cov
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
