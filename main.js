// Main functionality for the OSINT Toolkit
// GitHub Pages version: dashboard reads ONLY local cached JSON from data/live-feeds.json
// No direct browser fetch to FOFA, URLHaus, Google Trends, Reddit, or Trends24.

// ------------------------------
// Navigation
// ------------------------------
function handleNavigation(targetId, clickedElement) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove(
            'bg-primary-50',
            'text-primary-700',
            'border',
            'border-primary-100',
            'shadow-sm'
        );
        link.classList.add('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
    });

    document.querySelectorAll('.tool-section').forEach(section => {
        section.classList.remove('block', 'animate-fade-in');
        section.classList.add('hidden');
    });

    if (clickedElement && clickedElement.classList.contains('nav-link')) {
        clickedElement.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
        clickedElement.classList.add(
            'bg-primary-50',
            'text-primary-700',
            'border',
            'border-primary-100',
            'shadow-sm'
        );
    } else if (targetId === 'home-section') {
        const homeLink = document.getElementById('home-link');
        if (homeLink) {
            homeLink.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
            homeLink.classList.add(
                'bg-primary-50',
                'text-primary-700',
                'border',
                'border-primary-100',
                'shadow-sm'
            );
        }
    }

    const section = document.getElementById(targetId);
    if (section) {
        section.classList.remove('hidden');
        section.classList.add('block', 'animate-fade-in');
    }
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (event) {
        event.preventDefault();
        const targetId = this.id.replace('-link', '-section');
        handleNavigation(targetId, this);
    });
});

const homeLogo = document.getElementById('home-logo');
if (homeLogo) {
    homeLogo.addEventListener('click', function (event) {
        event.preventDefault();
        handleNavigation('home-section', null);
    });
}

// ------------------------------
// Safe Helpers
// ------------------------------
function escapeHTML(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[char]));
}

function generateSparkline(dataStr) {
    const pts = dataStr.split(',').map(Number);
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const range = max - min || 1;

    let points = '';
    pts.forEach((p, i) => {
        const x = (i / (pts.length - 1)) * 40;
        const y = 15 - ((p - min) / range) * 15;
        points += `${x},${y} `;
    });

    return `
        <svg width="40" height="15" viewBox="0 -2 40 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="${points.trim()}" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}

function setDashboardStatus(statusElement, type, label) {
    if (!statusElement) return;

    const textClasses = {
        live: 'text-green-400',
        partial: 'text-yellow-400',
        error: 'text-red-400',
        loading: 'text-blue-400'
    };

    const dotClasses = {
        live: 'bg-green-400 animate-pulse',
        partial: 'bg-yellow-400 animate-pulse',
        error: 'bg-red-400',
        loading: 'bg-blue-400 animate-pulse'
    };

    statusElement.className = `text-sm ${textClasses[type] || textClasses.loading} flex items-center gap-2 font-medium tracking-wide`;

    if (type === 'error') {
        statusElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${escapeHTML(label)}`;
    } else {
        statusElement.innerHTML = `<span class="w-2.5 h-2.5 rounded-full ${dotClasses[type] || dotClasses.loading}"></span> ${escapeHTML(label)}`;
    }
}

function renderDashboardError(listElement, message, details = '') {
    if (!listElement) return;

    listElement.innerHTML = `
        <div class="col-span-full text-center py-10 text-red-400 text-sm">
            <div class="text-2xl mb-3"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="text-base font-medium">${escapeHTML(message)}</div>
            ${details ? `<div class="text-slate-500 mt-3">${escapeHTML(details)}</div>` : ''}
        </div>
    `;
}

function renderDashboardLoading(listElement, message) {
    if (!listElement) return;

    listElement.innerHTML = `
        <div class="col-span-full text-center py-8 text-slate-500">
            <i class="fas fa-circle-notch fa-spin text-2xl mb-3"></i>
            <br>${escapeHTML(message)}
        </div>
    `;
}

function createDashboardItem({ rank, title, metric = '', iconClass = '', url = '#', sparkline = true }) {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between py-2 border-b border-slate-800/50 hover:bg-slate-800/50 px-2 rounded cursor-pointer transition-colors';

    const rankClass = rank <= 3 ? 'rank-top-3' : 'rank-normal';
    const sparklines = [
        '1,2,5,8,12,15',
        '5,4,6,9,14',
        '2,3,4,8,10',
        '1,1,2,5,8',
        '3,5,6,7,11,13'
    ];
    const spark = sparkline ? generateSparkline(sparklines[(rank - 1) % sparklines.length]) : '';

    item.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden pr-2">
            <span class="rank-badge ${rankClass} shrink-0">${rank}</span>
            <span class="font-medium truncate text-sm text-slate-300" title="${escapeHTML(title)}">${escapeHTML(title)}</span>
        </div>
        <div class="flex items-center gap-4 shrink-0">
            ${
                metric
                    ? `<span class="text-[10px] text-slate-500 hidden sm:inline-flex items-center gap-1 max-w-[120px] truncate">
                        ${iconClass ? `<i class="${escapeHTML(iconClass)}"></i>` : ''}
                        ${escapeHTML(metric)}
                    </span>`
                    : ''
            }
            <div class="opacity-80">${spark}</div>
        </div>
    `;

    if (url && url !== '#') {
        item.addEventListener('click', () => {
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    return item;
}

function getNestedValue(object, path) {
    return path.split('.').reduce((current, key) => {
        if (!current || typeof current !== 'object') return undefined;
        return current[key];
    }, object);
}

function firstArrayFrom(feed, paths) {
    for (const path of paths) {
        const value = getNestedValue(feed, path);
        if (Array.isArray(value)) return value;
        if (value && Array.isArray(value.items)) return value.items;
        if (value && Array.isArray(value.data)) return value.data;
        if (value && Array.isArray(value.results)) return value.results;
        if (value && Array.isArray(value.payloads)) return value.payloads;
    }

    return [];
}

function firstValue(item, keys, fallback = '') {
    for (const key of keys) {
        const value = getNestedValue(item, key);
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }

    return fallback;
}

function normalizeFeedData(rawFeed) {
    const feed = rawFeed || {};

    const osintRaw = firstArrayFrom(feed, [
        'global_osint',
        'global_osint_trending',
        'osint',
        'fofa',
        'fofa.items',
        'fofa.trends',
        'sources.fofa',
        'sources.fofa.items',
        'data.fofa',
        'data.global_osint'
    ]);

    const threatRaw = firstArrayFrom(feed, [
        'threat_intel',
        'threat_intel_profiling',
        'urlhaus',
        'payloads',
        'sources.urlhaus',
        'sources.urlhaus.items',
        'data.urlhaus',
        'data.threat_intel'
    ]);

    const socialRaw = [
        ...firstArrayFrom(feed, [
            'social_media',
            'social_media_trends',
            'social',
            'sources.social',
            'sources.social.items',
            'data.social'
        ]),
        ...firstArrayFrom(feed, [
            'reddit',
            'reddit_hot',
            'sources.reddit',
            'sources.reddit.items',
            'data.reddit'
        ]),
        ...firstArrayFrom(feed, [
            'trends24',
            'twitter',
            'x_trends',
            'sources.trends24',
            'sources.trends24.items',
            'data.trends24'
        ])
    ];

    const googleRaw = firstArrayFrom(feed, [
        'google_trends',
        'google_trends_metrics',
        'google',
        'sources.google_trends',
        'sources.google_trends.items',
        'data.google_trends'
    ]);

    return {
        generatedAt: feed.generated_at || feed.generatedAt || feed.updated_at || feed.updatedAt || '',
        osint: osintRaw.map(item => ({
            title: firstValue(item, ['title', 'query', 'name', 'text', 'keyword'], 'Unknown FOFA trend'),
            metric: firstValue(item, ['metric', 'source', 'engine'], 'FOFA'),
            url: firstValue(item, ['url', 'link', 'href'], '#')
        })),
        threat: threatRaw.map(item => {
            const tag = firstValue(item, ['tag', 'tags.0', 'malware', 'signature', 'file_type'], 'payload');
            const title = firstValue(item, ['title', 'url', 'payload_url', 'sha256_hash', 'filename'], 'Unknown payload');

            return {
                title: `${title}${tag ? ` [${tag}]` : ''}`,
                metric: firstValue(item, ['firstseen', 'first_seen', 'date', 'timestamp'], 'recent').split(' ')[0],
                url: firstValue(item, ['urlhaus_reference', 'reference', 'link', 'url'], '#')
            };
        }),
        social: socialRaw.map(item => {
            const platform = firstValue(item, ['platform', 'source', 'engine'], 'Social');
            const metric = firstValue(item, ['metric', 'ups', 'upvotes', 'score', 'traffic'], platform);

            return {
                title: firstValue(item, ['title', 'name', 'text', 'hashtag', 'query'], 'Unknown social trend'),
                metric,
                url: firstValue(item, ['url', 'link', 'href'], '#'),
                platform
            };
        }),
        google: googleRaw.map(item => ({
            title: firstValue(item, ['title', 'query', 'name', 'text'], 'Unknown Google trend'),
            metric: firstValue(item, ['approx_traffic', 'traffic', 'metric', 'volume'], 'Hot'),
            url: firstValue(item, ['url', 'link', 'href'], '#')
        }))
    };
}

function renderDashboardList(listId, statusId, items, options) {
    const list = document.getElementById(listId);
    const status = document.getElementById(statusId);

    const {
        emptyMessage,
        liveLabel = 'LIVE',
        iconClass = '',
        sparkline = true
    } = options;

    if (!list || !status) return;

    if (!items || items.length === 0) {
        setDashboardStatus(status, 'error', 'No Data');
        renderDashboardError(
            list,
            emptyMessage,
            'The cached JSON exists, but this section has no usable items yet. Run the GitHub Action again.'
        );
        return;
    }

    list.innerHTML = '';

    items.slice(0, 10).forEach((item, index) => {
        list.appendChild(createDashboardItem({
            rank: index + 1,
            title: item.title,
            metric: item.metric,
            iconClass,
            url: item.url,
            sparkline
        }));
    });

    setDashboardStatus(status, 'live', liveLabel);
}

async function loadCachedFeeds() {
    const sections = [
        ['global-trending-list', 'osint-trend-status', 'Loading cached FOFA/OSINT trends...'],
        ['threat-trending-list', 'threat-trend-status', 'Loading cached threat intel...'],
        ['social-trending-list', 'social-trend-status', 'Loading cached social trends...'],
        ['google-trending-list', 'google-trend-status', 'Loading cached Google trends...']
    ];

    sections.forEach(([listId, statusId, message]) => {
        renderDashboardLoading(document.getElementById(listId), message);
        setDashboardStatus(document.getElementById(statusId), 'loading', 'Loading');
    });

    try {
        const response = await fetch(`./data/live-feeds.json?v=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Could not load data/live-feeds.json. HTTP ${response.status}`);
        }

        const rawFeed = await response.json();
        const normalized = normalizeFeedData(rawFeed);

        renderDashboardList(
            'global-trending-list',
            'osint-trend-status',
            normalized.osint,
            {
                emptyMessage: 'No cached FOFA/OSINT trends found.',
                iconClass: 'fas fa-eye text-primary-500'
            }
        );

        renderDashboardList(
            'threat-trending-list',
            'threat-trend-status',
            normalized.threat,
            {
                emptyMessage: 'No cached URLHaus threat intel found.',
                iconClass: 'fas fa-bug text-red-400',
                sparkline: false
            }
        );

        renderDashboardList(
            'social-trending-list',
            'social-trend-status',
            normalized.social,
            {
                emptyMessage: 'No cached Reddit/Trends24 social trends found.',
                iconClass: 'fab fa-reddit text-orange-500'
            }
        );

        renderDashboardList(
            'google-trending-list',
            'google-trend-status',
            normalized.google,
            {
                emptyMessage: 'No cached Google Trends metrics found.',
                iconClass: 'fas fa-search text-slate-400'
            }
        );

        if (normalized.generatedAt) {
            console.info(`Live feeds loaded. Generated at: ${normalized.generatedAt}`);
        }

    } catch (error) {
        console.error('Cached feed loading failed:', error);

        renderDashboardError(
            document.getElementById('global-trending-list'),
            'Cached feed file could not be loaded.',
            error.message
        );
        renderDashboardError(
            document.getElementById('threat-trending-list'),
            'Cached feed file could not be loaded.',
            error.message
        );
        renderDashboardError(
            document.getElementById('social-trending-list'),
            'Cached feed file could not be loaded.',
            error.message
        );
        renderDashboardError(
            document.getElementById('google-trending-list'),
            'Cached feed file could not be loaded.',
            error.message
        );

        setDashboardStatus(document.getElementById('osint-trend-status'), 'error', 'Error');
        setDashboardStatus(document.getElementById('threat-trend-status'), 'error', 'Error');
        setDashboardStatus(document.getElementById('social-trend-status'), 'error', 'Error');
        setDashboardStatus(document.getElementById('google-trend-status'), 'error', 'Error');
    }
}

// ------------------------------
// Local Activity Logs
// ------------------------------
function renderLocalLogsWidget() {
    const list = document.getElementById('local-logs-list');
    if (!list) return;

    list.innerHTML = '';
    const logs = LogManager.getLogs();

    if (logs.length === 0) {
        list.innerHTML = `<div class="text-slate-400 text-center py-6">No recent searches yet. Generate and click some dorks to see your history here!</div>`;
        return;
    }

    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between py-2 border-b border-slate-100 hover:bg-white px-2 rounded transition-colors';
        const timeAgo = new Date(log.lastUsed).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        item.innerHTML = `
            <div class="flex flex-col overflow-hidden pr-2">
                <span class="font-mono text-xs text-primary-700 truncate" title="${escapeHTML(log.query)}">${escapeHTML(log.query)}</span>
                <span class="text-[10px] text-slate-400 font-medium">${escapeHTML(log.engine)} &bull; Clicked ${escapeHTML(log.count)} time(s)</span>
            </div>
            <div class="text-[10px] text-slate-400 whitespace-nowrap ml-2 shrink-0">${escapeHTML(timeAgo)}</div>
        `;

        list.appendChild(item);
    });
}

function clearLocalLogs() {
    localStorage.removeItem('osint_logs');
    renderLocalLogsWidget();
    showToast('Activity logs cleared', 'success');
}

// ------------------------------
// Generator Functions
// ------------------------------
function generateBugBountyDorks() {
    const domainInput = document.getElementById('domain-input').value.trim();

    if (!isValidDomain(domainInput)) {
        showToast('Please enter a valid domain (e.g., example.com)', 'error');
        return;
    }

    const domain = domainInput.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    const resultsContainer = document.getElementById('bug-bounty-results-container');
    const resultsDiv = document.getElementById('bug-bounty-results');
    const loading = document.getElementById('bug-bounty-loading');

    document.getElementById('domain-display').textContent = domain;
    resultsDiv.innerHTML = '';
    resultsContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    setTimeout(() => {
        loading.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        bugBountyCategories.forEach(category => {
            const card = createCategoryCard(category);
            const linksContainer = document.createElement('div');
            linksContainer.className = 'flex flex-col gap-3 mt-4';

            category.dorks.forEach(dork => {
                const query = dork.replace(/{domain}/g, domain);
                linksContainer.appendChild(createSearchLink(query, query.startsWith('https://'), 'Google'));
            });

            card.appendChild(linksContainer);
            resultsDiv.appendChild(card);
        });
    }, 600);
}

function generateShodanDorks() {
    const targetInput = document.getElementById('shodan-target-input').value.trim();
    const resultsContainer = document.getElementById('shodan-results-container');
    const resultsDiv = document.getElementById('shodan-results');
    const loading = document.getElementById('shodan-loading');

    resultsDiv.innerHTML = '';
    resultsContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    setTimeout(() => {
        loading.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        shodanCategories.forEach(category => {
            const card = createCategoryCard(category);
            const linksContainer = document.createElement('div');
            linksContainer.className = 'flex flex-col gap-3 mt-4';

            category.dorks.forEach(dork => {
                const query = targetInput ? `${targetInput} ${dork}` : dork;
                linksContainer.appendChild(createSearchLink(query, false, 'Shodan'));
            });

            card.appendChild(linksContainer);
            resultsDiv.appendChild(card);
        });
    }, 600);
}

function generateFofaDorks() {
    const targetInput = document.getElementById('fofa-target-input').value.trim();
    const resultsContainer = document.getElementById('fofa-results-container');
    const resultsDiv = document.getElementById('fofa-results');
    const loading = document.getElementById('fofa-loading');

    resultsDiv.innerHTML = '';
    resultsContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    setTimeout(() => {
        loading.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        fofaCategories.forEach(category => {
            const card = createCategoryCard(category);
            const linksContainer = document.createElement('div');
            linksContainer.className = 'flex flex-col gap-3 mt-4';

            category.dorks.forEach(dork => {
                let query = dork.replace(/{target}/g, targetInput || 'example.com');

                if (targetInput && !dork.includes('{target}')) {
                    query = `${dork} && title="${targetInput}"`;
                }

                linksContainer.appendChild(createSearchLink(query, false, 'FOFA'));
            });

            card.appendChild(linksContainer);
            resultsDiv.appendChild(card);
        });
    }, 600);
}

function generatePeopleSearchDorks() {
    const nameInput = document.getElementById('name-input').value.trim();
    const emailInput = document.getElementById('people-email-input').value.trim();
    const locationInput = document.getElementById('location-input').value.trim();

    if (nameInput.length < 2) {
        showToast('Please enter a valid target name', 'error');
        return;
    }

    const resultsContainer = document.getElementById('people-search-results-container');
    const resultsDiv = document.getElementById('people-search-results');
    const loading = document.getElementById('people-search-loading');

    document.getElementById('people-display').textContent = nameInput;
    resultsDiv.innerHTML = '';
    resultsContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    setTimeout(() => {
        loading.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        peopleSearchCategories.forEach(category => {
            const card = createCategoryCard(category);
            const linksContainer = document.createElement('div');
            linksContainer.className = 'flex flex-col gap-3 mt-4';

            category.dorks.forEach(dork => {
                let query = dork.replace(/{name}/g, nameInput);
                query = query.replace(
                    /{email}/g,
                    emailInput ? emailInput : `"${nameInput.replace(/\s+/g, '')}@gmail.com"`
                );

                if (query.includes('{location}') && !locationInput) {
                    return;
                }

                query = query.replace(/{location}/g, locationInput);
                linksContainer.appendChild(createSearchLink(query, false, 'Google'));
            });

            if (linksContainer.children.length > 0) {
                card.appendChild(linksContainer);
                resultsDiv.appendChild(card);
            }
        });
    }, 600);
}

function generateEmailSearchDorks() {
    const emailTarget = document.getElementById('email-target-input').value.trim();

    if (!emailTarget) {
        showToast('Please enter an email or domain', 'error');
        return;
    }

    const isEmail = isValidEmail(emailTarget);
    let domain = emailTarget;

    if (isEmail) {
        domain = emailTarget.split('@')[1];
    } else if (!isValidDomain(emailTarget)) {
        showToast('Please enter a valid email or domain', 'error');
        return;
    }

    const resultsContainer = document.getElementById('email-search-results-container');
    const resultsDiv = document.getElementById('email-search-results');
    const loading = document.getElementById('email-search-loading');

    document.getElementById('email-display').textContent = emailTarget;
    resultsDiv.innerHTML = '';
    resultsContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    setTimeout(() => {
        loading.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        emailSearchCategories.forEach(category => {
            const card = createCategoryCard(category);
            const linksContainer = document.createElement('div');
            linksContainer.className = 'flex flex-col gap-3 mt-4';

            category.dorks.forEach(dork => {
                let query = dork.replace(/{domain}/g, domain);

                if (query.includes('{email}') && !isEmail) {
                    return;
                }

                query = query.replace(/{email}/g, emailTarget);
                query = query.replace(/{target}/g, isEmail ? emailTarget.split('@')[0] : emailTarget);

                linksContainer.appendChild(createSearchLink(query, false, 'Google'));
            });

            if (linksContainer.children.length > 0) {
                card.appendChild(linksContainer);
                resultsDiv.appendChild(card);
            }
        });
    }, 600);
}

function previewImage(event) {
    const previewContainer = document.getElementById('image-preview-container');
    const preview = document.getElementById('image-preview');
    const file = event.target.files[0];

    if (file) {
        preview.src = URL.createObjectURL(file);
        previewContainer.classList.remove('hidden');
        showToast('Image loaded successfully', 'success');
    }
}

function generateImageSearchLinks() {
    const fileInput = document.getElementById('image-upload');

    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select or drag & drop an image first', 'error');
        return;
    }

    const resultsContainer = document.getElementById('image-search-results-container');
    const resultsDiv = document.getElementById('image-search-results');
    const loading = document.getElementById('image-search-loading');

    resultsDiv.innerHTML = '';
    resultsContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    setTimeout(() => {
        loading.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        imageSearchEngines.forEach(category => {
            const card = createCategoryCard(category);
            const linksContainer = document.createElement('div');
            linksContainer.className = 'flex flex-col gap-3 mt-4';

            category.engines.forEach(engine => {
                const link = createSearchLink(engine.url, true, engine.name);
                link.innerHTML = `<span class="font-medium">${escapeHTML(engine.name)}</span> <i class="fas fa-external-link-alt ml-2 opacity-50"></i>`;
                link.className = 'flex justify-between items-center w-full break-all text-slate-600 hover:text-primary-700 bg-white border border-slate-200 hover:border-primary-300 rounded-lg p-3 text-sm transition-colors shadow-sm hover:shadow';

                linksContainer.appendChild(link);
            });

            card.appendChild(linksContainer);
            resultsDiv.appendChild(card);
        });
    }, 600);
}

// ------------------------------
// Initial Setup
// ------------------------------
window.addEventListener('DOMContentLoaded', () => {
    handleNavigation('home-section', document.getElementById('home-link'));

    // IMPORTANT:
    // Do NOT call direct browser scrapers here.
    // GitHub Pages must read the cached JSON generated by GitHub Actions.
    loadCachedFeeds();

    renderLocalLogsWidget();
});
