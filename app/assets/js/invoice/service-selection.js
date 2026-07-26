// ---------- Service selection ----------
  function invRenderServiceCheckboxes(testsToDisplay){
    const container = document.getElementById('invServiceSelectorContainer');
    container.innerHTML = '';
    if (testsToDisplay.length === 0){
      container.innerHTML = '<p class="empty">No matching services found.</p>';
      return;
    }
    testsToDisplay.forEach(test => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'inv-service-item';
      const isChecked = invSelectedTests.some(t => t.id === test.id);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `inv-test-${test.id}`;
      checkbox.value = String(test.id);
      checkbox.checked = isChecked;
      checkbox.onchange = invHandleTestSelection;

      const label = document.createElement('label');
      label.htmlFor = `inv-test-${test.id}`;
      label.textContent = test.name;
      label.style.flexGrow = '1';
      label.style.marginBottom = '0';
      label.style.fontWeight = '400';
      label.style.cursor = 'pointer';

      const eyeSpan = document.createElement('span');
      const isVisible = test.visible_external !== false;
      eyeSpan.textContent = '👁';
      eyeSpan.title = isVisible ? 'Visible on linked website' : 'Hidden from linked website';
      eyeSpan.style.color = isVisible ? 'var(--moss)' : 'var(--red)';
      eyeSpan.style.textDecoration = isVisible ? 'none' : 'line-through';
      eyeSpan.style.fontSize = '13px';
      eyeSpan.style.marginRight = '8px';

      const priceSpan = document.createElement('span');
      priceSpan.className = 'inv-service-price';
      priceSpan.textContent = `₹${parseFloat(test.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(label);
      itemDiv.appendChild(eyeSpan);
      itemDiv.appendChild(priceSpan);
      container.appendChild(itemDiv);
    });
  }

  function invPopulateServiceSelector(){ invFilterServices(''); }

  function invFilterServices(searchTerm){
    const lower = searchTerm.toLowerCase().trim();
    if (invAllTests.length === 0){
      document.getElementById('invServiceSelectorContainer').innerHTML = '<p class="empty">No services/tests found.</p>';
      return;
    }
    if (lower === ''){ invRenderServiceCheckboxes(invAllTests); return; }
    invRenderServiceCheckboxes(invAllTests.filter(t => t.name.toLowerCase().includes(lower)));
  }

  function invHandleTestSelection(event){
    const testId = parseInt(event.target.value, 10);
    const test = invAllTests.find(t => t.id === testId);
    if (event.target.checked){
      if (test && !invSelectedTests.some(t => t.id === test.id)){
        test.price = parseFloat(test.price);
        invSelectedTests.push(test);
      }
    } else {
      invSelectedTests = invSelectedTests.filter(t => t.id !== testId);
    }
    invUpdateSelectionBadges();
    invUpdatePkgSuggestions();
    invCalculateTotal();
  }

  // Shows which packages the currently-selected individual tests overlap
  // with, and by how much — e.g. "5/10 matched" — sorted best-match first.
  function invUpdatePkgSuggestions(){
    const wrap = document.getElementById('invPkgSuggestWrap');
    const list = document.getElementById('invPkgSuggestList');
    if (!wrap || !list) return;

    if (!invSelectedTests.length || !invAllPackages || !invAllPackages.length){
      wrap.style.display = 'none';
      return;
    }

    const selectedIds = new Set(invSelectedTests.map(t => t.id));
    const matches = invAllPackages
      .map(pkg => {
        const testIds = pkg.test_ids || [];
        const matchedCount = testIds.filter(id => selectedIds.has(id)).length;
        return { pkg, matchedCount, total: testIds.length };
      })
      .filter(m => m.matchedCount > 0 && m.total > 0)
      .sort((a, b) => (b.matchedCount / b.total) - (a.matchedCount / a.total) || b.matchedCount - a.matchedCount);

    if (!matches.length){
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';
    list.innerHTML = matches.map(m => {
      const pct = Math.round((m.matchedCount / m.total) * 100);
      const full = m.matchedCount === m.total;
      return `
        <div class="inv-pkg-suggest-item${full ? ' full-match' : ''}">
          <div class="inv-pkg-suggest-row">
            <span class="inv-pkg-suggest-name">${escapeHtml(m.pkg.name)}</span>
            <span class="inv-pkg-suggest-count">${m.matchedCount}/${m.total} matched</span>
          </div>
          <div class="inv-pkg-suggest-bar"><div class="inv-pkg-suggest-bar-fill" style="width:${pct}%;"></div></div>
        </div>`;
    }).join('');
  }

  document.getElementById('invServiceSearch').addEventListener('input', (e) => invFilterServices(e.target.value));
