// Agent Bridge API 封装 — 前端调用本地 AI Agent 运行时

const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3210';

export interface GenerateConfigResponse {
  success: boolean;
  config?: Record<string, any>;
  rawText?: string;
  error?: string;
}

export async function generateAgentConfig(
  userRequest: string,
  sessionId?: string
): Promise<GenerateConfigResponse> {
  const res = await fetch(`${BRIDGE_URL}/api/generate-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userRequest, sessionId }),
  });
  if (!res.ok) throw new Error(`Bridge API错误: ${res.status}`);
  return res.json();
}

export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
