'use client';

import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { MapImage } from '@/components/ui/map-image';
import { MAP_IMAGE_BASE, MAP_IMAGE_MAP } from '@/lib/maps';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Room {
  code: string;
  team_a: string;
  team_b: string;
  mode: 'bo3' | 'bo5';
  map_pool: string[];
  steps: Array<{ action: 'ban' | 'pick'; team: 'A' | 'B' }>;
  progress: {
    bans: { A: string[]; B: string[] };
    picks: { A: string[]; B: string[] };
    decider: string | null;
    currentStep: number;
  };
}

export default function BanpickRoomPage() {
  const params = useParams();
  const code = params?.code as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [mapAnim, setMapAnim] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let sub: ReturnType<typeof supabase.channel> | null = null;
    async function fetchRoom() {
      const { data } = await supabase.from('rooms').select('*').eq('code', code).single();
      setRoom(data as Room);
    }
    fetchRoom();
    sub = supabase
      .channel('room-' + code)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => {
          const oldRoom = room;
          const newRoom = payload.new as Room;
          if (oldRoom) {
            const oldBans = [...oldRoom.progress.bans.A, ...oldRoom.progress.bans.B];
            const newBans = [...newRoom.progress.bans.A, ...newRoom.progress.bans.B];
            const oldPicks = [...oldRoom.progress.picks.A, ...oldRoom.progress.picks.B];
            const newPicks = [...newRoom.progress.picks.A, ...newRoom.progress.picks.B];
            const diffBan = newBans.find((m) => !oldBans.includes(m));
            const diffPick = newPicks.find((m) => !oldPicks.includes(m));
            setMapAnim(diffBan || diffPick || null);
            if (diffBan || diffPick) {
              setTimeout(() => setMapAnim(null), 1200);
            }
          }
          setRoom(newRoom);
        },
      )
      .subscribe();
    return () => {
      sub?.unsubscribe();
    };
    // eslint-disable-next-line
  }, [code]);

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  const { team_a, team_b, mode, map_pool, steps, progress } = room;

  // 当前 step 的地图名
  const currentStep = steps[progress.currentStep];
  let currentMap: string | null = null;
  if (currentStep) {
    // 还未 ban/pick 的地图
    const picked = [...progress.picks.A, ...progress.picks.B];
    const banned = [...progress.bans.A, ...progress.bans.B];
    currentMap =
      map_pool.find((m) => !picked.includes(m) && !banned.includes(m) && m !== progress.decider) ||
      null;
  } else if (progress.decider) {
    currentMap = progress.decider;
  }
  const currentMapImg = currentMap ? MAP_IMAGE_MAP[currentMap] || 'de_dust2.png' : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-8 p-4">
      {/* 背景大图+遮罩 */}
      {currentMapImg && (
        <>
          <div className="pointer-events-none fixed inset-0 z-0">
            <MapImage
              src={currentMapImg ? MAP_IMAGE_BASE + currentMapImg : ''}
              alt={currentMap || ''}
              blur
              className="h-full w-full"
              style={{ width: '100vw', height: '100vh' }}
              priority
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        </>
      )}
      <Card className="relative z-10 flex w-full max-w-2xl flex-col gap-6 bg-white/80 p-8 shadow-2xl dark:bg-black/60">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">{team_a}</span>
          <span className="bg-muted rounded px-2 py-1 font-mono text-sm">{mode.toUpperCase()}</span>
          <span className="text-lg font-bold">{team_b}</span>
        </div>
        <div className="grid grid-cols-1 justify-center gap-4 sm:grid-cols-2 md:grid-cols-3">
          {map_pool.map((map) => {
            let status: 'ban' | 'pick' | 'decider' | null = null;
            let by: 'A' | 'B' | null = null;
            if (progress.bans.A.includes(map)) {
              status = 'ban';
              by = 'A';
            } else if (progress.bans.B.includes(map)) {
              status = 'ban';
              by = 'B';
            } else if (progress.picks.A.includes(map)) {
              status = 'pick';
              by = 'A';
            } else if (progress.picks.B.includes(map)) {
              status = 'pick';
              by = 'B';
            } else if (progress.decider === map) {
              status = 'decider';
            }
            const img = MAP_IMAGE_MAP[map] || 'de_dust2.png';
            return (
              <div
                key={map}
                className={cn(
                  'relative flex flex-col items-center overflow-hidden rounded-lg shadow-lg transition-all duration-700',
                  status === 'ban'
                    ? by === 'A'
                      ? 'scale-95 opacity-60 ring-4 ring-red-500'
                      : 'scale-95 opacity-60 ring-4 ring-orange-500'
                    : status === 'pick'
                      ? by === 'A'
                        ? 'scale-105 ring-4 ring-blue-500'
                        : 'scale-105 ring-4 ring-green-500'
                      : status === 'decider'
                        ? 'scale-110 ring-4 ring-black'
                        : 'ring-2 ring-gray-300 hover:scale-105 hover:ring-yellow-400',
                  mapAnim === map && 'animate-fadeIn animate-pulse',
                )}
                style={{ background: '#222' }}
              >
                <MapImage
                  src={MAP_IMAGE_BASE + img}
                  alt={map}
                  className="h-[120px] w-full"
                  grayscale={status === 'ban'}
                  priority
                />
                <div className="absolute right-0 bottom-0 left-0 bg-black/60 py-1 text-center text-sm font-bold text-white">
                  {map}
                  {status === 'ban' && (by === 'A' ? ' (A Ban)' : ' (B Ban)')}
                  {status === 'pick' && (by === 'A' ? ' (A Pick)' : ' (B Pick)')}
                  {status === 'decider' && ' (Decider)'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {steps.map((step, idx) => {
            const desc = step.action === 'ban' ? 'Ban' : 'Pick';
            const team = step.team === 'A' ? team_a : team_b;
            const done = idx < progress.currentStep;
            const current = idx === progress.currentStep;
            return (
              <div key={idx} className={cn('flex items-center gap-2', current && 'font-bold')}>
                <span>{team}</span>
                <span>{desc}</span>
                {done && <span className="text-xs text-green-600">✔</span>}
                {current && <span className="text-xs text-yellow-600">进行中</span>}
              </div>
            );
          })}
          {progress.decider && (
            <div className="flex items-center gap-2 font-bold">
              <span>决胜图</span>
              <span>{progress.decider}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
