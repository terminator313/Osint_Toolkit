// Main functionality for the OSINT toolkit

// --- Navigation ---
function handleNavigation(targetId, clickedElement) {
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('bg-primary-50', 'text-primary-700', 'border', 'border-primary-100', 'shadow-sm');
        l.classList.add('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
    });
    
    document.querySelectorAll('.tool-section').forEach(s => {
        s.classList.remove('block', 'animate-fade-in');
        s.classList.add('hidden');
    });
    
    if (clickedElement && clickedElement.classList.contains('nav-link')) {
        clickedElement.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
        clickedElement.classList.add('bg-primary-50', 'text-primary-700', 'border', 'border-primary-100', 'shadow-sm');
    } else if (targetId === 'home-section') {
        const homeLink = document.getElementById('home-link');
        homeLink.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
        homeLink.classList.add('bg-primary-50', 'text-primary-700', 'border', 'border-primary-100', 'shadow-sm');
    }
    
    const section = document.getElementById(targetId);
    section.classList.remove('hidden');
    section.classList.add('block', 'animate-fade-in');
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.id.replace('-link', '-section');
        handleNavigation(targetId, this);
    });
});

document.getElementById('home-logo').addEventListener('click', function(e) {
    e.preventDefault();
    handleNavigation('home-section', null);
});


// --- Dashboard Rendering & Direct Native Scraping ---

// Important: these dashboard fetches are intentionally native browser fetches.
// They can still be blocked by CORS, Cloudflare, ad blockers, or file:// origin rules.
// Run the project through a local server, e.g. python -m http.server 8080.

const DASHBOARD_TIMEOUT_MS = 10000;

function escapeHTML(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[char]));
}

function setDashboardStatus(statusElement, type, label) {
    const statusStyles = {
        live: 'text-green-400',
        error: 'text-red-400',
        partial: 'text-yellow-400'
    };

    const dotStyles = {
        live: 'bg-green-400 animate-pulse',
        error: 'bg-red-400',
        partial: 'bg-yellow-400 animate-pulse'
    };

    const icon = type === 'error' ? '<i class="fas fa-exclamation-triangle"></i>' : `<span class="w-2.5 h-2.5 rounded-full ${dotStyles[type] || dotStyles.live}"></span>`;
    statusElement.className = `text-sm ${statusStyles[type] || statusStyles.live} flex items-center gap-2 font-medium tracking-wide`;
    statusElement.innerHTML = `${icon} ${label}`;
}

function renderDashboardError(listElement, message, details = '') {
    const safeDetails = details ? `<div class="mt-2 text-xs text-slate-500 max-w-2xl mx-auto">${escapeHTML(details)}</div>` : '';
    listElement.innerHTML = `
        <div class="col-span-full text-center py-6 text-red-400 text-sm">
            <i class="fas fa-triangle-exclamation mb-2 text-lg"></i><br>
            ${escapeHTML(message)}
            ${safeDetails}
        </div>
    `;
}

function createDashboardItem({ rank, title, metric = '', iconClass = '', source = '', url = '#', sparkline = true }) {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between py-2 border-b border-slate-800/50 hover:bg-slate-800/50 px-2 rounded cursor-pointer transition-colors';

    const rankClass = rank <= 3 ? 'rank-top-3' : 'rank-normal';
    const sparklines = ['1,2,5,8,12,15', '5,4,6,9,14', '2,3,4,8,10', '1,1,2,5,8'];
    const spark = sparkline ? generateSparkline(sparklines[(rank - 1) % sparklines.length]) : '';
    const meta = [iconClass ? `<i class="${escapeHTML(iconClass)}"></i>` : '', escapeHTML(metric || source)].filter(Boolean).join(' ');

    item.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden pr-2">
            <span class="rank-badge ${rankClass} shrink-0">${rank}</span>
            <span class="font-medium truncate text-sm text-slate-300" title="${escapeHTML(title)}">${escapeHTML(title)}</span>
        </div>
        <div class="flex items-center gap-4 shrink-0">
            <span class="text-[10px] text-slate-500 hidden sm:inline-flex items-center gap-1 max-w-[120px] truncate">${meta}</span>
            <div class="opacity-80">${spark}</div>
        </div>
    `;

    if (url && url !== '#') {
        item.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
    }

    return item;
}

const fetchWithTimeout = async (url, options = {}, timeout = DASHBOARD_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            cache: 'no-store',
            mode: 'cors',
            credentials: 'omit',
            ...options,
            signal: controller.signal,
            headers: {
                'Accept': '*/*',
                ...(options.headers || {})
            }
        });
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout / 1000}s`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
};

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
    return `<svg width="40" height="15" viewBox="0 -2 40 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="${points.trim()}" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
}

async function fetchText(url, options = {}) {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
    return response.text();
}

async function fetchJson(url, options = {}) {
    const response = await fetchWithTimeout(url, {
        ...options,
        headers: {
            'Accept': 'application/json,text/plain,*/*',
            ...(options.headers || {})
        }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
    return response.json();
}

function parseHTML(html) {
    return new DOMParser().parseFromString(html, 'text/html');
}

function parseXML(xml) {
    const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) throw new Error('Invalid XML returned by source');
    return xmlDoc;
}

function absoluteUrl(href, baseUrl) {
    try {
        return new URL(href, baseUrl).href;
    } catch (_) {
        return '#';
    }
}

async function fetchOsintTrends() {
    const list = document.getElementById('global-trending-list');
    const status = document.getElementById('osint-trend-status');

    try {
        const html = await fetchText('https://fofa.info/', {
            headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
        });

        if (/cloudflare|captcha|access denied|attention required/i.test(html.slice(0, 2000))) {
            throw new Error('FOFA returned an anti-bot/challenge page instead of normal HTML');
        }

        const doc = parseHTML(html);
        const links = Array.from(doc.querySelectorAll('a[href*="/result?qbase64="]'))
            .map(link => ({
                title: link.textContent.replace(/\s+/g, ' ').trim(),
                href: link.getAttribute('href')
            }))
            .filter(item => item.title && item.title.length <= 80)
            .filter((item, index, arr) => arr.findIndex(x => x.title === item.title) === index)
            .slice(0, 10);

        if (!links.length) {
            throw new Error('No FOFA trend links matched selector: a[href*="/result?qbase64="]');
        }

        list.innerHTML = '';
        links.forEach((item, index) => {
            list.appendChild(createDashboardItem({
                rank: index + 1,
                title: item.title,
                metric: 'FOFA',
                iconClass: 'fas fa-eye text-primary-500',
                url: absoluteUrl(item.href, 'https://fofa.info/')
            }));
        });
        setDashboardStatus(status, 'live', 'LIVE');
    } catch (error) {
        console.error('OSINT Scraper Error:', error);
        setDashboardStatus(status, 'error', 'Blocked');
        renderDashboardError(
            list,
            'FOFA direct fetch failed or the HTML structure changed.',
            `${error.message}. Run through http://127.0.0.1:8080 and confirm your CORS-bypass browser profile is active.`
        );
    }
}

async function fetchThreatIntel() {
    const list = document.getElementById('threat-trending-list');
    const status = document.getElementById('threat-trend-status');

    try {
        const data = await fetchJson('https://urlhaus-api.abuse.ch/v1/payloads/recent/');
        if (data.query_status !== 'ok' || !Array.isArray(data.payloads)) {
            throw new Error(`Unexpected URLHaus response: ${data.query_status || 'unknown status'}`);
        }

        const payloads = data.payloads.slice(0, 10);
        if (!payloads.length) throw new Error('URLHaus returned zero payloads');

        list.innerHTML = '';
        payloads.forEach((payload, index) => {
            const tag = Array.isArray(payload.tags) && payload.tags.length ? payload.tags[0] : 'payload';
            const firstSeen = payload.firstseen ? payload.firstseen.split(' ')[0] : 'recent';
            list.appendChild(createDashboardItem({
                rank: index + 1,
                title: `${payload.url || payload.sha256_hash || 'Unknown payload'}  [${tag}]`,
                metric: firstSeen,
                iconClass: 'fas fa-bug text-red-400',
                url: payload.urlhaus_reference || '#',
                sparkline: false
            }));
        });
        setDashboardStatus(status, 'live', 'LIVE');
    } catch (error) {
        console.error('Threat Intel Scraper Error:', error);
        setDashboardStatus(status, 'error', 'Blocked');
        renderDashboardError(
            list,
            'URLHaus direct fetch failed.',
            `${error.message}. This can be caused by CORS, ad blockers, DNS filtering, or local network restrictions.`
        );
    }
}

async function fetchSocialMediaTrends() {
    const list = document.getElementById('social-trending-list');
    const status = document.getElementById('social-trend-status');
    const combinedPosts = [];
    const failures = [];

    try {
        try {
            const redditData = await fetchJson('https://www.reddit.com/r/cybersecurity/hot.json?limit=10', {
                headers: { 'Accept': 'application/json' }
            });
            const redditPosts = (redditData?.data?.children || [])
                .filter(p => p.data && !p.data.stickied)
                .slice(0, 5)
                .map(p => ({
                    title: p.data.title,
                    metric: p.data.ups ? `${p.data.ups}` : 'Reddit',
                    platform: 'Reddit',
                    icon: 'fab fa-reddit text-orange-500',
                    url: `https://www.reddit.com${p.data.permalink}`
                }));
            combinedPosts.push(...redditPosts);
        } catch (error) {
            failures.push(`Reddit: ${error.message}`);
            console.warn('Reddit fetch failed', error);
        }

        try {
            const html = await fetchText('https://trends24.in/united-states/', {
                headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
            });
            const doc = parseHTML(html);
            const hashtags = Array.from(doc.querySelectorAll('.trend-card__list li a'))
                .map(a => ({
                    title: a.textContent.replace(/\s+/g, ' ').trim(),
                    url: absoluteUrl(a.getAttribute('href'), 'https://trends24.in/united-states/')
                }))
                .filter(item => item.title)
                .slice(0, 5);

            const twitterPosts = hashtags.map(item => ({
                title: item.title,
                metric: 'Trend',
                platform: 'X/Twitter',
                icon: 'fab fa-twitter text-blue-400',
                url: item.url
            }));
            combinedPosts.push(...twitterPosts);
        } catch (error) {
            failures.push(`Trends24: ${error.message}`);
            console.warn('Trends24 direct scrape failed', error);
        }

        if (!combinedPosts.length) throw new Error(failures.join(' | ') || 'All social media sources failed');

        list.innerHTML = '';
        combinedPosts.slice(0, 10).forEach((post, index) => {
            list.appendChild(createDashboardItem({
                rank: index + 1,
                title: post.title,
                metric: post.metric,
                iconClass: post.icon,
                source: post.platform,
                url: post.url
            }));
        });

        setDashboardStatus(status, failures.length ? 'partial' : 'live', failures.length ? 'PARTIAL' : 'LIVE');
    } catch (error) {
        console.error('Social Media Scraper Error:', error);
        setDashboardStatus(status, 'error', 'Error');
        renderDashboardError(
            list,
            'Reddit and Trends24 direct fetches failed.',
            error.message
        );
    }
}

async function fetchGoogleTrends() {
    const list = document.getElementById('google-trending-list');
    const status = document.getElementById('google-trend-status');

    try {
        const xml = await fetchText('https://trends.google.com/trending/rss?geo=US', {
            headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }
        });
        const xmlDoc = parseXML(xml);
        const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 10);
        if (!items.length) throw new Error('No <item> nodes found in Google Trends RSS');

        list.innerHTML = '';
        items.forEach((itemNode, index) => {
            const title = itemNode.querySelector('title')?.textContent?.trim() || 'Unknown trend';
            const link = itemNode.querySelector('link')?.textContent?.trim() || '#';
            const trafficNode =
                itemNode.querySelector('approx_traffic') ||
                itemNode.querySelector('ht\\:approx_traffic') ||
                Array.from(itemNode.children).find(el => el.localName === 'approx_traffic');
            const traffic = trafficNode ? trafficNode.textContent.replace('+', '').trim() : 'Hot';

            list.appendChild(createDashboardItem({
                rank: index + 1,
                title,
                metric: traffic,
                iconClass: 'fas fa-search text-slate-400',
                url: link
            }));
        });
        setDashboardStatus(status, 'live', 'LIVE');
    } catch (error) {
        console.error('Google Trends Scraper Error:', error);
        setDashboardStatus(status, 'error', 'Error');
        renderDashboardError(
            list,
            'Google Trends RSS direct fetch failed or returned invalid XML.',
            `${error.message}. Check CORS settings, ad blocker rules, and whether the page is served over http:// instead of file://.`
        );
    }
}


function renderLocalLogsWidget() {
    const list = document.getElementById('local-logs-list');
    list.innerHTML = '';
    const logs = LogManager.getLogs();
    
    if (logs.length === 0) {
        list.innerHTML = `<div class="text-slate-400 text-center py-6">No recent searches yet. Generate and click some dorks to see your history here!</div>`;
        return;
    }

    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between py-2 border-b border-slate-100 hover:bg-white px-2 rounded transition-colors';
        const timeAgo = new Date(log.lastUsed).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        item.innerHTML = `
            <div class="flex flex-col overflow-hidden pr-2">
                <span class="font-mono text-xs text-primary-700 truncate" title="${log.query}">${log.query}</span>
                <span class="text-[10px] text-slate-400 font-medium">${log.engine} &bull; Clicked ${log.count} time(s)</span>
            </div>
            <div class="text-[10px] text-slate-400 whitespace-nowrap ml-2 shrink-0">${timeAgo}</div>
        `;
        list.appendChild(item);
    });
}

function clearLocalLogs() {
    localStorage.removeItem('osint_logs');
    renderLocalLogsWidget();
    showToast('Activity logs cleared', 'success');
}

// --- Generation Functions ---

function generateBugBountyDorks() {
    const domainInput = document.getElementById('domain-input').value.trim();
    if (!isValidDomain(domainInput)) {
        showToast('Please enter a valid domain (e.g., example.com)', 'error');
        return;
    }
    
    let domain = domainInput.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

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
                linksContainer.appendChild(createSearchLink(query, query.startsWith("https://"), "Google"));
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
                let query = dork;
                if (targetInput) {
                    query = `${targetInput} ${dork}`;
                }
                linksContainer.appendChild(createSearchLink(query, false, "Shodan"));
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
                let query = dork.replace(/{target}/g, targetInput || "example.com");
                if (targetInput && !dork.includes("{target}")) {
                     query = `${dork} && title="${targetInput}"`; 
                }
                linksContainer.appendChild(createSearchLink(query, false, "FOFA"));
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
                query = query.replace(/{email}/g, emailInput ? emailInput : `"${nameInput.replace(/\s+/g, '')}@gmail.com"`);
                
                if (query.includes("{location}") && !locationInput) {
                    return; 
                }
                query = query.replace(/{location}/g, locationInput);

                linksContainer.appendChild(createSearchLink(query, false, "Google"));
            });
            
            if(linksContainer.children.length > 0) {
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
                if (query.includes("{email}") && !isEmail) {
                    return; 
                }
                query = query.replace(/{email}/g, emailTarget);
                query = query.replace(/{target}/g, isEmail ? emailTarget.split('@')[0] : emailTarget);
                
                linksContainer.appendChild(createSearchLink(query, false, "Google"));
            });
            
            if(linksContainer.children.length > 0) {
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
                link.innerHTML = `<span class="font-medium">${engine.name}</span> <i class="fas fa-external-link-alt ml-2 opacity-50"></i>`;
                link.className = 'flex justify-between items-center w-full break-all text-slate-600 hover:text-primary-700 bg-white border border-slate-200 hover:border-primary-300 rounded-lg p-3 text-sm transition-colors shadow-sm hover:shadow';
                
                linksContainer.appendChild(link);
            });
            
            card.appendChild(linksContainer);
            resultsDiv.appendChild(card);
        });
    }, 600);
}

// Initial Setup
window.addEventListener('DOMContentLoaded', () => {
    handleNavigation('home-section', document.getElementById('home-link'));
    
    // Trigger DIRECT NATIVE scrapers (User explicitly disabled CORS requirements)
    fetchOsintTrends();
    fetchThreatIntel();
    fetchSocialMediaTrends();
    fetchGoogleTrends();
    
    renderLocalLogsWidget();
});
// --- GitHub Pages Production Feed Loader ---
// GitHub Pages cannot bypass CORS from the visitor browser. These functions read
// same-origin cached JSON generated by GitHub Actions in data/live-feeds.json.
const LIVE_FEED_URL = 'data/live-feeds.json?v=' + Date.now();
let cachedLiveFeeds = null;

async function getLiveFeeds() {
    if (cachedLiveFeeds) return cachedLiveFeeds;
    const response = await fetchWithTimeout(LIVE_FEED_URL, { cache: 'no-store' }, 10000);
    if (!response.ok) throw new Error(`Cached feed returned HTTP ${response.status}`);
    cachedLiveFeeds = await response.json();
    return cachedLiveFeeds;
}

function setDashboardStatus(statusEl, state, label) {
    const color = state === 'ok' ? 'green' : state === 'partial' ? 'yellow' : 'red';
    const icon = state === 'ok'
        ? `<span class="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>`
        : state === 'partial'
            ? `<span class="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>`
            : `<i class="fas fa-exclamation-triangle"></i>`;
    statusEl.className = `text-sm text-${color}-400 flex items-center gap-2 font-medium tracking-wide`;
    statusEl.innerHTML = `${icon} ${label}`;
}

function renderFeedError(list, title, detail = '') {
    list.innerHTML = `
        <div class="col-span-full text-center py-10 text-red-400 text-sm">
            <i class="fas fa-exclamation-triangle text-2xl mb-4"></i>
            <div class="text-base mb-2">${title}</div>
            <div class="text-slate-500">${detail || 'No cached feed data is available yet. Run the GitHub Action once.'}</div>
        </div>`;
}

function renderTrendItems(list, items, sourceLabel, iconClass, itemUrlBuilder) {
    list.innerHTML = '';
    const sparklines = ['1,2,5,8,12,15', '5,4,6,9,14', '2,3,4,8,10', '1,1,2,5,8'];
    items.slice(0, 10).forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between py-2 border-b border-slate-800/50 hover:bg-slate-800/50 px-2 rounded cursor-pointer transition-colors';
        const rankClass = (index + 1) <= 3 ? 'rank-top-3' : 'rank-normal';
        const title = entry.title || entry.query || entry.tag || 'Untitled';
        const metric = entry.metric || entry.traffic || entry.platform || sourceLabel;
        const spark = generateSparkline(sparklines[index % sparklines.length]);
        item.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden pr-2">
                <span class="rank-badge ${rankClass} shrink-0">${index + 1}</span>
                <span class="font-medium truncate text-sm text-slate-300" title="${title}">${title}</span>
            </div>
            <div class="flex items-center gap-4 shrink-0">
                <span class="text-[10px] text-slate-500 hidden sm:inline-flex items-center gap-1 w-20"><i class="${iconClass}"></i> ${metric}</span>
                <div class="opacity-80">${spark}</div>
            </div>`;
        item.addEventListener('click', () => {
            const url = itemUrlBuilder ? itemUrlBuilder(entry) : entry.url;
            if (url) window.open(url, '_blank');
        });
        list.appendChild(item);
    });
}

async function fetchOsintTrends() {
    const list = document.getElementById('global-trending-list');
    const status = document.getElementById('osint-trend-status');
    try {
        const feeds = await getLiveFeeds();
        const fofa = feeds.sources?.fofa || {};
        if (!fofa.items || !fofa.items.length) throw new Error(fofa.error || 'FOFA cached feed is empty');
        setDashboardStatus(status, 'ok', 'CACHED LIVE');
        renderTrendItems(list, fofa.items, 'FOFA', 'fas fa-eye text-primary-500', entry => entry.url);
    } catch (error) {
        setDashboardStatus(status, 'error', 'Blocked');
        renderFeedError(list, 'FOFA cached feed unavailable.', error.message);
    }
}

async function fetchThreatIntel() {
    const list = document.getElementById('threat-trending-list');
    const status = document.getElementById('threat-trend-status');
    try {
        const feeds = await getLiveFeeds();
        const urlhaus = feeds.sources?.urlhaus || {};
        if (!urlhaus.items || !urlhaus.items.length) throw new Error(urlhaus.error || 'URLHaus cached feed is empty');
        setDashboardStatus(status, 'ok', 'CACHED LIVE');
        list.innerHTML = '';
        urlhaus.items.slice(0, 10).forEach((payload, index) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between py-2 border-b border-slate-800/50 hover:bg-slate-800/50 px-2 rounded cursor-pointer transition-colors';
            const rankClass = (index + 1) <= 3 ? 'rank-top-3' : 'rank-normal';
            item.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden pr-2">
                    <span class="rank-badge ${rankClass} shrink-0">${index + 1}</span>
                    <span class="font-medium truncate text-sm" title="${payload.title}">${payload.title} <span class="hot-tag ml-2 bg-red-900/50 text-red-400 border border-red-800/50">${payload.tag || 'payload'}</span></span>
                </div>
                <div class="flex items-center gap-4 shrink-0">
                    <span class="text-[10px] text-slate-500 font-mono hidden sm:inline-flex">${payload.firstseen || ''}</span>
                </div>`;
            item.addEventListener('click', () => payload.url && window.open(payload.url, '_blank'));
            list.appendChild(item);
        });
    } catch (error) {
        setDashboardStatus(status, 'error', 'Blocked');
        renderFeedError(list, 'URLHaus cached feed unavailable.', error.message);
    }
}

async function fetchSocialMediaTrends() {
    const list = document.getElementById('social-trending-list');
    const status = document.getElementById('social-trend-status');
    try {
        const feeds = await getLiveFeeds();
        const reddit = feeds.sources?.reddit?.items || [];
        const trends24 = feeds.sources?.trends24?.items || [];
        const combined = [
            ...reddit.map(x => ({ ...x, platform: 'Reddit', metric: x.metric || x.upvotes || '', icon: 'fab fa-reddit text-orange-500' })),
            ...trends24.map(x => ({ ...x, platform: 'X', metric: x.metric || 'Trend', icon: 'fas fa-hashtag text-blue-400' }))
        ];
        if (!combined.length) throw new Error('No Reddit or Trends24 cached data available');
        setDashboardStatus(status, reddit.length && trends24.length ? 'ok' : 'partial', reddit.length && trends24.length ? 'CACHED LIVE' : 'PARTIAL');
        renderTrendItems(list, combined.slice(0, 10), 'Social', 'fab fa-reddit text-orange-500', entry => entry.url);
    } catch (error) {
        setDashboardStatus(status, 'error', 'Error');
        renderFeedError(list, 'Social cached feed unavailable.', error.message);
    }
}

async function fetchGoogleTrends() {
    const list = document.getElementById('google-trending-list');
    const status = document.getElementById('google-trend-status');
    try {
        const feeds = await getLiveFeeds();
        const google = feeds.sources?.googleTrends || {};
        if (!google.items || !google.items.length) throw new Error(google.error || 'Google Trends cached feed is empty');
        setDashboardStatus(status, 'ok', 'CACHED LIVE');
        renderTrendItems(list, google.items, 'Google', 'fas fa-search text-slate-400', entry => entry.url);
    } catch (error) {
        setDashboardStatus(status, 'error', 'Error');
        renderFeedError(list, 'Google Trends cached feed unavailable.', error.message);
    }
}
