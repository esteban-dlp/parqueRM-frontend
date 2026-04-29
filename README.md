# Claude Frontend Template

A reusable Claude Code template for frontend projects focused on modern UI, clean visual design, motion, reusable components, and faster development workflows.

This template is meant to be cloned or copied into new frontend projects so Claude Code starts with the right skills, MCP servers, and project-level configuration.

---

## What This Template Includes

### Claude Code Skills

This template includes project-level skills for frontend design, UI polish, motion, and visual generation:

- `ui-ux-pro-max`
- `emil-design-eng`
- `impeccable`
- `design-motion-principles`
- `nano-banana`

These skills help Claude Code with:

- Modern landing page design
- SaaS-style interfaces
- UI/UX structure
- Visual polish
- Microinteractions
- Motion design
- Component refinement
- Product design consistency
- Image and asset generation workflows

---

## Ruflo Plugin

This template includes Ruflo Core as a Claude Code plugin.

Installed plugin:

- `ruflo-core`

Ruflo Core adds plugin-managed Claude Code skills such as:

- `ruflo-core:discover-plugins`
- `ruflo-core:doctor`
- `ruflo-core:init-project`

These skills may appear with a lock icon inside `/skills` because they are managed by the plugin and not edited directly from the skills panel.

To manage Ruflo, use:

```txt
/plugin
```

To view installed skills, use:

```txt
/skills
```

---

## MCP Servers

This template includes project-level MCP servers configured through `.mcp.json`.

Configured MCPs:

- `stitch`
- `magic`

These MCPs are useful for frontend workflows such as:

- UI generation
- Interface refinement
- Design assistance
- Component creation
- Frontend acceleration
- Visual inspiration and layout improvements

---

## Environment Variables

The template uses a local `.env` file to store API keys securely.

Example `.env`:

```env
STITCH_API_KEY=your_stitch_api_key_here
MAGIC_API_KEY=your_magic_api_key_here
```

The `.mcp.json` references these variables like this:

```json
{
  "env": {
    "STITCH_API_KEY": "${STITCH_API_KEY}"
  }
}
```

And for Magic:

```json
"API_KEY=${MAGIC_API_KEY}"
```

This keeps real API keys out of the MCP configuration file.

---

## Files and Folders

Current structure:

```txt
claude-frontend-template/
│
├── .claude/
│   └── skills/
│       ├── nano-banana/
│       ├── ui-ux-pro-max/
│       ├── emil-design-eng/
│       ├── impeccable/
│       └── design-motion-principles/
│
├── .env
├── .gitignore
├── .mcp.json
├── start-claude.ps1
└── README.md
```

---

## Important Files

### `.claude/`

Contains Claude Code project-level configuration and skills.

Main folder:

```txt
.claude/skills/
```

Claude Code reads frontend skills from this directory.

---

### `.mcp.json`

Defines the MCP servers used by this template.

Current MCPs:

```txt
stitch
magic
```

The file should use environment variables instead of real API keys.

---

### `.env`

Stores real API keys locally.

This file should not be shared publicly.

---

### `.gitignore`

Used to prevent sensitive files from being included accidentally.

Recommended content:

```gitignore
.env
.env.*
!.env.example
```

---

### `start-claude.ps1`

Optional PowerShell script for loading environment variables before opening Claude Code from the terminal.

This is useful if Claude Code does not automatically read the `.env` file in your environment.

If the VS Code extension or Claude Code already connects to MCPs correctly, this script is optional.

---

## Recommended `.mcp.json`

```json
{
  "mcpServers": {
    "stitch": {
      "type": "stdio",
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@_davideast/stitch-mcp",
        "proxy"
      ],
      "env": {
        "STITCH_API_KEY": "${STITCH_API_KEY}"
      }
    },
    "magic": {
      "type": "stdio",
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@21st-dev/magic@latest",
        "API_KEY=${MAGIC_API_KEY}"
      ],
      "env": {}
    }
  }
}
```

---

## Recommended `.env.example`

```env
STITCH_API_KEY=your_stitch_api_key_here
MAGIC_API_KEY=your_magic_api_key_here
```

---

## Recommended `.gitignore`

```gitignore
.env
.env.*
!.env.example
```

---

## How to Use This Template

### 1. Copy or clone the template

Use this template as the base for a new frontend project.

---

### 2. Create a local `.env`

Create a `.env` file in the root folder:

```env
STITCH_API_KEY=your_real_key_here
MAGIC_API_KEY=your_real_key_here
```

---

### 3. Open the project in VS Code

```powershell
code .
```

---

### 4. Open Claude Code

You can use Claude Code from:

- VS Code extension
- Terminal

For terminal:

```powershell
claude
```

If MCP variables do not load correctly from the terminal, use:

```powershell
.\start-claude.ps1
```

---

### 5. Verify MCP servers

Inside Claude Code, run:

```txt
/mcp
```

Expected project MCPs:

```txt
magic  connected
stitch connected
```

---

### 6. Verify skills

Inside Claude Code, run:

```txt
/skills
```

Expected skills:

```txt
design-motion-principles
emil-design-eng
impeccable
nano-banana
ui-ux-pro-max
```

If Ruflo Core is installed, you may also see:

```txt
ruflo-core:discover-plugins
ruflo-core:doctor
ruflo-core:init-project
```

These may appear locked because they are managed by the Ruflo plugin.

---

## Suggested Use Cases

Use this template for:

- Landing pages
- SaaS websites
- Marketing websites
- Product websites
- Modern frontend apps
- UI/UX experiments
- Design-heavy components
- Animated interfaces
- Frontend refactors
- Visual polish passes
- Component libraries
- i18n-ready interfaces

---

## Recommended Claude Workflow

When starting a new frontend task, use prompts like:

```txt
Read the project structure first. Then review the UI, design consistency, component organization, and motion. Do not modify anything yet. First give me a clear plan.
```

For UI polish:

```txt
Use the available frontend design skills to improve this page visually. Keep the existing structure, avoid overengineering, and focus on spacing, typography, hierarchy, responsiveness, and motion.
```

For landing pages:

```txt
Create a modern SaaS-style landing page using the existing design direction. Keep it clean, premium, responsive, and conversion-focused.
```

For motion:

```txt
Use design-motion-principles to improve the animations. Keep motion subtle, smooth, and purposeful. Avoid excessive or distracting effects.
```

---

## Notes About Security

Do not place real API keys directly inside `.mcp.json`.

Use this:

```json
"STITCH_API_KEY": "${STITCH_API_KEY}"
```

Do not use this:

```json
"STITCH_API_KEY": "real_secret_key_here"
```

Keep secrets in:

```txt
.env
```

And make sure `.env` is ignored.

---

## Template Philosophy

This template is designed to stay focused on frontend work.

It intentionally includes frontend-oriented tools only, instead of loading every possible backend, database, Docker, or deployment tool.

The goal is:

- Less noise
- Better Claude Code context
- More focused results
- Faster frontend development
- Better visual quality
- Cleaner UI decisions
- Safer MCP configuration

---

## Recommended Template Variants

For future organization, keep separate templates for different work types:

```txt
claude-frontend-template
claude-backend-template
claude-database-template
claude-docker-template
claude-fullstack-template
```

This frontend template should only include frontend-related skills and MCPs.

---

## Current Status

Frontend template configured with:

- Claude Code project skills
- Ruflo Core plugin
- Stitch MCP
- Magic MCP
- Local `.env` support
- `.mcp.json` using environment variables
- `.gitignore` protecting `.env`
- Optional PowerShell launcher

This template is ready to be used as a frontend-focused Claude Code starter.