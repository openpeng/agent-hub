import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentConfig, SkillRef, McpToolRef, BuildStep, PreviewMessage } from '../types';

interface AgentStore {
  // 当前步骤
  currentStep: BuildStep;
  setCurrentStep: (step: BuildStep) => void;

  // Agent配置
  agent: AgentConfig;
  updateAgent: (updates: Partial<AgentConfig>) => void;

  // Skills
  addSkill: (skill: SkillRef) => void;
  removeSkill: (skillId: string) => void;
  updateSkill: (skillId: string, updates: Partial<SkillRef>) => void;
  reorderSkills: (skills: SkillRef[]) => void;

  // MCP Tools
  addMcpTool: (tool: McpToolRef) => void;
  removeMcpTool: (toolId: string) => void;
  updateMcpTool: (toolId: string, updates: Partial<McpToolRef>) => void;

  // 预览
  previewMessages: PreviewMessage[];
  addPreviewMessage: (message: PreviewMessage) => void;
  clearPreviewMessages: () => void;

  // 步骤完成状态
  stepCompleted: Record<BuildStep, boolean>;
  setStepCompleted: (step: BuildStep, completed: boolean) => void;

  // 重置
  resetAgent: () => void;

  // 自动保存
  lastSaved: string | null;
  setLastSaved: (time: string) => void;

  // 市场导入
  importFromMarket: (config: Partial<AgentConfig>) => void;

  // AI 智能填写
  fillFromAI: (config: Partial<AgentConfig>) => void;
}

const defaultAgent: AgentConfig = {
  id: '',
  name: '',
  version: '1.0.0',
  icon: '',
  description: { summary: '', detail: '', examples: [] },
  categories: [],
  skills: [],
  mcpTools: [],
  welcomeMessage: '你好！我是你的AI助手，有什么可以帮你的吗？',
  sampleInputs: [],
  developer: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'draft',
};

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      currentStep: 'intro',
      setCurrentStep: (step) => set({ currentStep: step }),

      agent: { ...defaultAgent },
      updateAgent: (updates) =>
        set((state) => ({
          agent: { ...state.agent, ...updates, updatedAt: new Date().toISOString() },
        })),

      addSkill: (skill) =>
        set((state) => ({
          agent: {
            ...state.agent,
            skills: [...state.agent.skills, { ...skill, priority: state.agent.skills.length }],
          },
        })),
      removeSkill: (skillId) =>
        set((state) => ({
          agent: {
            ...state.agent,
            skills: state.agent.skills
              .filter((s) => s.skillId !== skillId)
              .map((s, i) => ({ ...s, priority: i })),
          },
        })),
      updateSkill: (skillId, updates) =>
        set((state) => ({
          agent: {
            ...state.agent,
            skills: state.agent.skills.map((s) =>
              s.skillId === skillId ? { ...s, ...updates } : s
            ),
          },
        })),
      reorderSkills: (skills) => set((state) => ({ agent: { ...state.agent, skills } })),

      addMcpTool: (tool) =>
        set((state) => ({
          agent: { ...state.agent, mcpTools: [...state.agent.mcpTools, tool] },
        })),
      removeMcpTool: (toolId) =>
        set((state) => ({
          agent: { ...state.agent, mcpTools: state.agent.mcpTools.filter((t) => t.toolId !== toolId) },
        })),
      updateMcpTool: (toolId, updates) =>
        set((state) => ({
          agent: {
            ...state.agent,
            mcpTools: state.agent.mcpTools.map((t) =>
              t.toolId === toolId ? { ...t, ...updates } : t
            ),
          },
        })),

      previewMessages: [],
      addPreviewMessage: (message) =>
        set((state) => ({ previewMessages: [...state.previewMessages, message] })),
      clearPreviewMessages: () => set({ previewMessages: [] }),

      stepCompleted: { intro: false, skills: false, 'mcp-tools': false, 'preview-publish': false },
      setStepCompleted: (step, completed) =>
        set((state) => ({
          stepCompleted: { ...state.stepCompleted, [step]: completed },
        })),

      resetAgent: () =>
        set({
          agent: { ...defaultAgent, id: '', createdAt: new Date().toISOString() },
          currentStep: 'intro',
          previewMessages: [],
          stepCompleted: { intro: false, skills: false, 'mcp-tools': false, 'preview-publish': false },
          lastSaved: null,
        }),

      lastSaved: null,
      setLastSaved: (time) => set({ lastSaved: time }),

      // 市场导入：将市场数据批量写入 store
      importFromMarket: (config) =>
        set((state) => {
          const mergedAgent: AgentConfig = {
            ...state.agent,
            ...config,
            id: state.agent.id || crypto.randomUUID(),
            createdAt: state.agent.createdAt,
            updatedAt: new Date().toISOString(),
            status: 'draft',
          };
          return {
            agent: mergedAgent,
            stepCompleted: {
              ...state.stepCompleted,
              intro: !!(mergedAgent.name && mergedAgent.description.summary),
              skills: mergedAgent.skills.length > 0,
              'mcp-tools': mergedAgent.mcpTools.length > 0,
            },
          };
        }),

      // AI 智能填写：将 AI 生成的配置写入 store
      fillFromAI: (config) =>
        set((state) => ({
          agent: {
            ...state.agent,
            ...config,
            id: state.agent.id || crypto.randomUUID(),
            updatedAt: new Date().toISOString(),
          },
          stepCompleted: {
            ...state.stepCompleted,
            intro: !!(config.name && config.description?.summary),
          },
        })),
    }),
    { name: 'agent-builder-store' }
  )
);
