// AgentConfig → agent.json 序列化器
// 将 builder 的 Store 状态序列化为 Market 兼容的 agent.json 格式
//
// 映射规则参考 agent-market/src/market/skills_mcp.py：
//   - skills[]  → Format B（agent.json 顶层 skills 数组）
//   - mcpTools[] → Format A1（agent.json 顶层 mcp_servers 数组）

import type { AgentConfig, SkillRef, McpToolRef } from '../types';

/**
 * 将中文分类标签转为小写连字符格式（用于 tags）
 */
function categoriesToTags(categories: string[]): string[] {
  const MAP: Record<string, string> = {
    办公效率: 'productivity',
    开发工具: 'development',
    数据分析: 'data-analysis',
    内容创作: 'content-creation',
    客户服务: 'customer-service',
  };
  return categories.map((c) => MAP[c] || c.toLowerCase().replace(/\s+/g, '-'));
}

/**
 * 将 SkillRef 转换为 skills 数组条目
 */
function skillRefToJson(skill: SkillRef): Record<string, unknown> {
  return {
    name: skill.name || skill.skillId,
    display_name: skill.name,
    description: skill.description || '',
    version: skill.version || '1.0.0',
    category: skill.category || '',
    icon: skill.icon || '',
  };
}

/**
 * 将 McpToolRef 转换为 mcp_servers 数组条目
 */
function mcpToolRefToJson(tool: McpToolRef): Record<string, unknown> {
  const config = tool.config || {};
  return {
    name: tool.name || tool.toolId,
    description: tool.description || '',
    command: typeof config.command === 'string' ? config.command : '',
    args: Array.isArray(config.args) ? config.args : [],
    package: typeof config.package === 'string' ? config.package : undefined,
    tools: [],
    env: typeof config.env === 'object' && config.env !== null ? config.env : {},
  };
}

/**
 * 主序列化函数：将 AgentConfig 转为 agent.json 对象
 */
export function serializeAgentConfigToJson(config: AgentConfig): Record<string, unknown> {
  const tags = categoriesToTags(config.categories);

  // 如果有 emoji icon 且不在 tags 中，追加
  if (config.icon && !tags.includes(config.icon)) {
    tags.push(config.icon);
  }

  const agentJson: Record<string, unknown> = {
    identity: {
      name: config.name || 'untitled-agent',
      version: config.version || '1.0.0',
      display_name: config.name || 'Untitled Agent',
      description: config.description?.summary || config.description?.detail?.split('\n')[0] || '',
      author: config.developer || '',
      tags: tags.length > 0 ? tags : undefined,
    },
    category: categoriesToTags(config.categories)[0] || 'general',
  };

  // instructions：将 detail 作为内联 markdown
  const detailText = config.description?.detail?.trim();
  if (detailText) {
    agentJson.instructions = {
      format: 'markdown',
      source: 'inline',
      content: detailText,
    };
  }

  // skills（Format B）
  if (config.skills && config.skills.length > 0) {
    agentJson.skills = config.skills.map(skillRefToJson);
  }

  // mcp_servers（Format A1）
  if (config.mcpTools && config.mcpTools.length > 0) {
    agentJson.mcp_servers = config.mcpTools.map(mcpToolRefToJson);
  }

  return agentJson;
}

/**
 * 便捷方法：序列化为 JSON 字符串
 */
export function serializeAgentConfigToString(config: AgentConfig, pretty = true): string {
  return JSON.stringify(serializeAgentConfigToJson(config), null, pretty ? 2 : 0);
}
