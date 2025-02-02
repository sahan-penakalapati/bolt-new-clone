# Setup Guide

## Prerequisites

- Node.js 23.6.0 or compatible
- pnpm 8.x or later
- Python with venv
- Git

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/bolt-new-clone.git
cd bolt-new-clone
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up Python environment:

```bash
python -m venv venv
source venv/bin/activate  # On Unix/macOS
.\venv\Scripts\activate   # On Windows
pip install -r requirements.txt
```

4. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
NEXT_PUBLIC_OPENAI_API_KEY=your_api_key
NEXT_PUBLIC_MAX_TOKENS=16000
NEXT_PUBLIC_MODEL=gpt-4-turbo-preview
```

## Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
bolt-new-clone/
├── docs/                 # Documentation
├── src/
│   ├── agents/          # Agent framework (needs fixes)
│   │   ├── BaseAgent.ts       # Base agent class
│   │   ├── MessageQueue.ts    # Message handling
│   │   ├── AgentRegistry.ts   # Agent management
│   │   └── types.ts           # Type definitions
│   └── types/           # TypeScript types
├── tests/               # Test files (currently failing)
└── tools/               # Python tools
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm test` - Run tests (currently 44 failing)
- `pnpm lint` - Run ESLint

## Development Workflow

1. Create a new branch for your feature:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following the project conventions:

- Use TypeScript strict mode
- Follow ESLint rules
- Add JSDoc comments
- Keep files under 200 lines
- Add tests for new features

3. Run tests and linting:

```bash
pnpm test  # Note: Tests are currently failing
pnpm lint
```

4. Commit your changes:

```bash
# For single-line commits
git commit -m "[Cursor] your commit message"

# For multi-line commits
echo "[Cursor] Title

Detailed description" > commit_msg.txt
git commit -F commit_msg.txt
rm commit_msg.txt
```

5. Push your changes:

```bash
git push origin feature/your-feature-name
```

## Current Development Focus

1. Fix failing tests in the agent framework
2. Fix message queue implementation
3. Fix state management issues
4. Fix timeout handling

## Available Tools

### Python Tools (in ./venv)

1. Screenshot Verification:

```bash
venv/bin/python tools/screenshot_utils.py URL [--output OUTPUT] [--width WIDTH] [--height HEIGHT]
```

2. LLM API Access:

```bash
venv/bin/python tools/llm_api.py --prompt "Your prompt" --provider {openai|anthropic}
```

3. Web Scraping:

```bash
venv/bin/python tools/web_scraper.py --max-concurrent 3 URL1 URL2 URL3
```

4. Search Engine:

```bash
venv/bin/python tools/search_engine.py "your search keywords"
```

## Troubleshooting

### Common Issues

1. **Test Failures**

   - Known issue: 44 tests currently failing
   - Focus on fixing message queue and state management first
   - Run specific test files for targeted debugging

2. **State Management**

   - Known issue: State transitions not working correctly
   - Check state cleanup in finally blocks
   - Verify timeout handling

3. **Message Queue**
   - Known issue: Priority ordering broken
   - Known issue: Queue size limits not enforced
   - Check processing state management

### Getting Help

- Check existing issues on GitHub
- Read the documentation in /docs
- Review timeline_context.md for current project state
