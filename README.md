# personal — Geren Lockhart Tools

Personal tools for managing a move and storage setup.

## Tools

### Moving Planner (`planner.html`)
Task manager for planning and executing a move. Tracks tasks by category (Storage, Mobile Kit, Sell, Trash, Gift), room, stage, and priority. Connects to Supabase for persistent storage.

### Storage Inventory Log (`storage.html`)
Container and bin tracker for an active storage unit. Tracks bin types, container codes, locations, estimated values, and generates an insurance report. Connects to Supabase.

## Stack
- Vanilla HTML / CSS / JavaScript — no build step, no framework
- Supabase (MICOLI MEDIA / LIFE project) for data
- Hosted on GitHub Pages → `tools.gerenlockhart.com`

## Supabase Tables
- `moving_tasks` — planner tasks
- `storage_bin_types` — container type definitions
- `storage_containers` — individual storage containers

## Deployment
Push to `main` branch on `Gerenmicol/personal`. GitHub Pages serves from root.

Custom domain: point `tools.gerenlockhart.com` CNAME to `gerenmicol.github.io`.

## Auth
Single user, no auth currently. Auth to be added ~4 weeks post-launch.

## Rules
See session notes for development rules. One change at a time. Validate before deploying.
