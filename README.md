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

## Systemd installation

```bash
mkdir -p ~/.config/systemd/user/
ln -s "$(pwd)/systemd/gh-issue-notifier.service" ~/.config/systemd/user/
ln -s "$(pwd)/systemd/gh-issue-notifier.timer" ~/.config/systemd/user/
ln -s "$(pwd)/systemd/gh-issue-notifier.service.d" ~/.config/systemd/user/
cp systemd/gh-issue-notifier.service.d/override.conf.example ~/.config/systemd/user/gh-issue-notifier.service.d/override.conf
systemctl --user daemon-reload
systemctl --user enable --now gh-issue-notifier.timer
```

Edit ~/.config/systemd/user/gh-issue-notifier.service.d/override.conf to set WorkingDirectory to your absolute path.

## License
MIT
