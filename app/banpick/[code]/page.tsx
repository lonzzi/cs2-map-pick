'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { MAP_IMAGE_MAP, MAP_IMAGE_BASE } from '@/lib/maps';

interface Room {
  code: string;
  team_a: string;
  team_b: string;
  mode: "bo3" | "bo5";
  map_pool: string[];
  steps: Array<{ action: "ban" | "pick"; team: "A" | "B" }>;
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
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single();
      setRoom(data as Room);
    }
    fetchRoom();
    sub = supabase
      .channel("room-" + code)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` },
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
        }
      )
      .subscribe();
    return () => {
      sub?.unsubscribe();
    };
    // eslint-disable-next-line
  }, [code]);

  if (!room) {
    return <div className="flex min-h-screen items-center justify-center">加载中...</div>;
  }

  const { team_a, team_b, mode, map_pool, steps, progress } = room;

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
      <Card className="w-full max-w-2xl p-8 flex flex-col gap-6 bg-white/80 dark:bg-black/60 shadow-2xl">
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg">{team_a}</span>
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{mode.toUpperCase()}</span>
          <span className="font-bold text-lg">{team_b}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 justify-center">
          {map_pool.map((map) => {
            let status: "ban" | "pick" | "decider" | null = null;
            let by: "A" | "B" | null = null;
            if (progress.bans.A.includes(map)) { status = "ban"; by = "A"; }
            else if (progress.bans.B.includes(map)) { status = "ban"; by = "B"; }
            else if (progress.picks.A.includes(map)) { status = "pick"; by = "A"; }
            else if (progress.picks.B.includes(map)) { status = "pick"; by = "B"; }
            else if (progress.decider === map) { status = "decider"; }
            const img = MAP_IMAGE_MAP[map] || "de_dust2.png";
            return (
              <div
                key={map}
                className={cn(
                  "relative flex flex-col items-center rounded-lg overflow-hidden shadow-lg transition-all duration-700",
                  status === "ban"
                    ? by === "A"
                      ? "ring-4 ring-red-500 scale-95 opacity-60"
                      : "ring-4 ring-orange-500 scale-95 opacity-60"
                    : status === "pick"
                    ? by === "A"
                      ? "ring-4 ring-blue-500 scale-105"
                      : "ring-4 ring-green-500 scale-105"
                    : status === "decider"
                    ? "ring-4 ring-black scale-110"
                    : "ring-2 ring-gray-300 hover:scale-105 hover:ring-yellow-400",
                  mapAnim === map && "animate-pulse animate-fadeIn"
                )}
                style={{ background: "#222" }}
              >
                <Image
                  src={MAP_IMAGE_BASE + img}
                  alt={map}
                  width={220}
                  height={120}
                  className="object-cover w-full h-[120px] transition-all duration-700"
                  style={{ height: 'auto', filter: status === 'ban' ? 'grayscale(1) blur(1px)' : undefined }}
                  priority
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-center py-1 text-sm font-bold">
                  {map}
                  {status === "ban" && (by === "A" ? " (A Ban)" : " (B Ban)")}
                  {status === "pick" && (by === "A" ? " (A Pick)" : " (B Pick)")}
                  {status === "decider" && " (Decider)"}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 mt-4">
          {steps.map((step, idx) => {
            const desc = step.action === "ban" ? "Ban" : "Pick";
            const team = step.team === "A" ? team_a : team_b;
            const done = idx < progress.currentStep;
            const current = idx === progress.currentStep;
            return (
              <div key={idx} className={cn("flex gap-2 items-center", current && "font-bold")}>
                <span>{team}</span>
                <span>{desc}</span>
                {done && <span className="text-xs text-green-600">✔</span>}
                {current && <span className="text-xs text-yellow-600">进行中</span>}
              </div>
            );
          })}
          {progress.decider && (
            <div className="flex gap-2 items-center font-bold">
              <span>决胜图</span>
              <span>{progress.decider}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
