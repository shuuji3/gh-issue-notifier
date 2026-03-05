# 📧 gh-issue-notifier

A tool to monitor GitHub repositories and send email notifications for new issues.

> [!NOTE]
> There is no flexibility now! Only 3 days old issues will be notified just to meet my needs.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

## Usage

1. Add the repositories you want to monitor to `config.json`:
   ```json
   {
     "repos": ["vitejs/docs-ja"]
   }
   ```
2. Run the tool:
   ```bash
   pnpm start
   ```

## License
MIT
