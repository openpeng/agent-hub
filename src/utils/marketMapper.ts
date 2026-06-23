// 市场数据 → AgentConfig 映射工具

import type { AgentConfig, SkillRef, McpToolRef } from '../types';
import type { MarketAgentDetail } from '../services/marketApi';
import { mockMcpTools } from '../data/mockMcpTools';

const CATEGORY_MAP: Record<string, string> = {
  general: '办公效率',
  browser: '开发工具',
  data_analysis: '数据分析',
  content_creation: '内容创作',
  web_scraper: '数据分析',
  file_processor: '办公效率',
  ai_chat: '客户服务',
  utility: '办公效率',
  development: '开发工具',
  other: '办公效率',
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  general: '🤖',
  browser: '🔍',
  data_analysis: '📊',
  content_creation: '✍️',
  web_scraper: '🔍',
  file_processor: '📋',
  ai_chat: '💬',
  utility: '🛠️',
  development: '🛠️',
};

export function mapMarketAgentToConfig(detail: MarketAgentDetail): Partial<AgentConfig> {
  let jsonContent: any = null;
  try {
    jsonContent = JSON.parse(detail.json_content || '{}');
  } catch {
    // json_content 可能不是有效 JSON
  }

  const mappedCategory = CATEGORY_MAP[detail.category] || '办公效率';

  // 兼容多种 Agent JSON 结构
  const identity = jsonContent?.identity || {};
  const summary = identity.description || detail.description?.split('\n')[0] || detail.description || '';
  const detailText = identity.description || detail.description || '';

  // 解析 Skills — 兼容 skills 数组和 subagents 结构
  const skills: SkillRef[] = [];
  const rawSkills = jsonContent?.skills || [];
  if (Array.isArray(rawSkills)) {
    rawSkills.forEach((skill: any, index: number) => {
      skills.push({
        skillId: skill.name || skill.id || `skill-${index}`,
        name: skill.display_name || skill.name || `Skill ${index + 1}`,
        version: skill.version || '1.0.0',
        description: skill.description || '',
        icon: skill.icon || '🛠️',
        category: skill.category || mappedCategory,
        parameters: skill.parameters || {},
        priority: index,
        isOfficial: false,
      });
    });
  }

  // 解析 MCP Tools — 兼容 mcp_servers、mcp.required_servers、mcpServers 等多种字段名
  const mcpTools: McpToolRef[] = [];
  const rawMcpServers =
    jsonContent?.mcp_servers ||
    jsonContent?.mcp?.required_servers ||
    jsonContent?.mcpServers ||
    [];
  if (Array.isArray(rawMcpServers)) {
    rawMcpServers.forEach((server: any) => {
      const serverName = server.name || server.package || `mcp-${Date.now()}`;

      // 尝试从 mockMcpTools 中查找匹配的工具，获取完整数据
      const matchedTool = mockMcpTools.find(
        (t) => t.id === serverName || t.id === server.package
      );

      // 构建 config：优先使用 mockMcpTools 的 configFields 默认值
      let config: Record<string, any> = {};
      if (matchedTool) {
        matchedTool.configFields.forEach((f) => {
          config[f.key] = f.default;
        });
      } else {
        // 回退：使用原始 server 的 command/args/env
        config = {
          command: server.command || '',
          args: server.args || [],
          env: server.env || {},
        };
      }

      mcpTools.push({
        toolId: matchedTool?.id || serverName,
        name: matchedTool?.name || serverName,
        description: matchedTool?.description || server.description || `MCP 服务器: ${serverName}`,
        icon: matchedTool?.icon || '🔌',
        category: matchedTool?.category || '第三方API',
        config,
        permissions: matchedTool?.permissions || [],
        isConnected: true,
      });
    });
  }

  const categories = [mappedCategory];
  if (detail.tags?.length) {
    detail.tags.forEach(tag => {
      const mapped = CATEGORY_MAP[tag];
      if (mapped && !categories.includes(mapped)) {
        categories.push(mapped);
      }
    });
  }

  const examples = jsonContent?.usage_examples
    ?.map((e: any) => e.input || '')
    .filter(Boolean) || [];

  return {
    name: detail.display_name || detail.name || '',
    version: detail.version || '1.0.0',
    icon: CATEGORY_ICON_MAP[detail.category] || '🤖',
    developer: detail.author || '',
    description: {
      summary,
      detail: detailText,
      examples,
    },
    categories: categories.slice(0, 3),
    skills,
    mcpTools,
    welcomeMessage: `你好！我是${detail.display_name || detail.name || 'AI助手'}，${summary}`,
    sampleInputs: examples,
  };
}
