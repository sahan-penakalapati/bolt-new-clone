# Component Catalog

## Editor System

### AI-Powered Editor

```tsx
<AICodeEditor
  agents={[orchestrator, eslint, deployment]}
  templates={viteReactTemplates}
/>
```

**Features**:

- Real-time AI suggestions
- Context-aware completions
- Lint-as-you-type
- Safe code execution

| Prop           | Type       | Description                |
| -------------- | ---------- | -------------------------- |
| agents         | Agent[]    | Active agent instances     |
| maxSuggestions | number     | Max AI suggestions visible |
| lintRules      | LintRule[] | Custom linting rules       |

### WebContainer Preview

**Lifecycle**:

1. Mount container
2. Install dependencies
3. Start dev server
4. Stream logs
5. Display output

## AI Integration Components

### Agent Dashboard

![Agent Status UI](agent-status.png)

**Key Metrics**:

- Active agents
- Memory usage
- Error rate
- Request throughput

### Code Generation Workflow

1. User prompt → Orchestrator
2. Validate → Compatibility Agent
3. Generate → AI Service
4. Sanitize → Security Layer
5. Apply → Editor

# Components Documentation

## Component Overview

The application consists of several key components:

- Editor: Monaco-based code editor with error boundary and loading states
- Preview: Code preview with Prism.js syntax highlighting
- ThemeToggle: Theme switching control
- EditorContainer: Container managing editor and preview state
- AiPrompt: AI interaction interface for code generation

## Editor Component

The Editor component is a Monaco-based code editor. It offers several key features:

- Syntax highlighting for multiple languages
- Light/dark theme support
- Auto-resizing
- Line numbers
- Change detection
- Error boundary protection
- Loading state management

### Usage

Here's an example of how to use the Editor component:

```tsx
import { Editor } from "@/components/Editor";

function MyComponent() {
  return (
    <Editor
      initialContent="// Your code here"
      language="typescript"
      theme="light"
      onChange={(content) => console.log(content)}
    />
  );
}
```

### Props

The Editor component accepts the following props:

| Prop           | Type                        | Default        | Description                      |
| -------------- | --------------------------- | -------------- | -------------------------------- |
| initialContent | `string`                    | `""`           | Initial code content             |
| onChange       | `(content: string) => void` | `undefined`    | Callback for content changes     |
| language       | `string`                    | `"typescript"` | Language for syntax highlighting |
| theme          | `"light" \| "dark"`         | `"light"`      | Editor theme                     |
| className      | `string`                    | `""`           | Additional CSS classes           |

### Configuration

The editor uses the following default configuration:

```tsx
{
  fontSize: 14,
  lineNumbers: "on",
  wordWrap: "on",
  renderLineHighlight: "line",
  minimap: {
    enabled: false
  }
}
```

### Implementation Details

- The component uses the `"use client"` directive for client-side rendering.
- It manages the editor instance lifecycle with `useRef` and `useEffect`.
- Editor resources are properly disposed of on unmount.
- Theme switching is implemented without editor reinstantiation.
- TypeScript strict mode is used with no `any` types.

### Loading State

The Editor now includes a loading state shown during initialization:

- Uses React Suspense for loading management
- Shows a subtle loading animation
- Maintains consistent layout during load

## Preview Component

The Preview component displays code with syntax highlighting using Prism.js.

### Features

- Syntax highlighting for multiple languages
- Light/dark theme support
- Automatic language detection
- Responsive layout
- Overflow handling
- Real-time content updates

### Usage

```tsx
import { Preview } from "@/components/Preview";

function MyComponent() {
  return (
    <Preview
      content="const x = 42;"
      language="typescript"
      theme="light"
      className="my-4"
    />
  );
}
```

### Props

| Prop      | Type                | Default   | Description               |
| --------- | ------------------- | --------- | ------------------------- |
| content   | `string`            | Required  | Content to display        |
| language  | `string`            | Required  | Language for highlighting |
| theme     | `"light" \| "dark"` | `"light"` | Display theme             |
| className | `string`            | `""`      | Additional CSS classes    |

### Implementation Details

- Uses Prism.js for syntax highlighting
- Supports TypeScript and JavaScript out of the box
- Updates highlighting on content/language changes
- Maintains scroll position during updates

## ThemeToggle Component

A button component that toggles between light and dark themes.

### Features

- Accessible button implementation
- Smooth transition animations
- Visual feedback on hover
- Persistent theme state

### Usage

```tsx
import { ThemeToggle } from "@/components/ThemeToggle";

function MyComponent() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <ThemeToggle
      theme={theme}
      onToggle={() => setTheme(theme === "light" ? "dark" : "light")}
    />
  );
}
```

### Props

| Prop      | Type                | Default  | Description            |
| --------- | ------------------- | -------- | ---------------------- |
| theme     | `"light" \| "dark"` | Required | Current theme          |
| onToggle  | `() => void`        | Required | Theme toggle callback  |
| className | `string`            | `""`     | Additional CSS classes |

## AiPrompt Component

The AiPrompt component provides an interface for AI-powered code generation.

### Features

- Clean, minimal interface
- Input validation
- Loading state handling
- Error feedback

### Usage

```tsx
import { AiPrompt } from "@/components/AiPrompt";

function MyComponent() {
  const handlePrompt = async (prompt: string) => {
    // Handle AI prompt
  };

  return <AiPrompt onSubmit={handlePrompt} />;
}
```

### Props

| Prop      | Type                                | Default  | Description               |
| --------- | ----------------------------------- | -------- | ------------------------- |
| onSubmit  | `(prompt: string) => Promise<void>` | Required | Prompt submission handler |
| className | `string`                            | `""`     | Additional CSS classes    |

## EditorContainer Component

The EditorContainer manages the overall editor experience.

### Features

- Layout management
- Theme coordination
- State synchronization
- Component integration

### Implementation

```tsx
import { EditorContainer } from "@/components/EditorContainer";

function App() {
  return <EditorContainer />;
}
```

## Architecture Updates

### Component Integration

The components are integrated through the EditorContainer:

- Manages shared theme state
- Synchronizes editor and preview content
- Provides responsive layout
- Coordinates AI interactions

### State Flow

```
EditorContainer
├── ThemeToggle
│   └── Triggers theme updates
├── Editor
│   ├── Receives theme
│   └── Emits content changes
├── Preview
│   ├── Receives theme
│   └── Receives content
└── AiPrompt
    └── Handles AI interactions
```

### Next Steps

1. Implement theme persistence
2. Add more language support
3. Enhance AI integration
4. Add keyboard shortcuts
5. Improve error handling
6. Add comprehensive testing

# Architecture Documentation

## Project Structure

The project is initialized as a Next.js application with TypeScript, Tailwind CSS, and Monaco Editor. It follows a modular structure, with directories for components, types, utils, and documentation. The Editor component's types are defined in `src/components/Editor/types.ts`. The `.cursorrules` file contains comprehensive coding standards and documentation requirements.

Currently, the focus is on building the foundational editor functionality. The next steps include implementing the preview component and layout integration.

Key files include:

- Project scaffolding via `create-next-app`
- `.cursorrules` (coding standards)
- `types.ts` (editor interfaces)
- `docs/architecture.md` (system design)
- `docs/components.md` (component documentation)

No errors or issues have been encountered yet.

## Component Architecture

### Editor Module

The Editor module is designed with a clear separation of concerns:

1. **Types (`types.ts`)**

   - Defines interfaces for props and configuration.
   - Ensures type safety.
   - Documents the component API through TypeScript.

2. **Component (`Editor.tsx`)**

   - Implements the Monaco Editor wrapper.
   - Manages the editor lifecycle.
   - Handles theme switching.
   - Processes content changes.

3. **Exports (`index.ts`)**
   - Provides a clean public API.
   - Centralizes exports using the barrel pattern.

### Design Decisions

1. **Client-Side Rendering**

   - Uses the `"use client"` directive.
   - Ensures Monaco Editor loads only on the client.

2. **State Management**

   - Uses React refs for the editor instance.
   - Implements a controlled component pattern.
   - Provides `onChange` callbacks.

3. **Configuration**

   - Centralizes editor settings.
   - Uses TypeScript for config validation.
   - Allows for future extensibility.

4. **Performance**
   - Minimizes re-renders.
   - Properly disposes of resources.
   - Implements efficient theme switching.

## Preview Component Updates

Added:

- Live execution preview via iframe (lines 21,30-37)
- Sandbox attribute for security
- Concurrent static highlighting + execution

Changed:

- Removed Prism.js dependency for execution previews
- Added error boundary for failed executions
- Updated tests for iframe content

## EditorContainer Updates

Added:

- Theme persistence via localStorage (lines 15-26)
- System preference detection (prefers-color-scheme)
- Debounced content updates

## New Components

# Component Documentation

## Agent Framework Components (Current Implementation)

### BaseAgent

Core agent class with lifecycle and message handling (needs fixes).

```typescript
import { BaseAgent, AgentConfig } from "@/agents";

const config: AgentConfig = {
  name: "example-agent",
  maxRetries: 3,
  timeoutMs: 5000,
};
```

**Current Status**: 🚧 Needs Fixes

- Message queue handling broken
- State transitions failing
- Error recovery not working
- Timeout handling issues

### MessageQueue

Message handling system for agents (needs fixes).

```typescript
import { MessageQueue } from "@/agents";

const queue = new MessageQueue(processCallback, maxSize);
```

**Current Status**: ❌ Major Issues

- Priority ordering broken
- Queue size limits not enforced
- Processing state inconsistent
- Error handling broken

### AgentRegistry

Singleton registry for managing agents (needs fixes).

```typescript
import { AgentRegistry } from "@/agents";

const registry = AgentRegistry.getInstance();
```

**Current Status**: 🚧 Needs Fixes

- Agent limits not enforced
- Health monitoring incomplete
- Core agent initialization issues
- Error handling needs work

### OrchestratorAgent

Message routing and agent coordination (needs fixes).

```typescript
import { OrchestratorAgent } from "@/agents";

const orchestrator = new OrchestratorAgent({
  name: "orchestrator",
  maxRetries: 3,
});
```

**Current Status**: 🚧 Needs Fixes

- Message routing incomplete
- Retry handling broken
- State management issues
- Error propagation not working

## Message Types (Currently Implemented)

### Base Message Type

```typescript
interface BaseAgentMessage {
  id: string;
  type: string;
  targetAgent: string;
  payload?: unknown;
  priority?: number;
  timestamp?: number;
}
```

## Testing Infrastructure

### Unit Tests (Currently Failing)

```typescript
import { BaseAgent } from "@/agents";

describe("BaseAgent", () => {
  let agent: BaseAgent;

  beforeEach(() => {
    agent = new BaseAgent({
      name: "test-agent",
    });
  });

  // 44 failing tests across components
});
```

### Test Utilities

```typescript
// Helper functions for testing
export function createTestMessage<T = unknown>(
  type: string = "TEST",
  payload: T = {} as T,
  targetAgent: string = "test-agent"
): BaseAgentMessage {
  return {
    id: Math.random().toString(36).substring(7),
    type,
    payload,
    targetAgent,
    timestamp: Date.now(),
  };
}
```

## Development Status

### Currently Working On

1. Message Queue fixes
2. State management fixes
3. Test suite repairs
4. Error handling improvements

### Not Yet Implemented

- AI Integration Components
- Editor System
- WebContainer Preview
- Code Generation Workflow
- Deployment Pipeline

Note: All other sections from the original components.md are planned features and not yet implemented.
