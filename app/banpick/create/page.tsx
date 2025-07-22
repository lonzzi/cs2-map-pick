'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MAP_POOL } from '@/lib/maps';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useState } from 'react';

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getSteps(mode: 'bo3' | 'bo5') {
  if (mode === 'bo3') {
    return [
      { action: 'ban', team: 'A' },
      { action: 'ban', team: 'B' },
      { action: 'pick', team: 'A' },
      { action: 'pick', team: 'B' },
      { action: 'ban', team: 'B' },
      { action: 'ban', team: 'A' },
    ];
  }
  return [
    { action: 'ban', team: 'A' },
    { action: 'ban', team: 'B' },
    { action: 'pick', team: 'A' },
    { action: 'pick', team: 'B' },
    { action: 'pick', team: 'A' },
    { action: 'pick', team: 'B' },
  ];
}

export default function CreateBanpickRoom() {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [mode, setMode] = useState<'bo3' | 'bo5'>('bo3');
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<{ room: string; teamA: string; teamB: string } | null>(null);

  async function handleCreate() {
    if (!teamA.trim() || !teamB.trim()) return;
    setLoading(true);
    const code = generateCode(6);
    const team_a_code = generateCode(10);
    const team_b_code = generateCode(10);
    const steps = getSteps(mode);
    const { data, error } = await supabase
      .from('rooms')
      .insert([
        {
          code,
          team_a: teamA.trim(),
          team_b: teamB.trim(),
          mode,
          map_pool: MAP_POOL,
          steps,
          progress: {
            bans: { A: [], B: [] },
            picks: { A: [], B: [] },
            decider: null,
            currentStep: 0,
          },
          team_a_code,
          team_b_code,
        },
      ])
      .select('code,team_a_code,team_b_code')
      .single();
    setLoading(false);
    if (error) {
      alert('创建失败: ' + error.message);
      return;
    }
    setLinks({
      room: `/banpick/${data.code}`,
      teamA: `/banpick/${data.code}/team/${data.team_a_code}`,
      teamB: `/banpick/${data.code}/team/${data.team_b_code}`,
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <Card className="flex w-full max-w-md flex-col gap-6 p-8">
        <h1 className="text-center text-2xl font-bold">创建 Ban/Pick 房间</h1>
        <Input placeholder="队伍A名称" value={teamA} onChange={(e) => setTeamA(e.target.value)} />
        <Input placeholder="队伍B名称" value={teamB} onChange={(e) => setTeamB(e.target.value)} />
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as 'bo3' | 'bo5')}
          className="flex gap-4"
        >
          <RadioGroupItem value="bo3" id="bo3" />
          <label htmlFor="bo3">BO3</label>
          <RadioGroupItem value="bo5" id="bo5" />
          <label htmlFor="bo5">BO5</label>
        </RadioGroup>
        <Button
          onClick={handleCreate}
          disabled={loading || !teamA || !teamB}
          className={cn('w-full', loading && 'opacity-60')}
        >
          {loading ? '创建中...' : '创建房间'}
        </Button>
        {links && (
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <div>
              <span className="font-bold">展示页：</span>
              <a href={links.room} className="text-blue-600 underline" target="_blank">
                {links.room}
              </a>
            </div>
            <div>
              <span className="font-bold">队伍A专属链接：</span>
              <a href={links.teamA} className="text-blue-600 underline" target="_blank">
                {links.teamA}
              </a>
            </div>
            <div>
              <span className="font-bold">队伍B专属链接：</span>
              <a href={links.teamB} className="text-blue-600 underline" target="_blank">
                {links.teamB}
              </a>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
