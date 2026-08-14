"use client";

import { AuthStatus } from "~/auth/status";
import { AgentChat } from "~/components/agent-chat";
import { env } from "~/env";

export default function HomePage() {
  return (
    <main className="container space-y-8 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Beat 개인 개발 파트너
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Beat Coding Agent
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Beat 계정으로 로그인해 코드와 개발 문서를 읽고, 근거와 함께
            검토·테스트 계획을 세우는 개인 코딩 에이전트입니다.
          </p>
        </div>
        <AuthStatus />
      </header>
      <section className="rounded-xl border bg-card p-3 shadow-sm">
        <AgentChat />
      </section>
      <p className="text-muted-foreground text-xs">
        API: {env.NEXT_PUBLIC_API_URL} · 초기 버전은 읽기 전용이며 파일
        수정·커밋·배포는 수행하지 않습니다.
      </p>
    </main>
  );
}
