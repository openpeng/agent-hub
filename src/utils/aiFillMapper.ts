// AI 生成配置清洗和校验工具

import type { AgentConfig, SkillRef, McpToolRef } from '../types';

const VALID_CATEGORIES = ['办公效率', '数据分析', '内容创作', '开发工具', '客户服务', '教育学习'];
const VALID_ICONS = ['🤖', '📊', '✍️', '🔍', '💬', '🛠️', '🎨', '📋'];

export function sanitizeAIConfig(raw: any): Partial<AgentConfig> {
  const name = typeof raw.name === 'string'
    ? raw.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';

  const icon = VALID_ICONS.includes(raw.icon) ? raw.icon : '🤖';

  const categories = Array.isArray(raw.categories)
    ? raw.categories.filter((c: string) => VALID_CATEGORIES.includes(c)).slice(0, 3)
    : [];

  const skills: SkillRef[] = Array.isArray(raw.skills)
    ? raw.skills.map((s: any, i: number) => ({
        skillId: s.skillId || s.name || `skill-${i}`,
        name: s.name || `Skill ${i + 1}`,
        version: s.version || '1.0.0',
        description: s.description || '',
        icon: s.icon || '🛠️',
        category: s.category || (categories[0] || '办公效率'),
        parameters: s.parameters || {},
        priority: i,
        isOfficial: false,
      }))
    : [];

  const mcpTools: McpToolRef[] = Array.isArray(raw.mcpTools)
    ? raw.mcpTools.map((t: any) => ({
        toolId: t.toolId || t.name || `mcp-${Date.now()}`,
        name: t.name || 'MCP Tool',
        description: t.description || '',
        icon: t.icon || '🔌',
        category: t.category || '第三方API',
        config: t.config || {},
        permissions: Array.isArray(t.permissions) ? t.permissions : [],
        isConnected: false,
      }))
    : [];

  const descSummary = raw.description?.summary || '';
  const descDetail = raw.description?.detail || '';
  const descExamples = Array.isArray(raw.description?.examples)
    ? raw.description.examples.filter((e: any) => typeof e === 'string').slice(0, 5)
    : [];

  const sampleInputs = Array.isArray(raw.sampleInputs)
    ? raw.sampleInputs.filter((s: any) => typeof s === 'string').slice(0, 5)
    : [];

  return {
    name,
    version: raw.version || '1.0.0',
    icon,
    developer: raw.developer || '',
    description: {
      summary: descSummary,
      detail: descDetail,
      examples: descExamples,
    },
    categories,
    skills,
    mcpTools,
    welcomeMessage: raw.welcomeMessage || `你好！我是${name || 'AI助手'}，有什么可以帮你的吗？`,
    sampleInputs,
  };
}
