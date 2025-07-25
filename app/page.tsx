'use client';

import { MapImage } from '@/components/ui/map-image';
import { MAP_IMAGE_BASE, MAP_IMAGE_MAP, MAP_POOL } from '@/lib/maps';
import Link from 'next/link';
import React from 'react';
import { siGithub } from 'simple-icons';

export default function Home() {
  const [players, setPlayers] = React.useState('');
  const [teams, setTeams] = React.useState<{ A: string[]; B: string[] } | null>(null);

  function handleRandomizeTeams() {
    const names = players
      .split(/\n|,|，/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length < 2) {
      setTeams(null);
      return;
    }
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    setTeams({ A: shuffled.slice(0, mid), B: shuffled.slice(mid) });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-6">
      <div className="fixed top-6 right-6 z-10">
        <a
          href="https://github.com/lonzzi/cs2-map-pick"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-white/10 p-2 shadow transition-colors hover:bg-white/20"
          aria-label="GitHub Repository"
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={siGithub.path} fill="white" />
          </svg>
        </a>
      </div>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl">
          CS2 地图 Ban/Pick 工具
        </h1>
        <p className="mt-2 max-w-xl text-center text-lg text-gray-200">
          支持 BO3/BO5，队伍专属安全链接，实时同步，适合赛事/训练/娱乐选图流程。
        </p>
        <Link href="/banpick/create">
          <button className="mt-4 cursor-pointer rounded bg-yellow-400 px-6 py-2 text-lg font-semibold text-black shadow-xl transition hover:bg-yellow-300">
            创建房间
          </button>
        </Link>
      </div>
      <div className="mt-8 w-full max-w-3xl">
        <h2 className="mb-4 text-xl font-bold text-white">当前地图池</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
          {MAP_POOL.map((map) => (
            <div
              key={map}
              className="flex flex-col items-center rounded-lg bg-white/10 p-2 shadow-md"
            >
              <MapImage
                src={MAP_IMAGE_BASE + (MAP_IMAGE_MAP[map] || 'de_dust2.png')}
                alt={map}
                width={100}
                height={60}
                className="mb-1 rounded border border-gray-700"
                priority
              />
              <span className="text-sm font-semibold tracking-wide text-white drop-shadow">
                {map}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12 flex w-full max-w-2xl flex-col items-center gap-4 rounded-xl bg-white/5 p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-bold text-white">玩家导入与随机分队</h2>
        <textarea
          className="min-h-[80px] w-full rounded border border-gray-700 bg-gray-900/80 p-2 text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          placeholder="每行一个玩家名，或用逗号分隔"
          value={players}
          onChange={(e) => setPlayers(e.target.value)}
        />
        <button
          className="mt-2 rounded bg-yellow-400 px-4 py-2 font-semibold text-black shadow hover:bg-yellow-300 disabled:opacity-60"
          onClick={handleRandomizeTeams}
          disabled={players.trim().length === 0}
        >
          随机分队
        </button>
        {teams && (
          <div className="mt-4 flex w-full flex-col justify-center gap-6 sm:flex-row">
            <div className="flex-1 rounded-lg bg-white/10 p-4">
              <div className="mb-2 font-bold text-white">队伍 A</div>
              <ul className="space-y-1 text-white/90">
                {teams.A.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
            <div className="flex-1 rounded-lg bg-white/10 p-4">
              <div className="mb-2 font-bold text-white">队伍 B</div>
              <ul className="space-y-1 text-white/90">
                {teams.B.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      <footer className="mt-10 text-center text-xs text-gray-400 opacity-80">
        Powered by Next.js 15, Supabase, Shadcn UI
        <br />
        &copy; {new Date().getFullYear()} CS2 BanPick Tool
      </footer>
    </div>
  );
}
