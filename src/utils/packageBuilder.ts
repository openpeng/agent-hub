// 浏览器端 tar.gz 打包器
// 将 agent.json + README.md 打包为 Market 兼容的 .tar.gz

import { serializeAgentConfigToString } from './agentJsonSerializer';
import type { AgentConfig } from '../types';

/** 写入 tar header 到 DataView，返回 header 的字节长度（固定 512） */
function writeTarHeader(
  view: DataView,
  offset: number,
  filename: string,
  fileSize: number,
  fileMode: number
): number {
  const encoder = new TextEncoder();
  const header = new Uint8Array(512);

  // name (0-99)
  const nameBytes = encoder.encode(filename);
  header.set(nameBytes.slice(0, Math.min(nameBytes.length, 99)), 0);

  // mode (100-107) — octal
  const modeStr = fileMode.toString(8).padStart(7, '0') + '\0';
  header.set(encoder.encode(modeStr).slice(0, 8), 100);

  // uid (108-115) — "0000000\0"
  const uidStr = '0000000\0';
  header.set(encoder.encode(uidStr).slice(0, 8), 108);

  // gid (116-123) — "0000000\0"
  const gidStr = '0000000\0';
  header.set(encoder.encode(gidStr).slice(0, 8), 116);

  // size (124-135) — octal, 11 digits + null terminator
  const sizeOctal = fileSize.toString(8).padStart(11, '0') + '\0';
  header.set(encoder.encode(sizeOctal).slice(0, 12), 124);

  // mtime (136-147) — octal, 11 digits + null terminator
  const now = Math.floor(Date.now() / 1000);
  const mtimeOctal = now.toString(8).padStart(11, '0') + '\0';
  header.set(encoder.encode(mtimeOctal).slice(0, 12), 136);

  // chksum (148-155) — fill with spaces first
  const spaceBytes = encoder.encode('        '); // 8 spaces
  header.set(spaceBytes, 148);

  // typeflag (156) — '0' for regular file
  header[156] = 0x30;

  // magic (257-263) — "ustar\0"
  const magicBytes = encoder.encode('ustar\0');
  header.set(magicBytes.slice(0, 6), 257);

  // version (264-265) — "00"
  header[264] = 0x30;
  header[265] = 0x30;

  // Compute checksum: sum all header bytes (treat spaces in chksum field as spaces)
  let sum = 0;
  for (let i = 0; i < 512; i++) {
    sum += header[i];
  }
  const chksumOctal = sum.toString(8).padStart(6, '0') + '\0 '; // 6 digits + null + space
  header.set(encoder.encode(chksumOctal).slice(0, 8), 148);

  // Write header to view
  const target = new Uint8Array(view.buffer, view.byteOffset + offset, 512);
  target.set(header);

  return 512;
}

/** 生成 README.md 内容 */
function generateReadme(config: AgentConfig): string {
  const name = config.name || 'untitled-agent';
  const displayName = config.name || 'Untitled Agent';
  const summary = config.description?.summary || '';
  const detail = config.description?.detail || '';

  const lines = [
    `# ${displayName}`,
    '',
    summary ? `> ${summary}` : '',
    summary ? '' : '',
    detail ? detail : '',
    detail ? '' : '',
    '## 基础信息',
    '',
    `- **名称**: \`${name}\``,
    `- **版本**: \`${config.version || '1.0.0'}\``,
    `- **作者**: ${config.developer || '未填写'}`,
    '',
  ];

  if (config.skills && config.skills.length > 0) {
    lines.push('## Skills', '');
    config.skills.forEach((s) => {
      lines.push(`- ${s.icon || ''} **${s.name}** v${s.version}: ${s.description || ''}`);
    });
    lines.push('');
  }

  if (config.mcpTools && config.mcpTools.length > 0) {
    lines.push('## MCP Tools', '');
    config.mcpTools.forEach((t) => {
      lines.push(`- ${t.icon || ''} **${t.name}**: ${t.description || ''}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 打包结果
 */
export interface PackageResult {
  /** tar.gz 的 Blob */
  blob: Blob;
  /** agent.json 内容（调试用） */
  agentJsonContent: string;
}

/**
 * 将 AgentConfig 打包为 .tar.gz Blob
 *
 * 包内容：
 *   agent.json   — 序列化的 agent 配置
 *   README.md    — 自动生成的 readme
 */
export async function buildAgentPackage(config: AgentConfig): Promise<PackageResult> {
  const encoder = new TextEncoder();

  // 序列化 agent.json
  const agentJsonContent = serializeAgentConfigToString(config);
  const agentJsonBytes = encoder.encode(agentJsonContent);

  // 生成 README.md
  const readmeContent = generateReadme(config);
  const readmeBytes = encoder.encode(readmeContent);

  // 计算 tar 总大小
  const files = [
    { name: 'agent.json', data: agentJsonBytes, mode: 0o644 },
    { name: 'README.md', data: readmeBytes, mode: 0o644 },
  ];

  let tarSize = 0;
  for (const f of files) {
    tarSize += 512; // header
    const dataBlocks = Math.ceil(f.data.length / 512);
    tarSize += dataBlocks * 512; // data + padding
  }
  tarSize += 1024; // two zero-filled end blocks

  // 构建 tar buffer
  const tarBuffer = new Uint8Array(tarSize);
  let offset = 0;

  for (const f of files) {
    // header (512 bytes)
    offset += writeTarHeader(
      new DataView(tarBuffer.buffer),
      offset,
      `${f.name}\0`,
      f.data.length,
      f.mode
    );

    // file data
    tarBuffer.set(f.data, offset);
    offset += f.data.length;

    // padding to 512-byte boundary
    const padding = (512 - (f.data.length % 512)) % 512;
    if (padding > 0) {
      offset += padding; // zero-filled (buffer is already zero-initialized)
    }
  }

  // Two zero-filled 512-byte blocks mark end of tar
  // (buffer is already zero-initialized, offset already positions past last file)
  offset += 1024;

  // Compress with gzip
  const tarBlob = new Blob([tarBuffer]);
  const compressedStream = tarBlob.stream().pipeThrough(new CompressionStream('gzip'));
  const compressedBlob = await new Response(compressedStream).blob();

  return {
    blob: compressedBlob,
    agentJsonContent,
  };
}
