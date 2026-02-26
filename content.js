(function() {
  const ROOT_ID = 'ai-toc-root';
  const CONTENT_ID = 'ai-toc-content';
  let tocData = [];
  let activeId = null;
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  // --- 1. 提取标题逻辑 ---
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

  // --- 2. 渲染目录 ---
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

  // --- 3. 拖拽与吸附逻辑 ---
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

  // --- 4. 挂载 UI ---
  function mountUI() {
    if (document.getElementById(ROOT_ID)) return;
    const root = document.createElement('div');
    root.id = ROOT_ID;
    
    const savedConfig = JSON.parse(localStorage.getItem('ai-toc-pos') || '{}');
    if (savedConfig.top) root.style.top = savedConfig.top;
    if (savedConfig.side === 'left') { root.style.left = '20px'; root.style.right = 'auto'; }
    else { root.style.left = 'auto'; root.style.right = '20px'; }
    if (savedConfig.collapsed) root.classList.add('collapsed');

    // 注入包含新图标的 HTML
    root.innerHTML = `
      <div class="ai-toc-header">
        <button id="ai-toc-toggle-btn" title="折叠/展开">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4L7 10L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <div class="ai-toc-brand-icon">
          <svg width="18" height="18" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M113 18V101.5C113 110.61 105.61 118 96.5 118H37V18H113Z" fill="url(#ai-p0)"/>
            <foreignObject x="8.99805" y="79.15" width="92.6318" height="43.85">
              <div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(2.5px);clip-path:url(#ai-blur-clip);height:100%;width:100%"></div>
            </foreignObject>
            <g data-figma-bg-blur-radius="5">
              <path d="M96.63 118H30.75C10.64 118 14.25 93.38 14.25 84.15H80.13C80.13 93.38 76.51 118 96.63 118Z" fill="url(#ai-p1)" fill-opacity="0.8" style="mix-blend-mode:plus-darker"/>
            </g>
            <path d="M113 18V101.5C113 110.61 105.666 118 96.6258 118C76.6591 118 80.2516 93.38 80.2516 84.15H81.2439C81.2439 85.25 81.1943 86.53 81.1348 88C80.847 95.6 80.4103 107.09 86.1165 113.06C88.6074 115.68 92.1402 117 96.6258 117C105.111 117 112.008 110.05 112.008 101.5V18H113Z" fill="url(#ai-p2)" fill-opacity="0.6" style="mix-blend-mode:multiply"/>
            <path d="M85 51.9998C85 52.3856 84.8464 52.7555 84.5729 53.0283C84.2994 53.3011 83.9285 53.4543 83.5417 53.4543H67.5004C67.1136 53.4543 66.7427 53.3011 66.4692 53.0283C66.1957 52.7555 66.0421 52.3856 66.0421 51.9998C66.0421 51.6141 66.1957 51.2441 66.4692 50.9714C66.7427 50.6986 67.1136 50.5454 67.5004 50.5454H83.5417C83.9285 50.5454 84.2994 50.6986 84.5729 50.9714C84.8464 51.2441 85 51.6141 85 51.9998ZM67.5004 41.8186H83.5417C83.9285 41.8186 84.2994 41.6654 84.5729 41.3926C84.8464 41.1199 85 40.7499 85 40.3642C85 39.9784 84.8464 39.6085 84.5729 39.3357C84.2994 39.063 83.9285 38.9097 83.5417 38.9097H67.5004C67.1136 38.9097 66.7427 39.063 66.4692 39.3357C66.1957 39.6085 66.0421 39.9784 66.0421 40.3642C66.0421 40.7499 66.1957 41.1199 66.4692 41.3926C66.7427 41.6654 67.1136 41.8186 67.5004 41.8186ZM83.5417 62.181H67.5004C67.1136 62.181 66.7427 62.3343 66.4692 62.607C66.1957 62.8798 66.0421 63.2497 66.0421 63.6355C66.0421 64.0212 66.1957 64.3912 66.4692 64.6639C66.7427 64.9367 67.1136 65.0899 67.5004 65.0899H83.5417C83.9285 65.0899 84.2994 64.9367 84.5729 64.6639C84.8464 64.3912 85 64.0212 85 63.6355C85 63.2497 84.8464 62.8798 84.5729 62.607C84.2994 62.3343 83.9285 62.181 83.5417 62.181ZM59.1772 36.4262L54.3757 41.2169L52.4909 39.3352C52.2172 39.0622 51.8461 38.9089 51.4591 38.9089C51.0721 38.9089 50.701 39.0622 50.4274 39.3352C50.1537 39.6081 50 39.9782 50 40.3642C50 40.7501 50.1537 41.1203 50.4274 41.3932L53.344 44.3021C53.4794 44.4374 53.6402 44.5446 53.8173 44.6178C53.9943 44.691 54.1841 44.7287 54.3757 44.7287C54.5674 44.7287 54.7571 44.691 54.9342 44.6178C55.1112 44.5446 55.272 44.4374 55.4075 44.3021L61.2407 38.4843C61.5143 38.2114 61.668 37.8412 61.668 37.4553C61.668 37.0693 61.5143 36.6992 61.2407 36.4262C60.967 36.1533 60.5959 36 60.2089 36C59.8219 36 59.4508 36.1533 59.1772 36.4262ZM59.1772 48.0619L54.3757 52.8525L52.4909 50.9708C52.2172 50.6979 51.8461 50.5446 51.4591 50.5446C51.0721 50.5446 50.701 50.6979 50.4274 50.9708C50.1537 51.2437 50 51.6139 50 51.9998C50 52.1909 50.0377 52.3802 50.1111 52.5567C50.1844 52.7333 50.2919 52.8937 50.4274 53.0289L53.344 55.9378C53.4794 56.073 53.6402 56.1803 53.8173 56.2535C53.9943 56.3267 54.1841 56.3643 54.3757 56.3643C54.5674 56.3643 54.7571 56.3267 54.9342 56.2535C55.1112 56.1803 55.272 56.073 55.4075 55.9378L61.2407 50.1199C61.5143 49.847 61.668 49.4769 61.668 49.0909C61.668 48.705 61.5143 48.3348 61.2407 48.0619C60.967 47.789 60.5959 47.6357 60.2089 47.6357C59.8219 47.6357 59.4508 47.789 59.1772 48.0619ZM59.1772 59.6975L54.3757 64.4882L52.4909 62.6065C52.3554 62.4713 52.1945 62.3641 52.0175 62.291C51.8405 62.2179 51.6507 62.1802 51.4591 62.1802C51.2675 62.1802 51.0778 62.2179 50.9007 62.291C50.7237 62.3641 50.5629 62.4713 50.4274 62.6065C50.2919 62.7416 50.1844 62.902 50.1111 63.0786C50.0377 63.2551 50 63.4444 50 63.6355C50 63.8266 50.0377 64.0158 50.1111 64.1924C50.1844 64.369 50.2919 64.5294 50.4274 64.6645L53.344 67.5734C53.4794 67.7087 53.6402 67.8159 53.8173 67.8891C53.9943 67.9623 54.1841 68 54.3757 68C54.5674 68 54.7571 67.9623 54.9342 67.8891C55.1112 67.8159 55.272 67.7087 55.4075 67.5734L61.2407 61.7556C61.5143 61.4827 61.668 61.1125 61.668 60.7266C61.668 60.3406 61.5143 59.9705 61.2407 59.6975C60.967 59.4246 60.5959 59.2713 60.2089 59.2713C59.8219 59.2713 59.4508 59.4246 59.1772 59.6975Z" fill="white"/>
            <defs>
              <clipPath id="ai-blur-clip" transform="translate(-8.99805 -79.15)"><path d="M96.63 118H30.75C10.64 118 14.25 93.38 14.25 84.15H80.13C80.13 93.38 76.51 118 96.63 118Z"/></clipPath>
              <linearGradient id="ai-p0" x1="75" y1="18" x2="75" y2="118" gradientUnits="userSpaceOnUse"><stop stop-color="#BCDFFF"/><stop offset="0.621654" stop-color="#72BBFF"/><stop offset="0.884615" stop-color="#62B4FF"/><stop offset="1" stop-color="#268BE7"/></linearGradient>
              <linearGradient id="ai-p1" x1="55.314" y1="84.15" x2="55.314" y2="115" gradientUnits="userSpaceOnUse"><stop offset="0.321676" stop-color="#AED8FF"/><stop offset="0.730396" stop-color="#BBDFFF"/><stop offset="1" stop-color="#72BBFF"/></linearGradient>
              <linearGradient id="ai-p2" x1="82.9805" y1="83" x2="105.561" y2="120.348" gradientUnits="userSpaceOnUse"><stop stop-color="#58AFFF"/><stop offset="1" stop-color="#0064C0"/></linearGradient>
            </defs>
          </svg>
        </div>
        
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

    document.getElementById('ai-toc-toggle-btn').onclick = function(e) {
      e.stopPropagation();
      const isCollapsed = root.classList.toggle('collapsed');
      let config = JSON.parse(localStorage.getItem('ai-toc-pos') || '{}');
      config.collapsed = isCollapsed;
      localStorage.setItem('ai-toc-pos', JSON.stringify(config));
    };

    document.getElementById('ai-toc-refresh-btn').onclick = function(e) {
      e.stopPropagation();
      this.style.transform = 'rotate(360deg)';
      setTimeout(() => { this.style.transform = 'rotate(0deg)'; }, 500);
      tocData = collectHeadings();
      renderTOC();
    };
  }

  // --- 初始化逻辑 ---
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