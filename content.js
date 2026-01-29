(function() {
  const ROOT_ID = 'ai-toc-root';
  const CONTENT_ID = 'ai-toc-content';
  let tocData = [];
  let activeId = null;
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  // 1. 提取标题
  function collectHeadings() {
    const results = [];
    const seenText = new Set();
    const selectors = [
      'article .markdown h2', 'article .markdown h3',
      'markdown-element h2', 'markdown-element h3',
      '.message-content h2', '.message-content h3',
      '.model-response-text h2', '.model-response-text h3',
      '.font-claude-message h2', '.font-claude-message h3',
      '.prose h2', '.prose h3'
    ];
    const headings = document.querySelectorAll(selectors.join(', '));
    headings.forEach((h, index) => {
      const text = h.innerText.replace(/#+/g, '').trim();
      if (!text || text.length < 2 || seenText.has(text)) return;
      seenText.add(text);
      const id = h.id || `ai-toc-node-${index}`;
      h.id = id;
      results.push({ level: h.tagName === 'H2' ? 2 : 3, text: text, id: id, node: h });
    });
    return results;
  }

  // 2. 渲染目录
  function renderTOC() {
    const container = document.getElementById(CONTENT_ID);
    if (!container) return;
    if (tocData.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;opacity:0.4;">等待内容生成...</div>';
      return;
    }
    container.innerHTML = '';
    tocData.forEach(item => {
      const div = document.createElement('div');
      const isActive = activeId === item.id;
      div.className = `ai-toc-item level-${item.level}${isActive ? ' active' : ''}`;
      div.innerText = item.text;
      div.onclick = (e) => {
        e.stopPropagation();
        activeId = item.id;
        renderTOC();
        item.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      container.appendChild(div);
    });
  }

  // 3. 拖拽与吸附逻辑
  function applySnapping(root, xPos) {
    const windowWidth = window.innerWidth;
    const rect = root.getBoundingClientRect();
    const centerX = xPos + rect.width / 2;
    root.classList.add('ai-toc-snap-transition');
    
    let config = JSON.parse(localStorage.getItem('ai-toc-pos') || '{}');
    if (centerX < windowWidth / 2) {
      root.style.left = '20px'; root.style.right = 'auto';
      config.side = 'left';
    } else {
      root.style.left = 'auto'; root.style.right = '20px';
      config.side = 'right';
    }
    config.top = root.style.top;
    localStorage.setItem('ai-toc-pos', JSON.stringify(config));
  }

  function setupDragging(root) {
    const header = root.querySelector('.ai-toc-header');
    header.onmousedown = function(e) {
      if (e.target.closest('button')) return;
      isDragging = true;
      root.classList.add('ai-toc-dragging');
      root.classList.remove('ai-toc-snap-transition');
      startX = e.clientX; startY = e.clientY;
      const rect = root.getBoundingClientRect();
      initialLeft = rect.left; initialTop = rect.top;

      document.onmousemove = (e) => {
        if (!isDragging) return;
        root.style.left = (initialLeft + (e.clientX - startX)) + 'px';
        root.style.top = (initialTop + (e.clientY - startY)) + 'px';
        root.style.right = 'auto';
      };

      document.onmouseup = (e) => {
        if (!isDragging) return;
        isDragging = false;
        root.classList.remove('ai-toc-dragging');
        applySnapping(root, initialLeft + (e.clientX - startX));
        document.onmousemove = null; document.onmouseup = null;
      };
    };
  }

  // 4. 挂载 UI
  function mountUI() {
    if (document.getElementById(ROOT_ID)) return;
    const root = document.createElement('div');
    root.id = ROOT_ID;
    
    // 读取记忆位置和折叠状态
    const savedConfig = JSON.parse(localStorage.getItem('ai-toc-pos') || '{}');
    if (savedConfig.top) root.style.top = savedConfig.top;
    if (savedConfig.side === 'left') { root.style.left = '20px'; root.style.right = 'auto'; }
    else { root.style.left = 'auto'; root.style.right = '20px'; }
    
    // 初始化折叠状态
    if (savedConfig.collapsed) {
        root.classList.add('collapsed');
    }

    root.innerHTML = `
      <div class="ai-toc-header">
        <button id="ai-toc-toggle-btn" title="折叠/展开">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4L7 10L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span class="ai-toc-title">Navigation</span>
        <div class="ai-toc-actions">
          <button id="ai-toc-refresh-btn" title="手动刷新">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.49 13.17C8.64 13.53 7.75 13.7 6.86 13.7C5.08 13.7 3.32 13.01 2.01 11.7C0.72 10.41 0 8.68002 0 6.85002C0 5.02002 0.72 3.30002 2.01 2.00002L2.62 1.40002L3.77 5.55002L1.85 5.70002C1.76 6.07002 1.72 6.46002 1.72 6.85002C1.72 8.23002 2.25 9.52002 3.22 10.49C4.75 12.01 7.08 12.42 9.03 11.51L9.49 13.17Z" fill="currentColor"/>
              <path d="M13.72 6.85C13.72 8.68 13 10.4 11.71 11.7L11.1 12.31L9.94998 8.15L11.87 8.01C11.96 7.63 12 7.24 12 6.85C12 5.48 11.47 4.19 10.49 3.21C8.96998 1.69 6.63998 1.28 4.68998 2.2L4.22998 0.53C6.76998 -0.54 9.73998 0.04 11.71 2C13 3.3 13.72 5.02 13.72 6.85Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      <div id="${CONTENT_ID}" class="ai-toc-content"></div>
    `;

    document.body.appendChild(root);
    setupDragging(root);

    // 绑定折叠逻辑
    document.getElementById('ai-toc-toggle-btn').onclick = function(e) {
      e.stopPropagation();
      const isCollapsed = root.classList.toggle('collapsed');
      
      // 保存折叠状态
      let config = JSON.parse(localStorage.getItem('ai-toc-pos') || '{}');
      config.collapsed = isCollapsed;
      localStorage.setItem('ai-toc-pos', JSON.stringify(config));
    };

    // 绑定刷新逻辑
    document.getElementById('ai-toc-refresh-btn').onclick = function(e) {
      e.stopPropagation();
      this.style.transform = 'rotate(360deg)';
      setTimeout(() => { this.style.transform = 'rotate(0deg)'; }, 500);
      tocData = collectHeadings();
      renderTOC();
    };
  }

  function init() {
    mountUI();
    let timer;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const newData = collectHeadings();
        if (newData.length !== tocData.length) { tocData = newData; renderTOC(); }
      }, 1500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', () => {
      const root = document.getElementById(ROOT_ID);
      if (root) {
        const rect = root.getBoundingClientRect();
        if (rect.top > window.innerHeight - 100) root.style.top = (window.innerHeight - 100) + 'px';
      }
    });
    setTimeout(() => { tocData = collectHeadings(); renderTOC(); }, 2000);
  }

  if (document.body) init();
  else window.addEventListener('DOMContentLoaded', init);
})();