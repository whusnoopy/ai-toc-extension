import json
import re
import os

def build_userscript():
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    manifest_path = os.path.join(workspace_dir, 'manifest.json')
    css_path = os.path.join(workspace_dir, 'style.css')
    js_path = os.path.join(workspace_dir, 'content.js')
    output_path = os.path.join(workspace_dir, 'ai-toc-pro.user.js')

    # Read manifest.json
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # Read style.css
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()

    # Read content.js
    with open(js_path, 'r', encoding='utf-8') as f:
        js = f.read()

    # 1. Extract metadata
    name = manifest.get('name', 'AI TOC Pro')
    version = manifest.get('version', '1.0.0')
    description = manifest.get('description', '')
    
    content_scripts = manifest.get('content_scripts', [{}])[0]
    matches = content_scripts.get('matches', [])
    run_at_raw = content_scripts.get('run_at', 'document_idle')
    
    # Map Chrome extension run_at to UserScript run-at
    run_at_map = {
        'document_idle': 'document-idle',
        'document_start': 'document-start',
        'document_end': 'document-end'
    }
    run_at = run_at_map.get(run_at_raw, 'document-idle')

    # 2. Build UserScript header
    header_lines = [
        "// ==UserScript==",
        f"// @name         {name}",
        "// @namespace    https://leongao.com/",
        "// @downloadURL  https://github.com/leongao/ai-toc-extension/raw/refs/heads/main/ai-toc-pro.user.js",
        f"// @version      {version}",
        f"// @description  {description}",
        "// @author       leongao"
    ]
    for match in matches:
        header_lines.append(f"// @match        {match}")
    header_lines.append("// @grant        GM_addStyle")
    header_lines.append(f"// @run-at       {run_at}")
    header_lines.append("// ==/UserScript==\n")

    header = "\n".join(header_lines)

    # 3. Process content.js safeHTML wrapping
    # We replace container.innerHTML = '...' and container.innerHTML = ''
    js = re.sub(r"(container\.innerHTML\s*=\s*)('.*?')", r"\1safeHTML(\2)", js)
    # We replace root.innerHTML = `...`
    js = re.sub(r"(root\.innerHTML\s*=\s*)(`[\s\S]*?`)", r"\1safeHTML(\2)", js)

    safe_html_code = """
  // 注入 safeHTML 转化逻辑 (兼容 Trusted Types)
  const safeHTML = (html) => {
    if (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {
      if (!window.aiTocSafePolicy) {
        try {
          window.aiTocSafePolicy = trustedTypes.createPolicy('aiTocSafePolicy', {
            createHTML: (string) => string
          });
        } catch (e) {
          // 在由于策略重名等导致的异常时降级
          return html;
        }
      }
      return window.aiTocSafePolicy.createHTML(html);
    }
    return html;
  };
"""

    # Insert safeHTML logic at the top of the IIFE
    js = js.replace("(function() {", f"(function() {{\n{safe_html_code}")

    # 4. Process CSS text embedding
    css_injection = f"\nGM_addStyle(`\n{css}\n`);\n\n"

    # Assemble final script
    final_script = header + "\n" + css_injection + js

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_script)

    print(f"Successfully generated {output_path}")

if __name__ == '__main__':
    build_userscript()
