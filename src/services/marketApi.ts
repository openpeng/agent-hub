// 市场 API 封装 — 对接 agent-market FastAPI 服务

import type {
  MarketTeamListItem,
  MarketTeamDetail,
  MarketWorkflowListItem,
  MarketWorkflowDetail,
} from '../types';

const DEFAULT_MARKET_URL = import.meta.env.VITE_MARKET_URL || 'http://localhost:8321';

export interface MarketAgentListItem {
  id: string;
  display_name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  download_count: number;
  rating: number;
  package_size: number;
  created_at: string;
}

export interface MarketAgentDetail extends MarketAgentListItem {
  name: string;
  author: string;
  type: string;
  readme: string;
  license: string;
  homepage_url: string;
  source_url: string;
  dependencies: Record<string, string>;
  json_content: string;
  updated_at: string;
  published_at: string | null;
}

export interface MarketSearchResult {
  total: number;
  page: number;
  page_size: number;
  items: MarketAgentListItem[];
}

export interface RatingItem {
  score: number;
  comment: string;
  created_at: string;
}

export interface RatingsResult {
  items: RatingItem[];
  total: number;
  average: number;
}

export interface UploadResult {
  id: string;
  version: string;
  package_size: number;
}

export interface ApiKeyItem {
  key: string;
  owner: string;
  role: string;
}

export interface HealthStatus {
  status: string;
  agents_count: number;
  uptime: number;
}

export function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = localStorage.getItem('market_api_key');
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

export async function searchMarketAgents(params: {
  q?: string;
  category?: string;
  type?: string;
  tags?: string;
  sort?: 'downloads' | 'rating' | 'created' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
  marketUrl?: string;
}): Promise<MarketSearchResult> {
  const baseUrl = params.marketUrl || DEFAULT_MARKET_URL;
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.category) searchParams.set('category', params.category);
  if (params.type) searchParams.set('type', params.type);
  if (params.tags) searchParams.set('tags', params.tags);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));

  const res = await fetch(`${baseUrl}/api/v1/agents?${searchParams}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function getMarketAgentDetail(
  agentId: string,
  marketUrl?: string
): Promise<MarketAgentDetail> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/agents/${encodeURIComponent(agentId)}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function getMarketAgentRatings(
  agentId: string,
  marketUrl?: string
): Promise<RatingsResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/agents/${encodeURIComponent(agentId)}/ratings`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function submitMarketRating(
  agentId: string,
  score: number,
  comment: string,
  marketUrl?: string
): Promise<void> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/agents/${encodeURIComponent(agentId)}/ratings`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, comment }),
  });
  if (!res.ok) throw new Error(`评分提交失败: ${res.status}`);
}

export async function deleteMarketAgent(
  agentId: string,
  marketUrl?: string
): Promise<void> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`删除失败: ${res.status}`);
}

export async function uploadMarketAgent(
  file: File,
  force: boolean,
  marketUrl?: string
): Promise<UploadResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('force', String(force));

  const res = await fetch(`${baseUrl}/api/v1/agents`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `上传失败: ${res.status}`);
  }
  return res.json();
}

export async function listApiKeys(marketUrl?: string): Promise<ApiKeyItem[]> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/api-keys`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`获取API Keys失败: ${res.status}`);
  return res.json();
}

export async function createApiKey(
  owner: string,
  role: string,
  marketUrl?: string
): Promise<{ key: string }> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/api-keys`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `创建失败: ${res.status}`);
  }
  return res.json();
}

export async function revokeApiKey(
  key: string,
  marketUrl?: string
): Promise<void> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/api-keys/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`撤销失败: ${res.status}`);
}

export async function checkMarketHealth(marketUrl?: string): Promise<HealthStatus | null> {
  try {
    const baseUrl = marketUrl || DEFAULT_MARKET_URL;
    const res = await fetch(`${baseUrl}/api/v1/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

<<<<<<< HEAD
// ─── Team API ───

export interface MarketTeamSearchResult {
  total: number;
  page: number;
  page_size: number;
  items: MarketTeamListItem[];
}

export async function searchMarketTeams(params: {
  q?: string;
  category?: string;
  type?: string;
  tags?: string;
  sort?: 'downloads' | 'rating' | 'created' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
  marketUrl?: string;
}): Promise<MarketTeamSearchResult> {
  const baseUrl = params.marketUrl || DEFAULT_MARKET_URL;
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.category) searchParams.set('category', params.category);
  if (params.type) searchParams.set('type', params.type);
  if (params.tags) searchParams.set('tags', params.tags);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));

  const res = await fetch(`${baseUrl}/api/v1/teams?${searchParams}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function getMarketTeamDetail(
  teamId: string,
  marketUrl?: string
): Promise<MarketTeamDetail> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/teams/${encodeURIComponent(teamId)}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function getMarketTeamRatings(
  teamId: string,
  marketUrl?: string
): Promise<RatingsResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/teams/${encodeURIComponent(teamId)}/ratings`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function submitMarketTeamRating(
  teamId: string,
  score: number,
  comment: string,
  marketUrl?: string
): Promise<void> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/teams/${encodeURIComponent(teamId)}/ratings`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, comment }),
  });
  if (!res.ok) throw new Error(`评分提交失败: ${res.status}`);
}

export async function deleteMarketTeam(
  teamId: string,
  marketUrl?: string
): Promise<void> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/teams/${encodeURIComponent(teamId)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`删除失败: ${res.status}`);
}

export async function uploadMarketTeam(
  file: File,
  force: boolean,
  marketUrl?: string
): Promise<UploadResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('force', String(force));

  const res = await fetch(`${baseUrl}/api/v1/teams`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `上传失败: ${res.status}`);
  }
  return res.json();
}

// ============================================================
//  Skills API
// ============================================================

export interface MarketSkillItem {
  id: string;
  original_name: string;
  display_name: string;
  description: string;
  category: string;
  agent_count: number;
}

export interface SkillListResult {
  total: number;
  page: number;
  page_size: number;
  skills: MarketSkillItem[];
}

export interface SkillDetail {
  id: string;
  original_name: string;
  display_name: string;
  description: string;
  version: string;
  category: string;
  agents: Array<{ id: string; name: string; version: string }>;
}

export interface RegisterSkillResult {
  ok: boolean;
  id: string;
}

export async function listMarketSkills(
  params: { q?: string; category?: string; page?: number; page_size?: number } = {},
  marketUrl?: string
): Promise<SkillListResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.category) searchParams.set('category', params.category);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));

  const res = await fetch(`${baseUrl}/api/v1/skills?${searchParams}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Skills API错误: ${res.status}`);
  return res.json();
}

export async function getMarketSkillDetail(
  skillId: string,
  marketUrl?: string
): Promise<SkillDetail> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/skills/${encodeURIComponent(skillId)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Skill详情错误: ${res.status}`);
  return res.json();
}

export async function registerSkill(
  data: {
    id: string;
    original_name: string;
    display_name: string;
    description: string;
    version: string;
    category: string;
  },
  marketUrl?: string
): Promise<RegisterSkillResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/skills`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `注册Skill失败: ${res.status}`);
>>>>>>> 1df5d541d6da90e1bebbbc5bcef7a709061ff073
  }
  return res.json();
}

<<<<<<< HEAD
// ─── Workflow API ───

export interface MarketWorkflowSearchResult {
  total: number;
  page: number;
  page_size: number;
  items: MarketWorkflowListItem[];
}

export async function searchMarketWorkflows(params: {
  q?: string;
  category?: string;
  type?: string;
  tags?: string;
  sort?: 'downloads' | 'rating' | 'created' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
  marketUrl?: string;
}): Promise<MarketWorkflowSearchResult> {
  const baseUrl = params.marketUrl || DEFAULT_MARKET_URL;
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.category) searchParams.set('category', params.category);
  if (params.type) searchParams.set('type', params.type);
  if (params.tags) searchParams.set('tags', params.tags);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));

  const res = await fetch(`${baseUrl}/api/v1/workflows?${searchParams}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function getMarketWorkflowDetail(
  workflowId: string,
  marketUrl?: string
): Promise<MarketWorkflowDetail> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function getMarketWorkflowRatings(
  workflowId: string,
  marketUrl?: string
): Promise<RatingsResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}/ratings`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`市场API错误: ${res.status}`);
  return res.json();
}

export async function submitMarketWorkflowRating(
  workflowId: string,
  score: number,
  comment: string,
  marketUrl?: string
): Promise<void> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}/ratings`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, comment }),
  });
  if (!res.ok) throw new Error(`评分提交失败: ${res.status}`);
}

export async function deleteMarketWorkflow(
  workflowId: string,
  marketUrl?: string
): Promise<void> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`删除失败: ${res.status}`);
}

export async function uploadMarketWorkflow(
  file: File,
  force: boolean,
  marketUrl?: string
): Promise<UploadResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('force', String(force));

  const res = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `上传失败: ${res.status}`);
  }
  return res.json();
}

// ============================================================
//  MCP Servers API
// ============================================================

export interface MarketMcpServerItem {
  id: string;
  original_name: string;
  description: string;
  command: string;
  agent_count: number;
}

export interface McpServerListResult {
  total: number;
  page: number;
  page_size: number;
  servers: MarketMcpServerItem[];
}

export interface McpServerDetail {
  id: string;
  original_name: string;
  description: string;
  command: string;
  args: string[];
  required_env: string[];
  agents: Array<{ id: string; name: string; version: string }>;
}

export interface RegisterMcpServerResult {
  ok: boolean;
  id: string;
}

export async function listMarketMcpServers(
  params: { q?: string; page?: number; page_size?: number } = {},
  marketUrl?: string
): Promise<McpServerListResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));

  const res = await fetch(`${baseUrl}/api/v1/mcp-servers?${searchParams}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`MCP Servers API错误: ${res.status}`);
  return res.json();
}

export async function getMarketMcpServerDetail(
  serverId: string,
  marketUrl?: string
): Promise<McpServerDetail> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/mcp-servers/${encodeURIComponent(serverId)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`MCP Server详情错误: ${res.status}`);
  return res.json();
}

export async function registerMcpServer(
  data: {
    id: string;
    original_name: string;
    description: string;
    command: string;
    args: string[];
    required_env: string[];
  },
  marketUrl?: string
): Promise<RegisterMcpServerResult> {
  const baseUrl = marketUrl || DEFAULT_MARKET_URL;
  const res = await fetch(`${baseUrl}/api/v1/mcp-servers`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `注册MCP Server失败: ${res.status}`);
>>>>>>> 1df5d541d6da90e1bebbbc5bcef7a709061ff073
  }
  return res.json();
}
