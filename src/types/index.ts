// Agent配置类型
export interface AgentConfig {
  id: string;
  name: string;
  version: string;
  icon: string;
  description: AgentDescription;
  categories: string[];
  skills: SkillRef[];
  mcpTools: McpToolRef[];
  welcomeMessage: string;
  sampleInputs: string[];
  developer: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
}

export interface AgentDescription {
  summary: string;
  detail: string;
  examples: string[];
}

export interface SkillRef {
  skillId: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  category: string;
  parameters: Record<string, any>;
  priority: number;
  isOfficial: boolean;
}

export interface McpToolRef {
  toolId: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  config: Record<string, any>;
  permissions: string[];
  isConnected: boolean;
}

// Skill库类型
export interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  category: string;
  author: string;
  downloads: number;
  rating: number;
  isOfficial: boolean;
  parameters: SkillParameter[];
  dependencies: string[];
}

export interface SkillParameter {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  default: any;
  options?: string[];
  description: string;
}

// MCP工具类型
export interface McpTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  author: string;
  downloads: number;
  rating: number;
  configFields: ConfigField[];
  permissions: string[];
  status: 'active' | 'deprecated';
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'password';
  required: boolean;
  default: any;
  options?: string[];
  description: string;
  placeholder?: string;
}

// 构建步骤
export type BuildStep = 'intro' | 'skills' | 'mcp-tools' | 'preview-publish';

export interface BuildStepInfo {
  id: BuildStep;
  title: string;
  description: string;
  icon: string;
}

// 预览消息类型
export interface PreviewMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// 市场 Team 类型
export interface MarketTeamListItem {
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

export interface MarketTeamDetail extends MarketTeamListItem {
  name: string;
  author: string;
  type: string;
  readme: string;
  license: string;
  homepage_url: string;
  source_url: string;
  dependencies: Record<string, any>;
  json_content: string;
  updated_at: string;
  published_at: string | null;
}

// 市场 Workflow 类型（结构与 Team 相同）
export interface MarketWorkflowListItem {
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

export interface MarketWorkflowDetail extends MarketWorkflowListItem {
  name: string;
  author: string;
  type: string;
  readme: string;
  license: string;
  homepage_url: string;
  source_url: string;
  dependencies: Record<string, any>;
  json_content: string;
  updated_at: string;
  published_at: string | null;
}
