# Bug Fixer

Identifies and fixes common bugs in code across multiple programming languages.

**Created by**: Agent Builder agent  
**Method**: Generated using agent-deploy's self-bootstrap capability

## How This Agent Was Created

This agent was created through the self-bootstrap process:

1. **Template** → Created Agent Builder from template (`agent-deploy init agent-builder`)
2. **Deploy** → Deployed Agent Builder to Claude Code
3. **Use** → Used Agent Builder to design this Bug Fixer agent
4. **Generate** → Agent Builder generated complete agent.json with instructions
5. **Result** → This agent is now ready to be uploaded to Market

## Agent Details

**Category**: Development  
**Tags**: bug-fix, debugging, error-handling, code-quality  
**Version**: 1.0.0  
**Author**: Created by Agent Builder

## Usage

```bash
# Upload to Market
agent-deploy upload ./self-bootstrap-demo/bug-fixer

# Deploy to AI tool
agent-deploy deploy ./self-bootstrap-demo/bug-fixer -t claude_code

# Use in Claude Code
/bug-fixer "Help me fix this code: [paste code]"
```

## Capabilities

- Identifies null/undefined references
- Detects off-by-one errors
- Finds race conditions
- Spots resource leaks
- Explains root causes
- Provides working fixes

## Languages Supported

Primary: TypeScript, JavaScript, Python, Go, Java  
Secondary: Rust, C#, Ruby, PHP

## Self-Bootstrap Proof

This agent demonstrates that the agent-deploy ecosystem is truly self-sustaining:

```
┌─────────────────────────────────────────────┐
│  Template (agent-builder)                   │
│         ↓                                    │
│  Created Agent Builder                       │
│         ↓                                    │
│  Used Agent Builder                          │
│         ↓                                    │
│  Generated Bug Fixer (THIS AGENT)           │
│         ↓                                    │
│  Can be uploaded to Market                   │
│         ↓                                    │
│  Others can download and use                 │
│         ↓                                    │
│  Can help create MORE agents                 │
└─────────────────────────────────────────────┘
```

**The loop is closed! ✅**

## License

MIT
