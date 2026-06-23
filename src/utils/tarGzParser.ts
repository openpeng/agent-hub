// 浏览器端 tar.gz 解析工具 — 从下载的 Agent 包中提取 agent.json

/**
 * 从 tar.gz blob 中提取 agent.json 内容
 * 使用浏览器原生 DecompressionStream + 手动解析 tar 格式
 */
export async function extractAgentJsonFromTarGz(blob: Blob): Promise<any | null> {
  try {
    // 1. 解压 gzip
    const ds = new DecompressionStream('gzip');
    const decompressedStream = blob.stream().pipeThrough(ds);
    const decompressedBlob = await new Response(decompressedStream).blob();

    // 2. 读取为 ArrayBuffer
    const buffer = await decompressedBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 3. 解析 tar 格式，查找 agent.json
    let offset = 0;
    while (offset < bytes.length - 512) {
      // tar header: 512 bytes
      // filename: 0-100, size: 124-136 (octal string)
      const nameBytes = bytes.slice(offset, offset + 100);
      const name = new TextDecoder().decode(nameBytes).replace(/\0+$/, '');

      // size field at offset 124, 12 bytes octal
      const sizeField = new TextDecoder().decode(bytes.slice(offset + 124, offset + 136)).trim();
      const fileSize = parseInt(sizeField, 8) || 0;

      // typeflag at offset 156
      const typeFlag = bytes[offset + 156];

      // data starts at offset + 512
      const dataOffset = offset + 512;

      if (name.endsWith('agent.json') && (typeFlag === 0 || typeFlag === 48 || typeFlag === 0x30)) {
        // Found agent.json — extract content
        const contentBytes = bytes.slice(dataOffset, dataOffset + fileSize);
        const content = new TextDecoder().decode(contentBytes);
        return JSON.parse(content);
      }

      // Move to next entry: data + padding to 512-byte boundary
      const dataBlocks = Math.ceil(fileSize / 512);
      offset = dataOffset + dataBlocks * 512;

      // Safety: if name is empty, we've reached the end
      if (!name) break;
    }

    return null;
  } catch (e) {
    console.error('Failed to extract agent.json from tar.gz:', e);
    return null;
  }
}
