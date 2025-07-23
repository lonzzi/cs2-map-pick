'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MAP_IMAGE_BASE, MAP_IMAGE_MAP } from '@/lib/maps';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import Image from 'next/image';
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
  const [submitting, setSubmitting] = useState(false);
  const [lastDecider, setLastDecider] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

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
    return <div className="flex min-h-screen items-center justify-center">加载中...</div>;
  }

  const { team_a, team_b, map_pool, steps, progress } = room;
  const currentStep = steps[progress.currentStep];
  const isMyTurn = currentStep && currentStep.team === team;
  const allBans = [...progress.bans.A, ...progress.bans.B];
  const allPicks = [...progress.picks.A, ...progress.picks.B];
  const remaining = map_pool.filter(
    (m) => !allBans.includes(m) && !allPicks.includes(m) && m !== progress.decider,
  );

  async function handleAction(map: string) {
    if (!isMyTurn || submitting) return;
    setSubmitting(true);
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
    setSubmitting(false);
    if (error) {
      toast.error('操作失败: ' + error.message);
    } else {
      toast.success(`${currentStep.action === 'ban' ? 'Ban' : 'Pick'} ${map} 成功！`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-4">
      <Card className="flex w-full max-w-2xl flex-col gap-6 bg-white/80 p-8 shadow-2xl dark:bg-black/60">
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
            const canAction = isMyTurn && !status && !submitting && remaining.includes(map);
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
                )}
                style={{ background: '#222' }}
                onClick={() => canAction && handleAction(map)}
              >
                <Image
                  src={MAP_IMAGE_BASE + img}
                  alt={map}
                  width={220}
                  height={120}
                  className="h-[120px] w-full object-cover transition-all duration-700"
                  style={{
                    height: 'auto',
                    filter: status === 'ban' ? 'grayscale(1) blur(1px)' : undefined,
                  }}
                  priority
                />
                <div className="absolute right-0 bottom-0 left-0 bg-black/60 py-1 text-center text-sm font-bold text-white">
                  {map}
                  {status === 'ban' && (by === 'A' ? ' (A Ban)' : ' (B Ban)')}
                  {status === 'pick' && (by === 'A' ? ' (A Pick)' : ' (B Pick)')}
                  {status === 'decider' && ' (Decider)'}
                </div>
                {canAction && (
                  <Button
                    size="sm"
                    className="absolute top-2 right-2 z-10 bg-yellow-500 text-black hover:bg-yellow-600"
                    disabled={submitting}
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
