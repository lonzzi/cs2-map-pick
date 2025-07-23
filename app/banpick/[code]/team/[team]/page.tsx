'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { MapImage } from '@/components/ui/map-image';
import { MAP_IMAGE_BASE, MAP_IMAGE_MAP } from '@/lib/maps';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Room {
  code: string;
  team_a: string;
  team_b: string;
  team_a_code: string;
  team_b_code: string;
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

type TeamKey = 'A' | 'B';

export default function TeamBanpickPage() {
  const params = useParams();
  const code = params?.code as string;
  const teamCode = params?.team as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [team, setTeam] = useState<TeamKey | null>(null);
  const [lastDecider, setLastDecider] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [submittingMap, setSubmittingMap] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !teamCode) return;
    let sub: ReturnType<typeof supabase.channel> | null = null;
    async function fetchRoom() {
      const { data } = await supabase.from('rooms').select('*').eq('code', code).single();
      if (!data) {
        setAuthError(true);
        return;
      }
      setRoom(data as Room);
      setLastDecider((data as Room)?.progress?.decider ?? null);
      if (teamCode === data.team_a_code) setTeam('A');
      else if (teamCode === data.team_b_code) setTeam('B');
      else setAuthError(true);
    }
    fetchRoom();
    sub = supabase
      .channel('room-' + code)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => {
          setRoom(payload.new as Room);
          if (payload.new.progress?.decider && payload.new.progress?.decider !== lastDecider) {
            toast.success(`决胜图为 ${payload.new.progress.decider}，流程已结束！`);
            setLastDecider(payload.new.progress.decider);
          }
        },
      )
      .subscribe();
    return () => {
      sub?.unsubscribe();
    };
  }, [code, teamCode, lastDecider]);

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-600">
        无效的队伍链接
      </div>
    );
  }
  if (!room || !team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  const { team_a, team_b, map_pool, steps, progress } = room;
  const currentStep = steps[progress.currentStep];
  let currentMap: string | null = null;
  if (currentStep) {
    const picked = [...progress.picks.A, ...progress.picks.B];
    const banned = [...progress.bans.A, ...progress.bans.B];
    currentMap =
      map_pool.find((m) => !picked.includes(m) && !banned.includes(m) && m !== progress.decider) ||
      null;
  } else if (progress.decider) {
    currentMap = progress.decider;
  }
  const currentMapImg = currentMap ? MAP_IMAGE_MAP[currentMap] || 'de_dust2.png' : null;

  const isMyTurn = currentStep && currentStep.team === team;
  const allBans = [...progress.bans.A, ...progress.bans.B];
  const allPicks = [...progress.picks.A, ...progress.picks.B];
  const remaining = map_pool.filter(
    (m) => !allBans.includes(m) && !allPicks.includes(m) && m !== progress.decider,
  );

  async function handleAction(map: string) {
    if (!isMyTurn || submittingMap) return;
    setSubmittingMap(map);
    const newProgress = JSON.parse(JSON.stringify(progress));
    if (currentStep.action === 'ban') {
      newProgress.bans[team].push(map);
    } else if (currentStep.action === 'pick') {
      newProgress.picks[team].push(map);
    }
    newProgress.currentStep++;
    if (newProgress.currentStep >= steps.length) {
      const picked = [...newProgress.picks.A, ...newProgress.picks.B];
      const banned = [...newProgress.bans.A, ...newProgress.bans.B];
      newProgress.decider = map_pool.find((m) => !picked.includes(m) && !banned.includes(m));
    }
    const { error } = await supabase
      .from('rooms')
      .update({ progress: newProgress })
      .eq('code', code);
    setSubmittingMap(null);
    if (error) {
      toast.error('操作失败: ' + error.message);
    } else {
      toast.success(`${currentStep.action === 'ban' ? 'Ban' : 'Pick'} ${map} 成功！`);
    }
  }

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
          <span className="bg-muted rounded px-2 py-1 font-mono text-sm">
            {team === 'A' ? '你的队伍' : '对手队伍'}
          </span>
          <span className="text-lg font-bold">{team_b}</span>
        </div>
        <div className="mb-2 text-center text-lg font-semibold">
          {isMyTurn
            ? `请${currentStep.action === 'ban' ? 'Ban' : 'Pick'}一张地图`
            : `等待对方操作...`}
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
            const canAction = isMyTurn && !status && !submittingMap && remaining.includes(map);
            const isLoading = submittingMap === map;
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
                  isLoading && 'animate-fadeIn animate-pulse',
                  'cursor-pointer',
                )}
                style={{ background: '#222' }}
                onClick={() => canAction && handleAction(map)}
              >
                <MapImage
                  src={MAP_IMAGE_BASE + img}
                  alt={map}
                  className="h-[120px] w-full"
                  grayscale={status === 'ban'}
                  priority
                />
                {isLoading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loading size={32} />
                  </div>
                )}
                <div className="absolute right-0 bottom-0 left-0 bg-black/60 py-1 text-center text-sm font-bold text-white">
                  {map}
                  {status === 'ban' && (by === 'A' ? ' (A Ban)' : ' (B Ban)')}
                  {status === 'pick' && (by === 'A' ? ' (A Pick)' : ' (B Pick)')}
                  {status === 'decider' && ' (Decider)'}
                </div>
                {canAction && (
                  <Button
                    size="sm"
                    className="absolute top-2 right-2 z-10 bg-yellow-500 text-black hover:bg-yellow-500"
                    disabled={submittingMap === map}
                  >
                    {currentStep.action === 'ban' ? 'Ban' : 'Pick'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
