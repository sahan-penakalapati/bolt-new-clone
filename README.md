# Bolt.new Clone - Agent Framework Implementation

This project is a work-in-progress implementation of a bolt.new clone, currently focusing on the agent framework infrastructure.

## Current Status

- ✅ Project structure and TypeScript setup complete
- 🚧 Agent framework implementation in progress
- ❌ 44 failing tests that need fixing
- ⏳ Web UI and other features not yet started

## Prerequisites

- Node.js 23.6.0 or compatible
- pnpm 8.x or later
- Python with venv
- Git

## Getting Started

1. Clone and setup:

```bash
git clone https://github.com/yourusername/bolt-new-clone.git
cd bolt-new-clone
pnpm install
```

2. Set up Python environment (required for development tools):

```bash
python -m venv venv
source venv/bin/activate  # On Unix/macOS
.\venv\Scripts\activate   # On Windows
pip install -r requirements.txt
```

3. Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

## Testing Current Progress

1. Run the test suite to see current state:

```bash
pnpm test
```

You'll see 44 failing tests across these components:

- MessageQueue implementation
- BaseAgent state management
- Agent Registry functionality
- Various agent implementations

2. Run specific test files:

```bash
# Test just the MessageQueue
pnpm test tests/agents/MessageQueue.test.ts

# Test BaseAgent
pnpm test tests/agents/BaseAgent.test.ts

# Test specific agent
pnpm test tests/agents/ESLintAgent.test.ts
```

## Project Structure

```
bolt-new-clone/
├── src/
│   └── agents/          # Agent framework (needs fixes)
│       ├── BaseAgent.ts       # Base agent class
│       ├── MessageQueue.ts    # Message handling
│       ├── AgentRegistry.ts   # Agent management
│       └── types.ts           # Type definitions
└── tests/               # Test files (currently failing)
```

## Development Tools

Python tools are available for development assistance:

```bash
# LLM API Access
venv/bin/python tools/llm_api.py --prompt "Your prompt" --provider anthropic

# Web Scraping
venv/bin/python tools/web_scraper.py URL

# Search
venv/bin/python tools/search_engine.py "keywords"
```

## Current Development Focus

1. Fixing core message handling:

   - Priority ordering in MessageQueue
   - Queue size limits
   - Processing state management

2. Fixing state management:

   - State transitions in BaseAgent
   - Error handling
   - Timeout mechanisms

3. Fixing agent registry:
   - Agent limits enforcement
   - Health monitoring
   - Core agent initialization

## Documentation

- `docs/timeline_context.md` - Current project state and progress
- `docs/architecture.md` - System design and component status
- `docs/components.md` - Component documentation
- `docs/setup.md` - Detailed setup instructions

## Contributing

1. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make changes following our conventions:

- TypeScript strict mode
- ESLint rules
- JSDoc comments
- Files under 200 lines
- Tests for new features

3. Commit with Cursor prefix:

```bash
git commit -m "[Cursor] your commit message"
```

## Next Steps

1. Fix failing tests
2. Complete agent framework implementation
3. Start web UI development
4. Implement AI integration

## Getting Help

- Check documentation in /docs
- Review timeline_context.md for current state
- Run tests with --verbose flag for detailed output
