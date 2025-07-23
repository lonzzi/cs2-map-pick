# CS2 Map Pick

A modern web application for Counter-Strike 2 teams to perform map ban/pick (banpick) processes interactively and visually.

## Features

- Real-time map ban/pick flow for BO3/BO5
- Team authentication via unique links
- Live updates with Supabase Realtime
- Responsive UI with Tailwind CSS and Shadcn UI
- Map pool and decider logic
- Visual feedback and status for each map

## Tech Stack

- **Next.js 15 (App Router)**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn UI & Radix UI**
- **Supabase** (Database & Realtime)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- pnpm (or npm/yarn)
- Supabase project (see below)

### Installation

```bash
pnpm install
```

### Environment Setup

1. Create a `.env.local` file in the root directory.
2. Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-publishable-default-key
   ```

### Database Setup

- Create a `rooms` table in Supabase with the following structure (example):
  - `code` (text, primary key)
  - `team_a` (text)
  - `team_b` (text)
  - `team_a_code` (text)
  - `team_b_code` (text)
  - `mode` (text)
  - `map_pool` (text[])
  - `steps` (json)
  - `progress` (json)

### Running Locally

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
cs2-map-pick/
├── app/                # Next.js app directory (routing, pages)
│   └── banpick/        # Banpick flows and team pages
├── components/         # UI components (Shadcn, custom)
├── hooks/              # Custom React hooks
├── lib/                # Utilities, Supabase client, map data
├── public/             # Static assets (map images, icons)
├── styles/             # Global styles (Tailwind)
├── README.md           # Project documentation
└── ...
```

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`pnpm commit`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)
