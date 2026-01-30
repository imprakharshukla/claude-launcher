# Claude Launcher

A TUI for managing Claude Code sessions. Quickly search, resume, and organize your Claude conversations.

![Demo](https://github.com/user-attachments/assets/placeholder.gif)

## Features

- **Fuzzy search** across all your Claude session messages
- **Resume sessions** in tmux (grouped by project) or plain Ghostty
- **Bookmark sessions** with custom names for quick access
- **Fork conversations** - start fresh with previous context
- **Active session indicators** - see which projects have running Claude instances

## Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/claude-launcher.git
cd claude-launcher

# Install dependencies
pnpm install

# Build
pnpm build

# Link globally (optional)
pnpm link --global
```

Add to your shell config (`.zshrc` / `.bashrc`):
```bash
alias c="/path/to/claude-launcher/bin/c.js"
```

## Requirements

- Node.js 18+
- One of: Ghostty, WezTerm, Kitty, or Alacritty
- tmux (optional, for session grouping)

## Usage

Just run `c` to open the launcher.

### Keybindings

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate sessions |
| `Enter` | Resume in tmux |
| `g` | Open in Ghostty directly (no tmux) |
| `s` | Save/bookmark session |
| `x` | Remove bookmark |
| `Ctrl+F` | Fork session |
| `Esc` | Clear search / quit |
| `Ctrl+C` | Quit |

### Indicators

- `★` Bookmarked session
- `●` Active tmux session for this project

## tmux Integration

Sessions are grouped by project in tmux. Install tmux for this feature:

```bash
brew install tmux
```

A recommended `~/.tmux.conf` for better keybindings:

```bash
# Better prefix
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Mouse support
set -g mouse on

# Switch panes with Alt+arrow (no prefix)
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D
```

## Data Storage

- Bookmarks: `~/.claude-launcher/bookmarks.json`
- Logs: `~/.claude-launcher.log`

## License

MIT
