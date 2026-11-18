/**
 * NEBÂTAT - Botanik Atlası ve Toksisite Rehberi
 * İstemci Taraflı Uygulama Motoru
 * Hazırlayan: Sertan Çubukcu • ALEF Ekosistemi
 */

document.addEventListener('DOMContentLoaded', () => {
  initBotanicalCanvas();
  initFloraApp();
  initRegionalMap();
  initBotanicalQuiz();
  initPitrakAssistant();
});

/* ===================================================
   1. BOTANİK PARÇACIK (CANVAS) ANİMASYONU
   =================================================== */
function initBotanicalCanvas() {
  const canvas = document.getElementById('botanical-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 28;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.4 + 0.15,
      type: Math.random() > 0.4 ? 'spore' : 'leaf',
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 0.5
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotSpeed;

      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);

      if (p.type === 'spore') {
        // Glowing gold / amber spore
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
        ctx.fill();
      } else {
        // Floating emerald leaf fragment
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 2, p.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${p.opacity * 0.8})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
        ctx.fill();
      }

      ctx.restore();
    });

    requestAnimationFrame(render);
  }

  render();
}

/* ===================================================
   2. FLORA & MANTAR VERİ MOTORU VE FİLTRELEME
   =================================================== */
let allFlora = [];
let currentCategory = 'all';
let currentSubFilter = null; // 'cat_safe', 'dog_safe', 'child_safe', 'lethal'
let currentSearchQuery = '';

function initFloraApp() {
  // Load data from window.NEBATAT_DATA or fallback fetch
  if (window.NEBATAT_DATA && Array.isArray(window.NEBATAT_DATA)) {
    allFlora = window.NEBATAT_DATA;
    setupFloraUI();
  } else {
    fetch('data/flora.json')
      .then(res => res.json())
      .then(data => {
        allFlora = data;
        setupFloraUI();
      })
      .catch(err => {
        console.error('Flora verisi yüklenirken hata oluştu:', err);
      });
  }
}

function setupFloraUI() {
  updateCounts();
  renderFloraGrid();

  // Search input listeners
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      if (searchClearBtn) {
        searchClearBtn.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none';
      }
      renderFloraGrid();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      currentSearchQuery = '';
      searchClearBtn.style.display = 'none';
      renderFloraGrid();
    });
  }

  // Category Tab buttons
  const catButtons = document.querySelectorAll('.category-tab-btn');
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category') || 'all';
      renderFloraGrid();
    });
  });

  // Sub-filter Pills
  const subPills = document.querySelectorAll('.sub-filter-pill');
  subPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const filterType = pill.getAttribute('data-subfilter');
      if (currentSubFilter === filterType) {
        currentSubFilter = null;
        pill.classList.remove('active');
      } else {
        subPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentSubFilter = filterType;
      }
      renderFloraGrid();
    });
  });

  // Modal close trigger
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalOverlay = document.getElementById('flora-modal');
  if (modalCloseBtn && modalOverlay) {
    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // First aid button
  const firstAidBtn = document.getElementById('first-aid-trigger');
  if (firstAidBtn) {
    firstAidBtn.addEventListener('click', openFirstAidModal);
  }
}

function updateCounts() {
  const counts = {
    all: allFlora.length,
    ev_bitkisi: allFlora.filter(f => f.category === 'ev_bitkisi').length,
    sifali: allFlora.filter(f => f.category === 'sifali').length,
    zehirli: allFlora.filter(f => f.category === 'zehirli').length,
    mantar: allFlora.filter(f => f.category === 'mantar').length,
    endemik: allFlora.filter(f => f.category === 'endemik').length
  };

  for (const [cat, count] of Object.entries(counts)) {
    const badge = document.querySelector(`.tab-count[data-count-for="${cat}"]`);
    if (badge) badge.textContent = count;
  }
}

function renderFloraGrid() {
  const grid = document.getElementById('flora-grid');
  const resultCounter = document.getElementById('results-count');
  if (!grid) return;

  const filtered = allFlora.filter(item => {
    // 1. Category check
    if (currentCategory !== 'all' && item.category !== currentCategory) {
      return false;
    }

    // 2. Sub-filter check
    if (currentSubFilter === 'cat_safe') {
      const catText = (item.toxicity.pets_cat || '').toLowerCase();
      if (!catText.includes('güvenli') && !catText.includes('dostu') && !catText.includes('zararsız')) {
        return false;
      }
    } else if (currentSubFilter === 'dog_safe') {
      const dogText = (item.toxicity.pets_dog || '').toLowerCase();
      if (!dogText.includes('güvenli') && !dogText.includes('dostu') && !dogText.includes('zararsız')) {
        return false;
      }
    } else if (currentSubFilter === 'child_safe') {
      const childText = (item.toxicity.children || '').toLowerCase();
      if (!childText.includes('güvenli') && !childText.includes('zararsız')) {
        return false;
      }
    } else if (currentSubFilter === 'lethal') {
      const toxLevel = (item.toxicity.level || '').toLowerCase();
      if (!toxLevel.includes('ölümcül') && !toxLevel.includes('yüksek') && !toxLevel.includes('şiddetli')) {
        return false;
      }
    }

    // 3. Search query check
    if (currentSearchQuery) {
      const hay = [
        item.name,
        item.scientific_name,
        item.family,
        item.sub_category,
        item.turkey_distribution,
        item.description,
        ...(item.tags || [])
      ].join(' ').toLowerCase();

      if (!hay.includes(currentSearchQuery)) {
        return false;
      }
    }

    return true;
  });

  if (resultCounter) {
    resultCounter.textContent = filtered.length;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results-box">
        <span class="no-results-icon">🍂</span>
        <h3>Eşleşen Tür Bulunamadı</h3>
        <p>Arama teriminizi değiştirebilir veya filtreleri sıfırlayabilirsiniz.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => createCardHTML(item)).join('');

  // Attach card click handlers
  const detailButtons = grid.querySelectorAll('.card-detail-btn');
  detailButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openModal(id);
    });
  });
}

function createCardHTML(item) {
  const badgeClass = `badge-${item.toxicity.badge || 'safe'}`;
  const badgeText = item.toxicity.level || 'Zehirsiz';

  const catSafe = (item.toxicity.pets_cat || '').toLowerCase().includes('güvenli') || (item.toxicity.pets_cat || '').toLowerCase().includes('dostu');
  const catIcon = catSafe ? '🐱 <span style="color:#6ee7b7">Dostu</span>' : '🐱 <span style="color:#f87171">Toksik</span>';

  return `
    <article class="flora-card" data-id="${item.id}">
      <div class="card-media-wrapper">
        <img class="card-img" src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80'">
        <span class="card-floating-badge ${badgeClass}">${badgeText}</span>
        <span class="card-category-tag">${item.category_title || 'Botanik'}</span>
      </div>

      <div class="card-body">
        <div class="card-title-group">
          <h3 class="card-common-name">
            <span>${item.name}</span>
            <span class="plant-icon">${item.icon || '🌿'}</span>
          </h3>
          <span class="card-scientific-name">${item.scientific_name}</span>
          <span class="card-family-name">${item.family}</span>
        </div>

        <div class="card-quick-metrics">
          <div class="metric-item">
            ${catIcon}
          </div>
          <div class="metric-item">
            💧 <strong>${(item.care.water || 'Orta').split(' ')[0]}</strong>
          </div>
          <div class="metric-item">
            ☀️ <strong>${(item.care.light || 'Aydınlık').split(',')[0]}</strong>
          </div>
          <div class="metric-item">
            ⚡ <strong>${item.care.difficulty || 'Kolay'}</strong>
          </div>
        </div>

        <p class="card-description-preview">${item.description}</p>

        <button class="card-detail-btn" data-id="${item.id}">
          <span>🌿 Dosyayı İncele</span>
        </button>
      </div>
    </article>
  `;
}

/* ===================================================
   3. BOTANİK TÜR DOSYASI MODAL
   =================================================== */
function openModal(id) {
  const item = allFlora.find(f => f.id === id);
  if (!item) return;

  const modal = document.getElementById('flora-modal');
  const modalBody = document.getElementById('modal-dynamic-content');
  if (!modal || !modalBody) return;

  const isSafe = item.toxicity.badge === 'safe';
  const toxBoxClass = isSafe ? 'modal-toxicity-box is-safe' : 'modal-toxicity-box';

  modalBody.innerHTML = `
    <div class="modal-hero-cover">
      <img class="modal-hero-img" src="${item.image}" alt="${item.name}">
      <div class="modal-cover-gradient"></div>
      <div class="modal-hero-badges">
        <span class="card-floating-badge badge-${item.toxicity.badge}">${item.toxicity.level}</span>
        <span class="card-category-tag">${item.sub_category || item.category_title}</span>
      </div>
    </div>

    <div class="modal-content-body">
      <div class="modal-header-titles">
        <h2 class="modal-common-name">${item.name} ${item.icon || ''}</h2>
        <div class="modal-scientific-name">${item.scientific_name}</div>
        <div class="modal-family-tag">${item.family}</div>
      </div>

      <!-- Toksisite & Güvenlik Raporu -->
      <div class="${toxBoxClass}">
        <h4 style="display:flex; align-items:center; gap:8px; font-size:1.15rem; color:${isSafe ? '#6ee7b7' : '#fca5a5'};">
          <span>${isSafe ? '🛡️ Güvenlik & Toksisite Analizi' : '☠️ Toksisite & Acil Durum Uyarısı'}</span>
        </h4>
        
        <div class="tox-grid">
          <div class="tox-item">
            <strong>🐱 Kedi Güvenliği</strong>
            <span>${item.toxicity.pets_cat || 'Belirtilmedi'}</span>
          </div>
          <div class="tox-item">
            <strong>🐶 Köpek Güvenliği</strong>
            <span>${item.toxicity.pets_dog || 'Belirtilmedi'}</span>
          </div>
          <div class="tox-item">
            <strong>👶 Çocuk Güvenliği</strong>
            <span>${item.toxicity.children || 'Belirtilmedi'}</span>
          </div>
          <div class="tox-item">
            <strong>✋ Cilt & Temas</strong>
            <span>${item.toxicity.contact || 'Zararsız'}</span>
          </div>
        </div>

        <div style="margin-top:14px; font-size:0.9rem; line-height:1.6; color:#f1f5f9;">
          <strong>Belirtiler:</strong> ${item.toxicity.symptoms || 'Özel bir toksik etki beklenmez.'}
        </div>

        <div style="margin-top:8px; font-size:0.9rem; line-height:1.6; color:#fbbf24;">
          <strong>Acil Müdahale Adımı:</strong> ${item.toxicity.emergency_action || 'Acil tıbbi müdahale gerektirmez.'}
        </div>
      </div>

      <!-- Botanik Notu -->
      <div class="modal-description-full">
        ${item.description}
      </div>

      <!-- Bakım & Tıbbi Kullanım Tablosu -->
      <div class="modal-dossier-grid">
        <div class="dossier-card">
          <h5>🌱 Yetişme & Bakım Koşulları</h5>
          <ul class="dossier-list">
            <li><strong>☀️ Işık İsteği:</strong> ${item.care.light}</li>
            <li><strong>💧 Sulama Düzeni:</strong> ${item.care.water}</li>
            <li><strong>💨 Ortam Nemi:</strong> ${item.care.humidity}</li>
            <li><strong>🪴 Toprak Türü:</strong> ${item.care.soil}</li>
            <li><strong>⚡ Bakım Zorluğu:</strong> ${item.care.difficulty}</li>
          </ul>
        </div>

        <div class="dossier-card">
          <h5>🍵 Şifa, Mutfak & Dağılım</h5>
          <ul class="dossier-list">
            <li><strong>Şifalı mı?</strong> ${item.culinary_medicinal.is_medicinal ? 'Evet (Tıbbi Tür)' : 'Hayır'}</li>
            <li><strong>Yenilebilir mi?</strong> ${item.culinary_medicinal.is_edible ? 'Evet (Yenilebilir)' : 'Kesinlikle Yenmez!'}</li>
            <li><strong>Kullanım Alanı:</strong> ${item.culinary_medicinal.uses}</li>
            <li><strong>🇹🇷 Türkiye Dağılımı:</strong> ${item.turkey_distribution}</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('flora-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function openFirstAidModal() {
  const modal = document.getElementById('flora-modal');
  const modalBody = document.getElementById('modal-dynamic-content');
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <div class="modal-content-body" style="padding-top:40px;">
      <h2 style="font-family:var(--font-serif); color:#fca5a5; font-size:2rem; margin-bottom:12px;">
        🚨 Bitki & Mantar Zehirlenmelerinde İlk Yardım
      </h2>
      <p style="color:var(--text-muted); margin-bottom:24px; font-size:1.05rem;">
        Ulusal Zehir Danışma Merkezi (UZEM) ve Acil Tıp Protokolleri
      </p>

      <div class="modal-toxicity-box" style="background:rgba(69, 10, 10, 0.6); border-color:#ef4444;">
        <h4 style="color:#ffffff; font-size:1.2rem; margin-bottom:12px;">
          📞 Acil Telefon Numaraları (7/24 Ücretsiz)
        </h4>
        <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px;">
          <a href="tel:114" class="uzem-call-btn" style="font-size:1.1rem;">
            📞 114 UZEM (Ulusal Zehir Danışma Merkezi)
          </a>
          <a href="tel:112" class="uzem-call-btn" style="background:#b91c1c; font-size:1.1rem;">
            🚑 112 Acil Ambulans
          </a>
        </div>
        <p style="font-size:0.9rem; color:#fee2e2;">
          Hekim ve eczacılardan oluşan uzman kadro, zehirli bitki veya mantarın belirtilerine göre yapılacak en doğru hamleyi saniyeler içinde bildirir.
        </p>
      </div>

      <div class="dossier-card" style="margin-top:20px;">
        <h5 style="color:#fbbf24; font-size:1.15rem; margin-bottom:12px;">⚠️ YAPILMASI GEREKENLER</h5>
        <ul class="dossier-list" style="gap:12px; font-size:0.95rem;">
          <li>✅ <strong>Numuneyi Saklayın:</strong> Tüketilen mantar veya bitkinin kalan parçasını veya fotoğrafını mutlaka yanınıza alın. Hastanede doğru antidotun seçilmesi için türün teşhisi hayati önemdedir.</li>
          <li>✅ <strong>Ağzı Çalkalayın:</strong> Kalsiyum oksalat içeren ev bitkilerinde (Difenbahya vb.) ağız bol ılık su veya sütle durulanmalıdır.</li>
          <li>✅ <strong>Evcil Hayvan Zehirlenmesi:</strong> Kedi veya köpeğiniz zehirli bir yaprak yutmuşsa zaman kaybetmeden en yakın nöbetçi veterinere ulaştırın.</li>
        </ul>
      </div>

      <div class="dossier-card" style="margin-top:20px; border-color:rgba(239, 68, 68, 0.4);">
        <h5 style="color:#f87171; font-size:1.15rem; margin-bottom:12px;">⛔ KESİNLİKLE YAPILMAMASI GEREKENLER (HAYATİ!)</h5>
        <ul class="dossier-list" style="gap:12px; font-size:0.95rem;">
          <li>❌ <strong>Kusturmaya Çalışmayın:</strong> Özellikle yakıcı özsuyu veya bilinmeyen mantar yutan kişileri kusturmak yemek borusunu parçalayabilir ve akciğer aspirasyonuna (boğulmaya) neden olabilir.</li>
          <li>❌ <strong>Yoğurt Yedirmeyin:</strong> Halk arasında "yoğurt zehri alır" inanışı bilimsel olarak tamamen YANLIŞTIR. Amatoksin gibi hücresel zehirlerde yoğurdun hiçbir etkisi yoktur ve zaman kaybına sebep olur.</li>
          <li>❌ <strong>Sirkeli Su İçirmeyin:</strong> Asit dengesini bozarak midedeki emilimi artırabilir.</li>
        </ul>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* ===================================================
   4. İNTERAKTİF TÜRKİYE FLORA & MANTAR BÖLGELERİ
   =================================================== */
const regionalData = {
  karadeniz: {
    name: 'Karadeniz Bölgesi',
    icon: '🌲',
    climate: 'Nemli, Yağışlı, Bol Oksijenli Ormanlar',
    description: 'Türkiye’nin en zengin mantar ve ılıman yağmur ormanları florasına sahiptir. Fındıklıklar ve kayın ormanları sonbaharda mantar cennetine dönüşür.',
    species: [
      { name: 'Kanlıca Mantarı', latin: 'Lactarius deliciosus', role: 'Yenilebilir Mantar', badge: '#10b981' },
      { name: 'Ormangülü (Deli Bal)', latin: 'Rhododendron ponticum', role: 'Toksik Çiçek', badge: '#ef4444' },
      { name: 'Köygöçüren Mantarı', latin: 'Amanita phalloides', role: 'Ölümcül Mantar', badge: '#000000' },
      { name: 'Yüksükotu', latin: 'Digitalis purpurea', role: 'Zehirli / İlaç', badge: '#f59e0b' }
    ]
  },
  ege: {
    name: 'Ege Bölgesi',
    icon: '🫒',
    climate: 'Akdeniz İklimi, Maki, Zengin Aromatik Dağlar',
    description: 'Dünyanın en kaliteli tıbbi ve aromatik kekik ve adaçayı tarlaları Ege dağlarında uzanır. Zeytinlik kütüklerinde biyolüminesans ağulu mantarlar yetişir.',
    species: [
      { name: 'İzmir Kekiği', latin: 'Origanum onites', role: 'Şifalı Baharat', badge: '#10b981' },
      { name: 'Aydın Tüllüşahı', latin: 'Rhaponticoides mykalea', role: 'Dünya Endemiği', badge: '#f59e0b' },
      { name: 'Sarı Kantaron', latin: 'Hypericum perforatum', role: 'Doku Yenileyici', badge: '#10b981' },
      { name: 'Ağulu Mantar', latin: 'Omphalotus olearius', role: 'Zehirli Parlayan', badge: '#ef4444' }
    ]
  },
  akdeniz: {
    name: 'Akdeniz Bölgesi',
    icon: '☀️',
    climate: 'Sıcak, Kireçli Zemin, Toroslar Yayla Florası',
    description: 'Toros Dağları endemizm oranıyla Avrupa’nın en zengin biyolojik sıcak noktalarındandır. Baharda kuzugöbeği mantarları sedir altlarında fışkırır.',
    species: [
      { name: 'Kuzugöbeği Mantarı', latin: 'Morchella esculenta', role: 'Değerli Gurme', badge: '#10b981' },
      { name: 'Zakkum (Ağı Ağacı)', latin: 'Nerium oleander', role: 'Ölümcül Kardiyak', badge: '#ef4444' },
      { name: 'Likya Orkidesi', latin: 'Ophrys lycia', role: 'Kritik Endemik', badge: '#f59e0b' },
      { name: 'Antalya Çiğdemi', latin: 'Crocus antalyensis', role: 'Toros Endemiği', badge: '#10b981' }
    ]
  },
  icanadolu: {
    name: 'İç Anadolu Bölgesi',
    icon: '🌾',
    climate: 'Karasal İklim, Step, Tuzlu ve Kireçli Ovalar',
    description: 'Görünüşte çorak gibi duran bozkırlar, yeryüzünde sadece bu topraklarda yaşayan eşsiz sevgi çiçeklerine ve göl kıyısı genetik harikalarına ev sahipliği yapar.',
    species: [
      { name: 'Sevgi Çiçeği (Yanardöner)', latin: 'Centaurea tchihatcheffii', role: 'Dünyada Sadece Ankara', badge: '#ec4899' },
      { name: 'Eber Sarısı', latin: 'Thermopsis turcica', role: '1 Çiçekten 3 Meyve', badge: '#f59e0b' },
      { name: 'Tıbbi Papatya', latin: 'Matricaria chamomilla', role: 'Sakinleştirici Çay', badge: '#10b981' },
      { name: 'Karahindiba', latin: 'Taraxacum officinale', role: 'Karaciğer Dostu', badge: '#10b981' }
    ]
  },
  doguanadolu: {
    name: 'Doğu Anadolu Bölgesi',
    icon: '🏔️',
    climate: 'Sert Karasal, Yüksek Rakım, Alpin Çayırlar',
    description: '2000-3000 metre rakımlı dağ yamaçları, karların erimesiyle efsanelere konu olmuş Ters Laleler ve şifalı dağ bitkileriyle bezenir.',
    species: [
      { name: 'Ters Lale (Ağlayan Gelin)', latin: 'Fritillaria imperialis', role: 'Asil Endemik', badge: '#f59e0b' },
      { name: 'Kurtboğan (Akonit)', latin: 'Aconitum napellus', role: 'Zehirler Kraliçesi', badge: '#ef4444' },
      { name: 'Civanperçemi', latin: 'Achillea millefolium', role: 'Kadın Otu', badge: '#10b981' },
      { name: 'Kuşburnu', latin: 'Rosa canina', role: 'C Vitamini Deposu', badge: '#10b981' }
    ]
  },
  marmara: {
    name: 'Marmara Bölgesi',
    icon: '🌊',
    climate: 'Geçiş İklimi, Kazdağları ve Belgrad Ormanları',
    description: 'Balkan ve Akdeniz florasının buluşma noktasıdır. Kazdağları dünyanın en zengin oksijenine, Belgrad Ormanları ise sonbaharda yoğun mantar çeşitliliğine sahiptir.',
    species: [
      { name: 'Kazdağı Göknarı', latin: 'Abies equi-trojani', role: 'Mitolojik Endemik', badge: '#10b981' },
      { name: 'Köygöçüren Mantarı', latin: 'Amanita phalloides', role: 'Belgrad Ormanı Zehri', badge: '#000000' },
      { name: 'Çörek Mantarı (Porçini)', latin: 'Boletus edulis', role: 'Kral Gurme', badge: '#10b981' },
      { name: 'Güzelavrat Otu', latin: 'Atropa belladonna', role: 'Nörotoksik Tehlike', badge: '#ef4444' }
    ]
  }
};

function initRegionalMap() {
  const regionButtons = document.querySelectorAll('.region-btn');
  regionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      regionButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.getAttribute('data-region');
      renderRegionDetails(key);
    });
  });

  renderRegionDetails('karadeniz');
}

function renderRegionDetails(key) {
  const data = regionalData[key];
  const container = document.getElementById('region-details-container');
  if (!data || !container) return;

  container.innerHTML = `
    <div class="region-badge-box">
      <span class="region-icon-large">${data.icon}</span>
      <h3 class="region-name-display">${data.name}</h3>
      <div class="region-climate-info">${data.climate}</div>
      <p style="font-size:0.88rem; color:var(--text-muted); margin-top:14px; line-height:1.6;">
        ${data.description}
      </p>
    </div>

    <div class="region-species-list">
      <h4 style="font-family:var(--font-serif); font-size:1.15rem; color:#ffffff; margin-bottom:4px;">
        📍 Bölgenin Öne Çıkan Botanik Türleri:
      </h4>
      ${data.species.map(s => `
        <div class="region-species-item">
          <div>
            <div class="spec-name">${s.name}</div>
            <div class="spec-latin">${s.latin}</div>
          </div>
          <span class="spec-role" style="background:${s.badge}; color:#ffffff;">${s.role}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* ===================================================
   5. EĞİTİCİ MİNİ OYUN (BOTANICAL QUIZ)
   =================================================== */
const quizQuestions = [
  {
    title: 'Köygöçüren Mantarı',
    latin: 'Amanita phalloides',
    image: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800&auto=format&fit=crop&q=80',
    hint: 'Zeytuni şapkası ve eteği olan bu mantar ormanda iştah açıcı görünse de sence güvenli midir?',
    isSafe: false,
    explanation: 'DOĞRU! Köygöçüren Türkiye’deki mantar ölümlerinin %95’inden sorumludur. Bir tanesi bile karaciğeri tamamen iflas ettirir.'
  },
  {
    title: 'Kanlıca Mantarı',
    latin: 'Lactarius deliciosus',
    image: 'https://images.unsplash.com/photo-1546768292-fb12f6c92568?w=800&auto=format&fit=crop&q=80',
    hint: 'Kesildiğinde havuç rengi turuncu süt salgılayan Kastamonu ormanlarının meşhur mantarı yenir mi?',
    isSafe: true,
    explanation: 'TEBRİKLER! Kanlıca mantarı Anadolu’nun en lezzetli, en güvenilir yenen yaban mantarlarından biridir.'
  },
  {
    title: 'Zakkum Çiçeği',
    latin: 'Nerium oleander',
    image: 'https://images.unsplash.com/photo-1598880940371-c756e015fea1?w=800&auto=format&fit=crop&q=80',
    hint: 'Yol refüjlerinde pembe açan zakkumun yapraklarından şifalı çay demlenebilir mi?',
    isSafe: false,
    explanation: 'KESİNLİKLE HAYIR! Zakkum içerdiği oleandrin ile doğrudan kalbi durduran ölümcül bir kardiyotoksindir. Tek bir yaprağı bile öldürebilir.'
  },
  {
    title: 'Kuzugöbeği Mantarı',
    latin: 'Morchella esculenta',
    image: 'https://images.unsplash.com/photo-1546768292-fb12f6c92568?w=800&auto=format&fit=crop&q=80',
    hint: 'Bal peteği şeklinde odacıklı şapkası olan bahar aylarının bu kıymetli mantarı güvenli midir?',
    isSafe: true,
    explanation: 'HARİKA! Pişirildiğinde dünyanın en değerli ve lezzetli gurme mantarlarındandır.'
  },
  {
    title: 'Difenbahya (Ağlayan Çiçek)',
    latin: 'Dieffenbachia seguine',
    image: 'https://images.unsplash.com/photo-1600411833196-7c1f6b1a8b90?w=800&auto=format&fit=crop&q=80',
    hint: 'Salonlarda çok sevilen bu bitkiyi kediniz veya köpeğiniz çiğnerse ne olur?',
    isSafe: false,
    explanation: 'ÇOK DİKKAT! Özsuyundaki iğnemsi kristaller ses tellerinde felç ve soluk borusunda boğulmaya varan şişme yapar. Çocuk ve evcil hayvandan kesinlikle uzak tutulmalıdır.'
  },
  {
    title: 'Kurdele Çiçeği',
    latin: 'Chlorophytum comosum',
    image: 'https://images.unsplash.com/photo-1572688484437-c16583bc30b4?w=800&auto=format&fit=crop&q=80',
    hint: 'Askılı saksılardan sarkan bu popüler ev bitkisi evcil hayvanlar için zehirli midir?',
    isSafe: true,
    explanation: 'DOĞRU! Kurdele çiçeği %100 evcil hayvan dostudur. Zehirsizdir ve havadaki toksinleri temizler.'
  }
];

let quizCurrentIndex = 0;
let quizScore = 0;

function initBotanicalQuiz() {
  loadQuizQuestion();

  const optSafeBtn = document.getElementById('quiz-btn-safe');
  const optDangerBtn = document.getElementById('quiz-btn-danger');
  const nextBtn = document.getElementById('quiz-next-btn');

  if (optSafeBtn) {
    optSafeBtn.addEventListener('click', () => handleQuizAnswer(true));
  }
  if (optDangerBtn) {
    optDangerBtn.addEventListener('click', () => handleQuizAnswer(false));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      quizCurrentIndex = (quizCurrentIndex + 1) % quizQuestions.length;
      loadQuizQuestion();
    });
  }
}

function loadQuizQuestion() {
  const q = quizQuestions[quizCurrentIndex];
  if (!q) return;

  const titleEl = document.getElementById('quiz-q-title');
  const latinEl = document.getElementById('quiz-q-latin');
  const hintEl = document.getElementById('quiz-q-hint');
  const imgEl = document.getElementById('quiz-q-img');
  const feedbackEl = document.getElementById('quiz-feedback');
  const nextBtn = document.getElementById('quiz-next-btn');
  const qNumEl = document.getElementById('quiz-q-number');
  const scoreEl = document.getElementById('quiz-score-val');

  if (titleEl) titleEl.textContent = q.title;
  if (latinEl) latinEl.textContent = q.latin;
  if (hintEl) hintEl.textContent = q.hint;
  if (imgEl) imgEl.src = q.image;
  if (qNumEl) qNumEl.textContent = `${quizCurrentIndex + 1} / ${quizQuestions.length}`;
  if (scoreEl) scoreEl.textContent = quizScore;

  if (feedbackEl) feedbackEl.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';

  // Re-enable options
  const optSafeBtn = document.getElementById('quiz-btn-safe');
  const optDangerBtn = document.getElementById('quiz-btn-danger');
  if (optSafeBtn) optSafeBtn.disabled = false;
  if (optDangerBtn) optDangerBtn.disabled = false;
}

function handleQuizAnswer(selectedSafe) {
  const q = quizQuestions[quizCurrentIndex];
  const feedbackEl = document.getElementById('quiz-feedback');
  const nextBtn = document.getElementById('quiz-next-btn');
  const scoreEl = document.getElementById('quiz-score-val');

  const optSafeBtn = document.getElementById('quiz-btn-safe');
  const optDangerBtn = document.getElementById('quiz-btn-danger');
  if (optSafeBtn) optSafeBtn.disabled = true;
  if (optDangerBtn) optDangerBtn.disabled = true;

  const isCorrect = (selectedSafe === q.isSafe);
  if (isCorrect) {
    quizScore += 10;
  }
  if (scoreEl) scoreEl.textContent = quizScore;

  if (feedbackEl) {
    feedbackEl.style.display = 'block';
    feedbackEl.className = isCorrect ? 'quiz-feedback-box correct' : 'quiz-feedback-box wrong';
    feedbackEl.innerHTML = `
      <strong>${isCorrect ? '🌟 Tebrikler, Doğru Bildin!' : '⚠️ Dikkat! Yanlış Tahmin.'}</strong><br>
      ${q.explanation}
    `;
  }

  if (nextBtn) {
    nextBtn.style.display = 'inline-flex';
  }
}

/* ===================================================
   6. SEVİMLİ REHBER PITRAK (BOTANİK ASİSTANI)
   =================================================== */
const pitrakKnowledge = [
  {
    triggers: ['kedi', 'kedim', 'evcil hayvan', 'köpek', 'zararsız', 'evcil'],
    response: '🐾 Kediler ve köpekler için %100 güvenli şahane ev bitkileri şunlardır: **Kurdele Çiçeği**, **Dua Çiçeği (Calathea)** ve **Aşk Merdiveni**! Barış Çiçeği, Monstera ve Paşa Kılıcı ise kalsiyum oksalat/saponin içerdiği için hayvanların çiğnememesi gerekir.'
  },
  {
    triggers: ['mantar', 'köygöçüren', 'zehirli mantar', 'yenen mantar', 'orman'],
    response: '🍄 Ormanda mantar toplarken kural şudur: **%100 emin olmadığın hiçbir mantarı asla yeme!** Türkiye’de en çok ölüme yol açan mantar **Köygöçüren (Amanita phalloides)** mantarıdır. Lezzetli ve güvenli olanlar ise turuncu sütlü **Kanlıca** ve petek şapkalı **Kuzugöbeği**dir.'
  },
  {
    triggers: ['zakkum', 'ölümcül', 'oleandrin', 'ağı'],
    response: '☠️ Zakkum, bitkiler dünyasının en ölümcül kardiyotoksinlerinden biridir. İçindeki "Oleandrin" kalbin ritmini bozar ve durdurabilir. Çiçeği, dalı hatta ateşe atıldığında çıkan dumanı bile zehirlidir.'
  },
  {
    triggers: ['uyku', 'stres', 'sakinleş', 'kaygı', 'çay'],
    response: '🍵 Huzurlu ve derin bir uyku için doğanın üç kadim şifacısı vardır: **Tıbbi Papatya**, **Limon Melisa (Oğul Otu)** ve yastık altına konulacak **Tıbbi Lavanta**! Akşamları demlenen bir fincan papatya-melisa çayı kasları gevşetir.'
  },
  {
    triggers: ['kantaron', 'yara', 'yanık', 'güneş', 'leke'],
    response: '🌼 Sarı Kantaron zeytinyağında bekletilerek yapılan kırmızı kantaron yağı yara ve yanık tedavisinde bir mucizedir! Ancak çok önemli bir kural: **Kantaron yağı sürdükten sonra en az 4 saat güneşe çıkılmamalıdır**, aksi takdirde ciltte kalıcı güneş lekeleri yapabilir.'
  },
  {
    triggers: ['endemik', 'türkiye', 'ankara', 'afyon', 'hakkari', 'ters lale'],
    response: '🇹🇷 Türkiye, 3000’den fazla endemik bitkisiyle bir doğa kalesidir! Örneğin **Sevgi Çiçeği** dünyada yalnızca Ankara Gölbaşı’nda, **Eber Sarısı** (tek çiçekten 3 meyve veren) yalnızca Afyon’da, **Ters Lale** ise Hakkari ve Van yaylalarında yaşar.'
  }
];

function initPitrakAssistant() {
  const trigger = document.getElementById('pitrak-trigger');
  const windowEl = document.getElementById('pitrak-window');
  const closeBtn = document.getElementById('pitrak-close-btn');
  const sendBtn = document.getElementById('pitrak-send-btn');
  const inputEl = document.getElementById('pitrak-input');
  const presetChips = document.querySelectorAll('.preset-chip-btn');

  if (trigger && windowEl) {
    trigger.addEventListener('click', () => {
      windowEl.classList.toggle('open');
      if (windowEl.classList.contains('open') && inputEl) {
        inputEl.focus();
      }
    });
  }

  if (closeBtn && windowEl) {
    closeBtn.addEventListener('click', () => {
      windowEl.classList.remove('open');
    });
  }

  if (sendBtn && inputEl) {
    sendBtn.addEventListener('click', () => handlePitrakSend());
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handlePitrakSend();
    });
  }

  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (inputEl) inputEl.value = q;
      handlePitrakSend();
    });
  });
}

function handlePitrakSend() {
  const inputEl = document.getElementById('pitrak-input');
  const messagesArea = document.getElementById('pitrak-messages');
  if (!inputEl || !messagesArea) return;

  const query = inputEl.value.trim();
  if (!query) return;

  // Add User Message
  const userMsg = document.createElement('div');
  userMsg.className = 'pitrak-msg user';
  userMsg.textContent = query;
  messagesArea.appendChild(userMsg);

  inputEl.value = '';
  messagesArea.scrollTop = messagesArea.scrollHeight;

  // Generate Response
  setTimeout(() => {
    const qLower = query.toLowerCase();
    let reply = null;

    // Check pre-loaded knowledge
    for (const item of pitrakKnowledge) {
      if (item.triggers.some(t => qLower.includes(t))) {
        reply = item.response;
        break;
      }
    }

    // Check specific plant names in flora dataset
    if (!reply && allFlora.length > 0) {
      const matched = allFlora.find(f => qLower.includes(f.name.toLowerCase()) || qLower.includes(f.scientific_name.toLowerCase()));
      if (matched) {
        reply = `🌿 **${matched.name}** (${matched.scientific_name}): ${matched.toxicity.level}. Kediler için: ${matched.toxicity.pets_cat}. Bakım: ${matched.care.light}, ${matched.care.water}.`;
      }
    }

    if (!reply) {
      reply = `🌿 Sevgili bitkisever dostum! Bu tür hakkında daha fazla detay öğrenmek için yukarıdaki arama çubuğuna bitkinin adını yazabilir veya Kedi/Köpek Güvenliği filtrelerini kullanabilirsin. Başka bir bitki veya mantar sormak ister misin?`;
    }

    const botMsg = document.createElement('div');
    botMsg.className = 'pitrak-msg bot';
    botMsg.innerHTML = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    messagesArea.appendChild(botMsg);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }, 400);
}
