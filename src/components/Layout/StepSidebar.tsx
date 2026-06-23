import type { ReactNode } from 'react';
import { FileText, Puzzle, Wrench, Eye, Check } from 'lucide-react';
import { useAgentStore } from '../../store/useAgentStore';
import type { BuildStepInfo } from '../../types';
import './StepSidebar.css';

// 步骤配置：定义构建器的四个步骤
const steps: BuildStepInfo[] = [
  { id: 'intro', title: 'Agent 介绍', description: '配置基本信息', icon: 'file-text' },
  { id: 'skills', title: 'Skill 选择', description: '选择能力模块', icon: 'puzzle' },
  { id: 'mcp-tools', title: 'MCP 工具', description: '配置外部工具', icon: 'wrench' },
  { id: 'preview-publish', title: '预览发布', description: '测试并发布', icon: 'eye' },
];

// 图标映射表：将步骤图标名称映射到对应的 lucide-react 组件
const iconMap: Record<string, ReactNode> = {
  'file-text': <FileText size={18} />,
  'puzzle': <Puzzle size={18} />,
  'wrench': <Wrench size={18} />,
  'eye': <Eye size={18} />,
};

export default function StepSidebar() {
  const currentStep = useAgentStore((s) => s.currentStep);
  const stepCompleted = useAgentStore((s) => s.stepCompleted);
  const setCurrentStep = useAgentStore((s) => s.setCurrentStep);

  return (
    <aside className="step-sidebar">
      <div className="step-list">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = stepCompleted[step.id];
          return (
            <button
              key={step.id}
              className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => setCurrentStep(step.id)}
            >
              <div className="step-indicator">
                {isCompleted ? <Check size={16} /> : iconMap[step.icon]}
              </div>
              <div className="step-content">
                <span className="step-title">{step.title}</span>
                <span className="step-desc">{step.description}</span>
              </div>
              <span className="step-number">{index + 1}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
