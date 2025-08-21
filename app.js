/* global window, solanaWeb3, splToken */

class DetHabitsApp {
    constructor() {
        console.log('Construindo DetHabitsApp...');
        this.wallet = null;
        this.connection = null;
        // ATENÇÃO: NÃO ARMAZENE A CHAVE PRIVADA NO FRONTEND EM PRODUÇÃO!
        // Mova para um backend seguro ou use uma API para assinar transações.
        this.CENTRAL_WALLET_KEY = null; // Substitua por Uint8Array da chave privada da carteira central (ex.: [1,2,3,...])
        this.centralWalletKeypair = null;
        this.userData = {
            totalBalance: 294,
            stakeBalance: 0,
            voluntaryStakeBalance: 0,
            fractionalYieldObligatory: 0,
            fractionalYieldVoluntary: 0,
            dailyYieldObligatoryAccumulated: 0,
            dailyYieldVoluntaryAccumulated: 0,
            lastYieldUpdateTime: Date.now(),
            lastYieldResetDate: new Date().toISOString(),
            spendingBalance: 0,
            completedMissions: [],
            transactions: [],
            lastMissionResetDate: Date.now(),
            dailyMissions: [],
            fixedMissions: [],
            stakeLockEnd: null,
            lotteryAttempts: null,
            walletAddress: null,
            lotteryWinnings: 0
        };
        this.allMissions = [];
        this.fixedMissions = [];
        this.missions = [];
        this.currentPage = 'home';
        this.currentMission = null;
        this.nextMissionReset = null;
        this.minuteYieldRate = 300 / (365 * 24 * 60) / 100;
        this.secondYieldRate = this.minuteYieldRate / 60;
        this.yieldInterval = null;
        this.uiYieldInterval = null;
        this.z = null; // Substitua pelo endereço real do token DET
        this.initializeSolanaConnection();
        this.initializeCentralWallet();
    }

    initializeSolanaConnection() {
        console.log('Inicializando conexão com Solana...');
        if (typeof solanaWeb3 === 'undefined') {
            console.error('Biblioteca @solana/web3.js não carregada');
            this.showToast('Biblioteca Solana não encontrada. Algumas funcionalidades estão desativadas.', 'error');
            return;
        }
        const endpoints = [
            'https://api.mainnet-beta.solana.com',
            'https://api.devnet.solana.com',
            'https://api.testnet.solana.com'
        ];
        for (const endpoint of endpoints) {
            try {
                this.connection = new solanaWeb3.Connection(endpoint, 'confirmed');
                console.log(`Conexão estabelecida com ${endpoint}`);
                return;
            } catch (error) {
                console.error(`Erro ao conectar com ${endpoint}:`, error);
            }
        }
        console.warn('Não foi possível conectar à rede Solana. Continuando sem conexão blockchain.');
        this.showToast('Falha ao conectar à rede Solana. Transações serão simuladas.', 'warning');
    }

    initializeCentralWallet() {
        console.log('Inicializando carteira central...');
        if (this.CENTRAL_WALLET_KEY) {
            try {
                this.centralWalletKeypair = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(this.CENTRAL_WALLET_KEY));
                console.log('Carteira central inicializada:', this.centralWalletKeypair.publicKey.toString());
            } catch (error) {
                console.error('Erro ao inicializar carteira central:', error);
                this.showToast('Erro ao configurar carteira central. Saques serão simulados.', 'error');
            }
        } else {
            console.warn('Chave da carteira central não fornecida. Saques serão simulados.');
            this.showToast('Carteira central não configurada. Saques serão simulados.', 'warning');
        }
    }

    diagnosePhantom() {
        console.log('Diagnóstico da Phantom Wallet:');
        console.log('window.solana existe:', !!window.solana);
        console.log('window.solana.isPhantom:', window.solana?.isPhantom);
        console.log('Navegador seguro (HTTPS):', window.isSecureContext);
        console.log('Modo anônimo detectado:', window.navigator.userAgent.includes('Private Browsing'));
        console.log('User Agent:', navigator.userAgent);
    }

    async init() {
        console.log('Inicializando DetHabitsApp...');
        try {
            this.diagnosePhantom();
            this.loadUserData();
            await this.loadAllMissions();
            this.selectDailyMissions();
            this.loadMissions();
            this.startMissionTimer();
            this.updateUI();
            this.setupEventListeners();
            this.startBackupInterval();
            const phantomAvailable = await this.waitForPhantom(20000);
            if (phantomAvailable) {
                console.log('Phantom Wallet detectada. Configurando listeners...');
                window.solana.on('connect', () => {
                    console.log('Evento connect disparado');
                    this.wallet = window.solana.publicKey?.toString();
                    if (this.wallet) {
                        this.userData.walletAddress = this.wallet;
                        this.onWalletConnected();
                    } else {
                        console.error('Endereço da carteira não obtido');
                        this.showToast('Erro ao obter endereço da carteira.', 'error');
                    }
                });
                window.solana.on('disconnect', () => {
                    console.log('Evento disconnect disparado');
                    this.disconnectWallet();
                });
                await this.connectWallet(false, 3);
            } else {
                console.warn('Phantom Wallet não detectada após timeout');
                this.showToast('Instale ou desbloqueie a Phantom Wallet.', 'error');
                if (window.isSecureContext === false) {
                    this.showToast('Use HTTPS ou localhost para conexões seguras.', 'error');
                }
                if (window.navigator.userAgent.includes('Private Browsing')) {
                    this.showToast('Modo anônimo detectado. Desative para usar a Phantom.', 'error');
                }
            }
        } catch (error) {
            console.error('Erro durante inicialização:', error);
            this.showToast('Erro ao inicializar a aplicação. Verifique o console.', 'error');
        }
    }

    async waitForPhantom(timeout) {
        console.log('Aguardando Phantom Wallet...');
        const start = Date.now();
        while (!window.solana || !window.solana.isPhantom) {
            if (Date.now() - start >= timeout) {
                console.warn('Timeout aguardando Phantom Wallet');
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('Phantom Wallet detectada em', Date.now() - start, 'ms');
        return true;
    }

    async connectWallet(onlyIfTrusted = false, retries = 3) {
        console.log(`Tentando conectar carteira (onlyIfTrusted: ${onlyIfTrusted}, retries: ${retries})...`);
        this.showLoading('Conectando à Phantom Wallet...');
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        try {
            if (!window.solana || !window.solana.isPhantom) {
                throw new Error('Carteira Phantom não detectada.');
            }
            const response = await window.solana.connect({ onlyIfTrusted });
            this.wallet = response.publicKey.toString();
            this.userData.walletAddress = this.wallet;
            console.log('Carteira conectada:', this.wallet);
            this.onWalletConnected();
        } catch (error) {
            console.error('Erro ao conectar:', error);
            if (error.code === 4001) {
                this.showToast('Você rejeitou a conexão com a carteira.', 'error');
                return;
            }
            if (retries > 0) {
                console.log(`Tentando novamente (${retries - 1} tentativas restantes)...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return await this.connectWallet(false, retries - 1);
            }
            if (isMobile) {
                const appUrl = encodeURIComponent('https://daniloalmeid.github.io/DetHabits-Solana/');
                const deepLink = `phantom://open?dapp_url=${appUrl}&connect=true`;
                console.log('Redirecionando para:', deepLink);
                this.showToast('Abra no navegador interno do Phantom.', 'info');
                window.location.href = deepLink;
                await new Promise(resolve => setTimeout(resolve, 10000));
                if (window.solana && window.solana.isPhantom) {
                    await this.connectWallet(false, 1);
                } else {
                    this.showToast('Falha ao detectar Phantom. Use o navegador interno do aplicativo.', 'error');
                }
            } else {
                this.showToast('Instale a extensão Phantom ou verifique se está desbloqueada.', 'error');
                window.open('https://phantom.app/', '_blank');
            }
        } finally {
            this.hideLoading();
        }
    }

    onWalletConnected() {
        console.log('Carteira conectada com sucesso:', this.wallet);
        const today = this.getCurrentDate();
        if (!this.userData.lotteryAttempts || this.userData.lotteryAttempts.date !== today) {
            this.userData.lotteryAttempts = {
                date: today,
                attempts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 }
            };
        }
        this.showToast('Carteira conectada com sucesso!', 'success');
        const homePage = document.getElementById('home-page');
        const navbar = document.getElementById('navbar');
        if (homePage) homePage.style.display = 'none';
        if (navbar) navbar.style.display = 'block';
        this.loadUserData();
        this.selectDailyMissions();
        this.loadMissions();
        this.navigateTo('missions');
        this.updateWalletDisplay();
        this.updateUI();
        this.initStaking();
    }

    async withdrawToWallet(destinationAddress, amount) {
        console.log('Iniciando saque:', { destinationAddress, amount });
        try {
            if (!this.wallet) throw new Error('Carteira do usuário não conectada.');
            if (!this.connection) throw new Error('Conexão com Solana não estabelecida.');
            if (typeof splToken === 'undefined') throw new Error('Biblioteca @solana/spl-token não carregada.');
            if (!this.TOKEN_PROGRAM_ID) throw new Error('Endereço do token DET não configurado.');
            if (!this.centralWalletKeypair) throw new Error('Carteira central não configurada. Saque será simulado.');

            amount = parseFloat(amount.toFixed(5));
            if (isNaN(amount) || amount < 800) throw new Error('Mínimo de 800 DET para saque.');
            if (amount > (this.userData.totalBalance || 0)) throw new Error(`Saldo insuficiente: ${this.userData.totalBalance.toFixed(5)} DET.`);

            const destinationPubkey = new solanaWeb3.PublicKey(destinationAddress);
            const centralPubkey = this.centralWalletKeypair.publicKey;

            this.showLoading('Processando saque...');

            // Verificar saldo da carteira central
            const centralTokenAccount = await this.getOrCreateAssociatedTokenAccount(centralPubkey);
            const centralBalance = await this.connection.getTokenAccountBalance(centralTokenAccount);
            const centralBalanceValue = centralBalance.value.uiAmount;
            if (centralBalanceValue < amount) {
                throw new Error(`Carteira central tem saldo insuficiente: ${centralBalanceValue.toFixed(5)} DET.`);
            }

            // Criar conta de token para o destinatário, se necessário
            const destinationTokenAccount = await this.getOrCreateAssociatedTokenAccount(destinationPubkey);

            // Criar transação de transferência
            const transaction = new solanaWeb3.Transaction().add(
                splToken.createTransferInstruction(
                    centralTokenAccount,
                    destinationTokenAccount,
                    centralPubkey,
                    Math.round(amount * 1e9), // Assumindo 9 decimais para o token DET
                    []
                )
            );

            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = centralPubkey;

            // Assinar com a carteira central
            transaction.sign(this.centralWalletKeypair);

            // Enviar transação
            const signature = await this.connection.sendRawTransaction(transaction.serialize());
            await this.connection.confirmTransaction(signature, 'confirmed');

            // Atualizar saldos e registrar transação
            this.userData.totalBalance -= amount;
            this.addTransaction('withdraw', `Saque para ${destinationAddress.slice(0, 4)}...${destinationAddress.slice(-4)}: ${amount.toFixed(5)} DET`, -amount);
            this.saveUserData();
            this.updateUI();
            this.showToast(`Saque de ${amount.toFixed(5)} DET concluído!`, 'success');
            return signature;
        } catch (error) {
            console.error('Erro no saque:', error);
            this.showToast(error.message || 'Erro ao processar saque.', 'error');
            // Fallback local para simulação
            if (amount >= 800 && amount <= (this.userData.totalBalance || 0)) {
                this.userData.totalBalance -= amount;
                this.addTransaction('withdraw', `Saque simulado: ${amount.toFixed(5)} DET`, -amount);
                this.saveUserData();
                this.updateUI();
                this.showToast(`Saque simulado de ${amount.toFixed(5)} DET registrado localmente.`, 'warning');
            }
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    async getOrCreateAssociatedTokenAccount(pubkey) {
        try {
            if (!this.TOKEN_PROGRAM_ID) throw new Error('Endereço do token DET não configurado.');
            const associatedTokenAddress = await splToken.getAssociatedTokenAddress(
                this.TOKEN_PROGRAM_ID,
                pubkey
            );
            const accountInfo = await this.connection.getAccountInfo(associatedTokenAddress);
            if (!accountInfo) {
                const transaction = new solanaWeb3.Transaction().add(
                    splToken.createAssociatedTokenAccountInstruction(
                        this.centralWalletKeypair ? this.centralWalletKeypair.publicKey : pubkey,
                        associatedTokenAddress,
                        pubkey,
                        this.TOKEN_PROGRAM_ID
                    )
                );
                const { blockhash } = await this.connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = this.centralWalletKeypair ? this.centralWalletKeypair.publicKey : pubkey;
                if (this.centralWalletKeypair) {
                    transaction.sign(this.centralWalletKeypair);
                } else {
                    const signedTransaction = await window.solana.signTransaction(transaction);
                    const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
                    await this.connection.confirmTransaction(signature, 'confirmed');
                }
            }
            return associatedTokenAddress;
        } catch (error) {
            console.error('Erro ao criar/obter conta de token:', error);
            throw new Error('Falha ao configurar conta de token.');
        }
    }

    loadUserData() {
        console.log('Carregando dados do usuário...');
        try {
            const savedData = localStorage.getItem(`dethabits_${this.wallet || 'default'}`);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                const lastMissionResetDate = Number(parsedData.lastMissionResetDate) || Date.now();
                this.userData = {
                    ...this.userData,
                    ...parsedData,
                    totalBalance: parsedData.totalBalance !== undefined ? parsedData.totalBalance : 294,
                    stakeBalance: parsedData.stakeBalance || 0,
                    voluntaryStakeBalance: parsedData.voluntaryStakeBalance || 0,
                    fractionalYieldObligatory: parsedData.fractionalYieldObligatory || 0,
                    fractionalYieldVoluntary: parsedData.fractionalYieldVoluntary || 0,
                    dailyYieldObligatoryAccumulated: parsedData.dailyYieldObligatoryAccumulated || 0,
                    dailyYieldVoluntaryAccumulated: parsedData.dailyYieldVoluntaryAccumulated || 0,
                    lastYieldUpdateTime: parsedData.lastYieldUpdateTime || Date.now(),
                    lastYieldResetDate: parsedData.lastYieldResetDate || new Date().toISOString(),
                    spendingBalance: parsedData.spendingBalance || 0,
                    completedMissions: Array.isArray(parsedData.completedMissions) ? parsedData.completedMissions : [],
                    transactions: Array.isArray(parsedData.transactions) ? parsedData.transactions : [],
                    dailyMissions: Array.isArray(parsedData.dailyMissions) ? parsedData.dailyMissions : [],
                    fixedMissions: Array.isArray(parsedData.fixedMissions) ? parsedData.fixedMissions : [],
                    stakeLockEnd: parsedData.stakeLockEnd || null,
                    lastMissionResetDate: isNaN(lastMissionResetDate) ? Date.now() : lastMissionResetDate,
                    lotteryAttempts: parsedData.lotteryAttempts || null,
                    lotteryWinnings: parsedData.lotteryWinnings || 0,
                    walletAddress: parsedData.walletAddress || null
                };
                if (!this.userData.lotteryAttempts) {
                    const today = this.getCurrentDate();
                    this.userData.lotteryAttempts = {
                        date: today,
                        attempts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 }
                    };
                }
                this.missions = this.userData.dailyMissions.map(mission => ({
                    ...mission,
                    completed: this.userData.completedMissions.some(cm => cm.id === mission.id)
                }));
                console.log('Dados do usuário carregados:', this.userData);
            } else {
                console.log('Nenhum dado no localStorage, usando padrão');
                const today = this.getCurrentDate();
                this.userData.lastMissionResetDate = Date.now();
                this.userData.dailyMissions = [];
                this.userData.lotteryAttempts = {
                    date: today,
                    attempts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 }
                };
                this.userData.lotteryWinnings = 0;
                this.missions = [];
            }
            this.saveUserData();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showToast('Erro ao carregar dados do usuário.', 'error');
            const today = this.getCurrentDate();
            this.userData.lastMissionResetDate = Date.now();
            this.userData.dailyMissions = [];
            this.userData.lotteryAttempts = {
                date: today,
                attempts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 }
            };
            this.userData.lotteryWinnings = 0;
            this.missions = [];
            this.saveUserData();
        }
    }

    getCurrentDate() {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    selectDailyMissions(forceReset = false) {
        console.log('Selecionando missões diárias...');
        const now = new Date();
        const brasiliaOffset = -3 * 60 * 60 * 1000;
        const nowBrasilia = new Date(now.getTime() + brasiliaOffset);
        const today21hBrasilia = new Date(nowBrasilia);
        today21hBrasilia.setHours(21, 0, 0, 0);
        if (nowBrasilia >= today21hBrasilia) {
            today21hBrasilia.setDate(today21hBrasilia.getDate() + 1);
        }
        const nextResetTime = today21hBrasilia.getTime() - brasiliaOffset;
        const timeSinceLastReset = now.getTime() - this.userData.lastMissionResetDate;

        const areMissionsValid = this.userData.dailyMissions.length > 0 &&
            this.userData.dailyMissions.every(mission =>
                mission.id && this.allMissions.some(am => am.id === mission.id)
            );

        if (forceReset || timeSinceLastReset >= (24 * 60 * 60 * 1000) || !areMissionsValid) {
            console.log('Resetando missões diárias');
            if (this.allMissions.length === 0) {
                console.warn('Nenhuma missão diária disponível');
                this.showToast('Nenhuma missão diária disponível.', 'error');
                return;
            }
            this.userData.completedMissions = this.userData.completedMissions.filter(cm => 
                this.fixedMissions.some(fm => fm.id === cm.id)
            );
            const shuffledMissions = [...this.allMissions].sort(() => Math.random() - 0.5);
            this.missions = shuffledMissions.slice(0, 5).map(mission => ({
                ...mission,
                reward: this.applyVipBonus(mission.reward),
                completed: false
            }));
            this.userData.dailyMissions = this.missions;
            this.userData.lastMissionResetDate = Date.now();
            this.nextMissionReset = nextResetTime;
            this.userData.lotteryAttempts = {
                date: this.getCurrentDate(),
                attempts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 }
            };
            this.saveUserData();
            console.log('Novas missões diárias:', this.missions);
            this.showToast('Novas missões diárias disponíveis!', 'success');
        } else {
            console.log('Carregando missões existentes');
            this.missions = this.userData.dailyMissions.map(mission => ({
                ...mission,
                completed: this.userData.completedMissions.some(cm => cm.id === mission.id)
            }));
            this.nextMissionReset = nextResetTime;
        }
    }

    startMissionTimer() {
        console.log('Iniciando temporizador de missões');
        if (!this.nextMissionReset || isNaN(this.nextMissionReset)) {
            const now = new Date();
            const brasiliaOffset = -3 * 60 * 60 * 1000;
            const nowBrasilia = new Date(now.getTime() + brasiliaOffset);
            const nextReset = new Date(nowBrasilia);
            nextReset.setHours(21, 0, 0, 0);
            if (nowBrasilia >= nextReset) {
                nextReset.setDate(nextReset.getDate() + 1);
            }
            this.nextMissionReset = nextReset.getTime() - brasiliaOffset;
            if (isNaN(this.nextMissionReset)) {
                console.warn('nextMissionReset inválido');
                this.nextMissionReset = now.getTime() + 24 * 60 * 60 * 1000;
                this.userData.lastMissionResetDate = Date.now();
                this.saveUserData();
            }
        }

        const updateTimer = () => {
            const now = new Date();
            const brasiliaOffset = -3 * 60 * 60 * 1000;
            const nowBrasilia = new Date(now.getTime() + brasiliaOffset);
            const today21hBrasilia = new Date(nowBrasilia);
            today21hBrasilia.setHours(21, 0, 0, 0);
            if (nowBrasilia >= today21hBrasilia) {
                today21hBrasilia.setDate(today21hBrasilia.getDate() + 1);
            }
            this.nextMissionReset = today21hBrasilia.getTime() - brasiliaOffset;

            const diff = this.nextMissionReset - now.getTime();

            if (diff <= 0 || (now.getTime() - this.userData.lastMissionResetDate) >= (24 * 60 * 60 * 1000)) {
                console.log('Resetando missões diárias');
                this.selectDailyMissions(true);
                this.loadMissions();
                this.updateMissionProgress();
                this.userData.lastMissionResetDate = Date.now();
                this.saveUserData();
                this.showToast('Missões diárias resetadas!', 'success');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            const missionTimer = document.getElementById('mission-timer');
            if (missionTimer) {
                missionTimer.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    loadMissions() {
        console.log('Carregando missões na UI...');
        const missionsGrid = document.getElementById('missions-grid');
        const fixedMissionsGrid = document.getElementById('fixed-missions-grid');
        if (!missionsGrid || !fixedMissionsGrid) {
            console.warn('Elementos missions-grid ou fixed-missions-grid não encontrados');
            this.showToast('Erro ao carregar elementos da UI.', 'error');
            return;
        }

        missionsGrid.innerHTML = '';
        this.missions.forEach(mission => {
            const isCompleted = this.userData.completedMissions.some(cm => cm.id === mission.id);
            const missionCard = document.createElement('div');
            missionCard.className = `mission-card ${isCompleted ? 'completed' : ''}`;
            missionCard.innerHTML = `
                <div class="mission-header">
                    <span class="mission-icon">${mission.icon || '🏆'}</span>
                    <span class="mission-reward">+${mission.reward} DET</span>
                </div>
                <h3 class="mission-title">${mission.title}</h3>
                <p class="mission-description">${mission.description}</p>
                ${mission.link ? `<a href="${mission.link}" class="mission-link" target="_blank">Acesse aqui</a>` : ''}
                <button class="mission-button ${isCompleted ? 'completed' : 'pending'}" data-mission-id="${mission.id}" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? 'Concluída' : 'Enviar Prova'}
                </button>
            `;
            missionsGrid.appendChild(missionCard);
        });

        fixedMissionsGrid.innerHTML = '';
        this.fixedMissions.forEach(mission => {
            const isCompleted = this.userData.completedMissions.some(cm => cm.id === mission.id);
            const missionCard = document.createElement('div');
            missionCard.className = `mission-card ${isCompleted ? 'completed' : ''}`;
            missionCard.innerHTML = `
                <div class="mission-header">
                    <span class="mission-icon">${mission.icon || '🏆'}</span>
                    <span class="mission-reward">+${mission.reward} DET</span>
                </div>
                <h3 class="mission-title">${mission.title}</h3>
                <p class="mission-description">${mission.description}</p>
                ${mission.link ? `<a href="${mission.link}" class="mission-link" target="_blank">Acesse aqui</a>` : ''}
                <button class="mission-button ${isCompleted ? 'completed' : 'pending'}" data-mission-id="${mission.id}" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? 'Concluída' : 'Enviar Prova'}
                </button>
            `;
            fixedMissionsGrid.appendChild(missionCard);
        });
    }

    openMissionModal(missionId) {
        console.log('Abrindo modal para missão:', missionId);
        const mission = this.missions.find(m => m.id === missionId) || this.fixedMissions.find(m => m.id === missionId);
        if (!mission) {
            console.error('Missão não encontrada:', missionId);
            this.showToast('Missão não encontrada.', 'error');
            return;
        }
        this.currentMission = { ...mission };
        const modal = document.getElementById('photo-modal');
        const modalTitle = document.getElementById('modal-mission-title');
        if (modal && modalTitle) {
            modalTitle.textContent = mission.title;
            modal.classList.add('active');
        } else {
            console.warn('Elementos photo-modal ou modal-mission-title não encontrados');
            this.showToast('Erro ao abrir modal.', 'error');
        }
    }

    submitMission() {
        if (!this.currentMission) {
            console.error('Nenhuma missão selecionada');
            this.showToast('Erro: Nenhuma missão selecionada.', 'error');
            return;
        }
        console.log('Enviando missão:', this.currentMission.id);
        try {
            const reward = this.currentMission.reward;
            const totalBalanceReward = reward * 0.8;
            const stakeBalanceReward = reward * 0.1;
            const spendingBalanceReward = reward * 0.1;

            this.userData.totalBalance = (this.userData.totalBalance || 0) + totalBalanceReward;
            this.userData.stakeBalance = (this.userData.stakeBalance || 0) + stakeBalanceReward;
            this.userData.spendingBalance = (this.userData.spendingBalance || 0) + spendingBalanceReward;

            if (!this.userData.stakeLockEnd && stakeBalanceReward > 0) {
                const lockEnd = new Date();
                lockEnd.setDate(lockEnd.getDate() + 90);
                this.userData.stakeLockEnd = lockEnd.toISOString();
            }

            this.userData.completedMissions.push({ id: this.currentMission.id, completedAt: new Date().toISOString() });
            this.addTransaction('mission', `Missão Concluída: ${this.currentMission.title} (+${reward} DET)`, reward);
            
            const missionIndex = this.missions.findIndex(m => m.id === this.currentMission.id);
            if (missionIndex !== -1) {
                this.missions[missionIndex].completed = true;
                this.userData.dailyMissions[missionIndex].completed = true;
            }

            this.saveUserData();
            this.loadMissions();
            this.updateMissionProgress();
            this.updateUI();
            this.closeModal();
            this.showToast(
                `Missão "${this.currentMission.title}" concluída! Ganhos: ${totalBalanceReward.toFixed(5)} DET (Total), ${stakeBalanceReward.toFixed(5)} DET (Stake), ${spendingBalanceReward.toFixed(5)} DET (Gastos)`,
                'success'
            );
        } catch (error) {
            console.error('Erro ao enviar missão:', error);
            this.showToast('Erro ao enviar missão.', 'error');
        }
    }

    transferLotteryWinningsToTotal(amount) {
        console.log('Transferindo ganhos de sorteios:', amount);
        try {
            amount = parseFloat(amount.toFixed(5));
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Quantidade inválida.');
            }
            if (amount > (this.userData.lotteryWinnings || 0)) {
                throw new Error(`Ganhos insuficientes: ${(this.userData.lotteryWinnings || 0).toFixed(5)} DET.`);
            }
            if (amount > (this.userData.spendingBalance || 0)) {
                throw new Error(`Saldo de gastos insuficiente: ${(this.userData.spendingBalance || 0).toFixed(5)} DET.`);
            }
            this.userData.spendingBalance -= amount;
            this.userData.totalBalance = (this.userData.totalBalance || 0) + amount;
            this.userData.lotteryWinnings = (this.userData.lotteryWinnings || 0) - amount;
            this.addTransaction('transfer', `Transferência de Ganhos: ${amount.toFixed(5)} DET`, amount);
            this.saveUserData();
            this.updateUI();
            this.showToast(`Transferidos ${amount.toFixed(5)} DET para Saldo Total.`, 'success');
            return amount;
        } catch (error) {
            console.error('Erro ao transferir ganhos:', error);
            this.showToast(error.message, 'error');
            throw error;
        }
    }

    initStaking() {
        console.log('Inicializando staking...');
        try {
            this.updateYieldsSinceLastUpdate();
            if (this.yieldInterval) clearInterval(this.yieldInterval);
            if (this.uiYieldInterval) clearInterval(this.uiYieldInterval);
            this.yieldInterval = setInterval(() => this.updateYields(), 60000);
            this.uiYieldInterval = setInterval(() => this.updateYieldsUI(), 1000);
        } catch (error) {
            console.error('Erro ao inicializar staking:', error);
            this.showToast('Erro ao inicializar staking.', 'error');
        }
    }

    updateYieldsSinceLastUpdate() {
        console.log('Atualizando rendimentos pendentes');
        try {
            if (!this.wallet) {
                console.warn('Carteira não conectada');
                return;
            }
            const now = Date.now();
            const lastUpdate = this.userData.lastYieldUpdateTime || now;
            const minutesElapsed = (now - lastUpdate) / (1000 * 60);

            if (minutesElapsed > 0) {
                const obligatoryYield = (this.userData.stakeBalance || 0) * this.minuteYieldRate * minutesElapsed;
                const voluntaryYield = (this.userData.voluntaryStakeBalance || 0) * this.minuteYieldRate * minutesElapsed;

                this.userData.fractionalYieldObligatory += obligatoryYield;
                this.userData.fractionalYieldVoluntary += voluntaryYield;

                const obligatoryWhole = Math.floor(this.userData.fractionalYieldObligatory);
                const voluntaryWhole = Math.floor(this.userData.fractionalYieldVoluntary);

                if (obligatoryWhole >= 1) {
                    this.userData.stakeBalance += obligatoryWhole;
                    this.userData.fractionalYieldObligatory -= obligatoryWhole;
                    this.userData.dailyYieldObligatoryAccumulated += obligatoryWhole;
                    this.addTransaction('yield', `Rendimento Obrigatório: +${obligatoryWhole.toFixed(5)} DET`, obligatoryWhole);
                }

                if (voluntaryWhole >= 1) {
                    this.userData.voluntaryStakeBalance += voluntaryWhole;
                    this.userData.fractionalYieldVoluntary -= voluntaryWhole;
                    this.userData.dailyYieldVoluntaryAccumulated += voluntaryWhole;
                    this.addTransaction('yield', `Rendimento Voluntário: +${voluntaryWhole.toFixed(5)} DET`, voluntaryWhole);
                }

                this.userData.lastYieldUpdateTime = now;
                this.saveUserData();
            }
        } catch (error) {
            console.error('Erro ao atualizar rendimentos:', error);
            this.showToast('Erro ao atualizar rendimentos.', 'error');
        }
    }

    updateYields() {
        console.log('Atualizando rendimentos');
        try {
            if (!this.wallet) {
                console.warn('Carteira não conectada');
                return;
            }
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            if (this.userData.lastYieldResetDate !== today) {
                this.transferFractionalYields();
                this.userData.lastYieldResetDate = today;
                this.showToast('Rendimentos fracionários transferidos!', 'success');
            }

            const obligatoryYield = (this.userData.stakeBalance || 0) * this.minuteYieldRate;
            const voluntaryYield = (this.userData.voluntaryStakeBalance || 0) * this.minuteYieldRate;

            this.userData.fractionalYieldObligatory += obligatoryYield;
            this.userData.fractionalYieldVoluntary += voluntaryYield;

            const obligatoryWhole = Math.floor(this.userData.fractionalYieldObligatory);
            const voluntaryWhole = Math.floor(this.userData.fractionalYieldVoluntary);

            if (obligatoryWhole >= 1) {
                this.userData.stakeBalance += obligatoryWhole;
                this.userData.fractionalYieldObligatory -= obligatoryWhole;
                this.userData.dailyYieldObligatoryAccumulated += obligatoryWhole;
                this.addTransaction('yield', `Rendimento Obrigatório: +${obligatoryWhole.toFixed(5)} DET`, obligatoryWhole);
                this.showToast(`+${obligatoryWhole.toFixed(5)} DET no stake obrigatório!`, 'success');
            }

            if (voluntaryWhole >= 1) {
                this.userData.voluntaryStakeBalance += voluntaryWhole;
                this.userData.fractionalYieldVoluntary -= voluntaryWhole;
                this.userData.dailyYieldVoluntaryAccumulated += voluntaryWhole;
                this.addTransaction('yield', `Rendimento Voluntário: +${voluntaryWhole.toFixed(5)} DET`, voluntaryWhole);
                this.showToast(`+${voluntaryWhole.toFixed(5)} DET no stake voluntário!`, 'success');
            }

            this.userData.lastYieldUpdateTime = Date.now();
            this.updateStakeLockTimer();
            this.saveUserData();
            this.updateUI();
        } catch (error) {
            console.error('Erro ao atualizar rendimentos:', error);
            this.showToast('Erro ao atualizar rendimentos.', 'error');
        }
    }

    updateYieldsUI() {
        try {
            if (!this.wallet) return;
            const obligatoryYield = (this.userData.stakeBalance || 0) * this.secondYieldRate;
            const voluntaryYield = (this.userData.voluntaryStakeBalance || 0) * this.secondYieldRate;

            const dailyYieldElement = document.getElementById('daily-yield');
            if (dailyYieldElement) {
                dailyYieldElement.textContent = `+${((this.userData.dailyYieldObligatoryAccumulated || 0) + this.userData.fractionalYieldObligatory + obligatoryYield).toFixed(5)} DET`;
            }

            const dailyYieldVoluntaryElement = document.getElementById('daily-yield-voluntary');
            if (dailyYieldVoluntaryElement) {
                dailyYieldVoluntaryElement.textContent = `+${((this.userData.dailyYieldVoluntaryAccumulated || 0) + this.userData.fractionalYieldVoluntary + voluntaryYield).toFixed(5)} DET`;
            }
        } catch (error) {
            console.error('Erro ao atualizar UI de rendimentos:', error);
            this.showToast('Erro ao atualizar rendimentos na interface.', 'error');
        }
    }

    transferFractionalYields() {
        console.log('Transferindo rendimentos fracionários');
        try {
            const obligatoryYield = Math.floor(this.userData.fractionalYieldObligatory || 0);
            const voluntaryYield = Math.floor(this.userData.fractionalYieldVoluntary || 0);

            if (obligatoryYield >= 1) {
                this.userData.stakeBalance += obligatoryYield;
                this.userData.fractionalYieldObligatory -= obligatoryYield;
                this.userData.dailyYieldObligatoryAccumulated += obligatoryYield;
                this.addTransaction('yield', `Rendimento Obrigatório Acumulado: +${obligatoryYield.toFixed(5)} DET`, obligatoryYield);
            }

            if (voluntaryYield >= 1) {
                this.userData.voluntaryStakeBalance += voluntaryYield;
                this.userData.fractionalYieldVoluntary -= voluntaryYield;
                this.userData.dailyYieldVoluntaryAccumulated += voluntaryYield;
                this.addTransaction('yield', `Rendimento Voluntário Acumulado: +${voluntaryYield.toFixed(5)} DET`, voluntaryYield);
            }

            this.userData.fractionalYieldObligatory = (this.userData.fractionalYieldObligatory || 0) % 1;
            this.userData.fractionalYieldVoluntary = (this.userData.fractionalYieldVoluntary || 0) % 1;
            this.saveUserData();
        } catch (error) {
            console.error('Erro ao transferir rendimentos:', error);
            this.showToast('Erro ao transferir rendimentos.', 'error');
        }
    }

    stakeVoluntary(amount) {
        console.log('Realizando stake voluntário:', amount);
        try {
            amount = parseFloat(amount.toFixed(5));
            if (isNaN(amount) || amount <= 0) throw new Error('Quantidade inválida.');
            if (amount > 10000) throw new Error('Máximo de 10.000 DET por transação.');
            if ((this.userData.totalBalance || 0) < amount) throw new Error(`Saldo insuficiente: ${(this.userData.totalBalance || 0).toFixed(5)} DET.`);
            this.userData.totalBalance -= amount;
            this.userData.voluntaryStakeBalance += amount;
            this.addTransaction('stake', `Stake Voluntário: ${amount.toFixed(5)} DET`, amount);
            this.saveUserData();
            this.updateUI();
            this.showToast(`Stake de ${amount.toFixed(5)} DET realizado!`, 'success');
            return amount;
        } catch (error) {
            console.error('Erro ao realizar stake:', error);
            throw error;
        }
    }

    unstakeVoluntaryPartial(amount) {
        console.log('Retirando parcialmente do stake voluntário:', amount);
        try {
            amount = parseFloat(amount.toFixed(5));
            if (isNaN(amount) || amount <= 0) throw new Error('Quantidade inválida.');
            if ((this.userData.voluntaryStakeBalance || 0) < amount) throw new Error(`Stake insuficiente: ${(this.userData.voluntaryStakeBalance || 0).toFixed(5)} DET.`);
            const totalStake = this.userData.voluntaryStakeBalance;
            const proportion = amount / totalStake;
            const yieldAmount = (this.userData.fractionalYieldVoluntary || 0) * proportion;
            this.userData.voluntaryStakeBalance -= amount;
            this.userData.fractionalYieldVoluntary -= yieldAmount;
            this.userData.totalBalance += amount + yieldAmount;
            this.addTransaction('unstake', `Retirada Parcial: ${(amount + yieldAmount).toFixed(5)} DET`, amount + yieldAmount);
            this.saveUserData();
            this.updateUI();
            this.showToast(`Retirada de ${(amount + yieldAmount).toFixed(5)} DET realizada!`, 'success');
            return amount + yieldAmount;
        } catch (error) {
            console.error('Erro ao retirar stake:', error);
            throw error;
        }
    }

    withdrawMaxObligatory() {
        console.log('Retirando máximo do stake obrigatório');
        try {
            const now = new Date();
            if (this.userData.stakeLockEnd && new Date(this.userData.stakeLockEnd) > now) {
                const remainingDays = Math.ceil((new Date(this.userData.stakeLockEnd) - now) / (1000 * 60 * 60 * 24));
                throw new Error(`Stake bloqueado por mais ${remainingDays} dias.`);
            }
            const amount = this.userData.stakeBalance || 0;
            if (amount <= 0) throw new Error('Nenhum valor disponível em stake obrigatório.');
            const yieldAmount = (this.userData.fractionalYieldObligatory || 0) + (this.userData.dailyYieldObligatoryAccumulated || 0);
            this.userData.stakeBalance = 0;
            this.userData.fractionalYieldObligatory = 0;
            this.userData.dailyYieldObligatoryAccumulated = 0;
            this.userData.stakeLockEnd = null;
            this.userData.totalBalance += amount + yieldAmount;
            this.addTransaction('unstake', `Retirada de Stake Obrigatório: ${(amount + yieldAmount).toFixed(5)} DET`, amount + yieldAmount);
            this.saveUserData();
            this.updateUI();
            this.showToast(`Retirada de ${(amount + yieldAmount).toFixed(5)} DET realizada!`, 'success');
            return amount + yieldAmount;
        } catch (error) {
            console.error('Erro ao retirar stake:', error);
            throw error;
        }
    }

    withdrawMaxVoluntary() {
        console.log('Retirando máximo do stake voluntário');
        try {
            const amount = this.userData.voluntaryStakeBalance || 0;
            if (amount <= 0) throw new Error('Nenhum valor disponível em stake voluntário.');
            const yieldAmount = (this.userData.fractionalYieldVoluntary || 0) + (this.userData.dailyYieldVoluntaryAccumulated || 0);
            this.userData.voluntaryStakeBalance = 0;
            this.userData.fractionalYieldVoluntary = 0;
            this.userData.dailyYieldVoluntaryAccumulated = 0;
            this.userData.totalBalance += amount + yieldAmount;
            this.addTransaction('unstake', `Retirada Máxima: ${(amount + yieldAmount).toFixed(5)} DET`, amount + yieldAmount);
            this.saveUserData();
            this.updateUI();
            this.showToast(`Retirada de ${(amount + yieldAmount).toFixed(5)} DET realizada!`, 'success');
            return amount + yieldAmount;
        } catch (error) {
            console.error('Erro ao retirar stake:', error);
            throw error;
        }
    }

    updateStakeLockTimer() {
        const stakeTimeLeftElement = document.getElementById('stake-time-left');
        if (!stakeTimeLeftElement) return;
        if (!this.userData.stakeLockEnd) {
            stakeTimeLeftElement.textContent = 'Nenhum stake bloqueado';
            return;
        }
        const now = new Date();
        const lockEnd = new Date(this.userData.stakeLockEnd);
        const diff = lockEnd - now;
        if (diff <= 0) {
            stakeTimeLeftElement.textContent = 'Desbloqueado';
        } else {
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            stakeTimeLeftElement.textContent = `Bloqueado por mais ${days} dia${days > 1 ? 's' : ''}`;
        }
    }

    disconnectWallet() {
        console.log('Desconectando carteira...');
        if (window.solana && window.solana.isPhantom) {
            try {
                window.solana.disconnect();
                console.log('Carteira desconectada');
            } catch (error) {
                console.error('Erro ao desconectar:', error);
            }
        }
        this.saveUserData();
        this.wallet = null;
        this.userData = {
            totalBalance: 294,
            stakeBalance: 0,
            voluntaryStakeBalance: 0,
            fractionalYieldObligatory: 0,
            fractionalYieldVoluntary: 0,
            dailyYieldObligatoryAccumulated: 0,
            dailyYieldVoluntaryAccumulated: 0,
            lastYieldUpdateTime: Date.now(),
            lastYieldResetDate: new Date().toISOString(),
            spendingBalance: 0,
            completedMissions: [],
            transactions: [],
            lastMissionResetDate: Date.now(),
            dailyMissions: [],
            fixedMissions: [],
            stakeLockEnd: null,
            lotteryAttempts: null,
            walletAddress: null,
            lotteryWinnings: 0
        };
        this.missions = [];
        const homePage = document.getElementById('home-page');
        const navbar = document.getElementById('navbar');
        if (homePage) homePage.style.display = 'block';
        if (navbar) navbar.style.display = 'none';
        this.navigateTo('home');
        this.showToast('Carteira desconectada!', 'success');
        this.updateUI();
    }

    updateWalletDisplay() {
        const walletAddressElement = document.getElementById('wallet-address');
        const walletAddressFullElement = document.getElementById('wallet-address-full');
        if (walletAddressElement) {
            walletAddressElement.textContent = this.wallet 
                ? `${this.wallet.substring(0, 4)}...${this.wallet.substring(this.wallet.length - 4)}` 
                : 'Não conectado';
        }
        if (walletAddressFullElement) {
            walletAddressFullElement.textContent = this.wallet || 'Não conectado';
        }
    }

    async loadAllMissions() {
        console.log('Carregando missões...');
        try {
            const response = await fetch('missions.json');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const data = await response.json();
            this.allMissions = data.dailyMissions || [];
            this.fixedMissions = (data.fixedMissions || []).map(mission => ({
                ...mission,
                completed: this.userData.completedMissions.some(cm => cm.id === mission.id)
            }));
            this.userData.fixedMissions = data.fixedMissions || [];
            this.detectFixedMissionChanges(this.userData.fixedMissions);
            this.saveUserData();
        } catch (error) {
            console.error('Erro ao carregar missões:', error);
            this.showToast('Erro ao carregar missões. Usando padrão.', 'error');
            this.allMissions = [
                { id: 'water_1', title: 'Beber 1 Copo de Água', description: 'Hidrate-se.', icon: '💧', reward: 7, completed: false },
                { id: 'walk_1', title: 'Caminhar 5 Minutos', description: 'Caminhe.', icon: '🚶', reward: 7, completed: false },
                { id: 'meditation_1', title: 'Meditar 3 Minutos', description: 'Medite.', icon: '🧘', reward: 7, completed: false },
                { id: 'nap_1', title: 'Soneca de 15 Minutos', description: 'Descanse.', icon: '😴', reward: 7, completed: false },
                { id: 'stretch_1', title: 'Alongar 2 Minutos', description: 'Alongue-se.', icon: '🤸', reward: 7, completed: false }
            ];
            this.fixedMissions = [];
            this.userData.fixedMissions = [];
            this.detectFixedMissionChanges(this.fixedMissions);
            this.saveUserData();
        }
    }

    detectFixedMissionChanges(newFixedMissions) {
        console.log('Detectando alterações nas missões fixas...');
        try {
            const oldFixedMissions = this.userData.fixedMissions || [];
            const newMissionIds = newFixedMissions.map(m => m.id);
            const oldMissionIds = oldFixedMissions.map(m => m.id);
            const changedMissions = oldMissionIds.filter(id => !newMissionIds.includes(id));
            if (changedMissions.length > 0) {
                this.userData.completedMissions = this.userData.completedMissions.filter(cm => !changedMissions.includes(cm.id));
                this.showToast('Missões fixas alteradas. Status resetado.', 'info');
            }
            newFixedMissions.forEach(newMission => {
                const oldMission = oldFixedMissions.find(m => m.id === newMission.id);
                if (oldMission && (oldMission.title !== newMission.title || oldMission.description !== newMission.description || oldMission.reward !== newMission.reward)) {
                    this.userData.completedMissions = this.userData.completedMissions.filter(cm => cm.id !== newMission.id);
                    this.showToast(`Missão fixa "${newMission.title}" alterada!`, 'success');
                }
            });
            this.saveUserData();
        } catch (error) {
            console.error('Erro ao detectar alterações:', error);
            this.showToast('Erro ao verificar missões fixas.', 'error');
        }
    }

    applyVipBonus(reward) {
        const totalStaked = (this.userData.stakeBalance || 0) + (this.userData.voluntaryStakeBalance || 0);
        let bonus = 1;
        if (totalStaked >= 500 && totalStaked <= 4999) bonus = 1.05;
        else if (totalStaked >= 5000 && totalStaked <= 49999) bonus = 1.15;
        else if (totalStaked >= 50000 && totalStaked <= 100000) bonus = 1.25;
        return Math.ceil(reward * bonus);
    }

    updateMissionProgress() {
        const completedCount = this.userData.completedMissions.filter(cm => 
            this.missions.some(m => m.id === cm.id)
        ).length;
        const progress = this.missions.length > 0 ? (completedCount / this.missions.length) * 100 : 0;
        const progressBar = document.getElementById('daily-progress');
        const completedMissions = document.getElementById('completed-missions');
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (completedMissions) completedMissions.textContent = `${completedCount}/${this.missions.length}`;
    }

    saveUserData() {
        try {
            localStorage.setItem(`dethabits_${this.wallet || 'default'}`, JSON.stringify(this.userData));
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.showToast('Erro ao salvar dados.', 'error');
        }
    }

    startBackupInterval() {
        setInterval(() => {
            if (this.wallet) this.saveUserData();
        }, 5 * 60 * 1000);
    }

    updateUI() {
        try {
            this.updateWalletPage();
            this.updateShopPage();
            this.updateMissionProgress();
            this.updateStakeLockTimer();
            this.updateWalletDisplay();
            this.updateTransactionHistory();
        } catch (error) {
            console.error('Erro ao atualizar UI:', error);
            this.showToast('Erro ao atualizar interface.', 'error');
        }
    }

    updateWalletPage() {
        const totalBalanceElement = document.getElementById('total-balance');
        const stakeBalanceElement = document.getElementById('stake-balance');
        const voluntaryStakeBalanceElement = document.getElementById('voluntary-stake-balance');
        const spendingBalanceElement = document.getElementById('spending-balance');
        const lotteryWinningsElement = document.getElementById('lottery-winnings');
        const withdrawBtn = document.getElementById('withdraw-btn');
        const withdrawMaxObligatoryBtn = document.getElementById('withdraw-max-obligatory-btn');
        const withdrawMaxVoluntaryBtn = document.getElementById('withdraw-max-voluntary-btn');
        const transferLotteryBtn = document.getElementById('transfer-lottery-btn');

        if (totalBalanceElement) totalBalanceElement.textContent = (this.userData.totalBalance || 0).toFixed(5);
        if (stakeBalanceElement) stakeBalanceElement.textContent = (this.userData.stakeBalance || 0).toFixed(5);
        if (voluntaryStakeBalanceElement) voluntaryStakeBalanceElement.textContent = (this.userData.voluntaryStakeBalance || 0).toFixed(5);
        if (spendingBalanceElement) spendingBalanceElement.textContent = (this.userData.spendingBalance || 0).toFixed(5);
        if (lotteryWinningsElement) lotteryWinningsElement.textContent = (this.userData.lotteryWinnings || 0).toFixed(5);
        if (withdrawBtn) withdrawBtn.disabled = (this.userData.totalBalance || 0) < 800 || !this.wallet || !this.connection;
        if (withdrawMaxObligatoryBtn) {
            const now = new Date();
            withdrawMaxObligatoryBtn.disabled = !this.userData.stakeBalance || (this.userData.stakeLockEnd && new Date(this.userData.stakeLockEnd) > now);
        }
        if (withdrawMaxVoluntaryBtn) withdrawMaxVoluntaryBtn.disabled = !this.userData.voluntaryStakeBalance;
        if (transferLotteryBtn) transferLotteryBtn.disabled = (this.userData.lotteryWinnings || 0) <= 0;
    }

    updateShopPage() {
        const shopBalanceElement = document.getElementById('shop-balance');
        if (shopBalanceElement) shopBalanceElement.textContent = (this.userData.spendingBalance || 0).toFixed(5) + ' DET';
    }

    updateTransactionHistory() {
        const historyList = document.getElementById('transaction-history');
        if (!historyList) return;
        historyList.innerHTML = '';
        this.userData.transactions.slice(-10).reverse().forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            const amountClass = transaction.amount >= 0 ? 'positive' : 'negative';
            transactionItem.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-icon">${this.getTransactionIcon(transaction.type)}</span>
                    <div class="transaction-details">
                        <h4>${transaction.description}</h4>
                        <p>${new Date(transaction.timestamp).toLocaleString()}</p>
                    </div>
                </div>
                <span class="transaction-amount ${amountClass}">${transaction.amount.toFixed(5)} DET</span>
            `;
            historyList.appendChild(transactionItem);
        });
    }

    getTransactionIcon(type) {
        switch (type) {
            case 'mission': return '🏆';
            case 'stake': return '🔒';
            case 'unstake': return '🔓';
            case 'yield': return '💸';
            case 'purchase': return '🛒';
            case 'lottery': return '🎰';
            case 'transfer': return '➡️';
            case 'withdraw': return '💸';
            default: return '💰';
        }
    }

    addTransaction(type, description, amount) {
        this.userData.transactions.push({
            type,
            description,
            amount,
            timestamp: new Date().toISOString()
        });
    }

    navigateTo(page) {
        this.currentPage = page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
        const pageElement = document.getElementById(`${page}-page`);
        const navButton = document.querySelector(`.nav-button[data-page="${page}"]`);
        if (pageElement) pageElement.classList.add('active');
        if (navButton) navButton.classList.add('active');
        if (page === 'missions') {
            this.loadMissions();
            this.updateMissionProgress();
        }
        if (page === 'wallet') this.updateWalletPage();
        if (page === 'shop') this.updateShopPage();
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.warn('Container de toast não encontrado');
            alert(`${type.toUpperCase()}: ${message}`);
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    showLoading(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    closeModal() {
        const modal = document.getElementById('photo-modal');
        if (modal) modal.classList.remove('active');
        const photoInput = document.getElementById('photo-input');
        const photoPreview = document.getElementById('photo-preview');
        if (photoInput) photoInput.value = '';
        if (photoPreview) photoPreview.innerHTML = '';
        this.currentMission = null;
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', () => {
                this.navigateTo(button.dataset.page);
                const navLinks = document.querySelector('.nav-links');
                if (navLinks) navLinks.classList.remove('mobile-active');
            });
        });

        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                const navLinks = document.querySelector('.nav-links');
                if (navLinks) navLinks.classList.toggle('mobile-active');
            });
        }

        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        if (connectWalletBtn) {
            connectWalletBtn.addEventListener('click', () => {
                console.log('Botão de conexão clicado');
                this.diagnosePhantom();
                this.connectWallet(false);
            });
        }

        const disconnectBtn = document.getElementById('disconnect-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnectWallet());
        }

        const copyUrlBtn = document.getElementById('copy-url-btn');
        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', () => {
                const appUrl = document.getElementById('app-url');
                if (appUrl) {
                    navigator.clipboard.writeText(appUrl.textContent)
                        .then(() => this.showToast('URL copiada!', 'success'))
                        .catch(() => this.showToast('Erro ao copiar URL.', 'error'));
                }
            });
        }

        const presaleBtn = document.getElementById('presale-btn');
        if (presaleBtn) {
            presaleBtn.addEventListener('click', () => this.navigateTo('presale'));
        }

        const copyPresaleWalletBtn = document.getElementById('copy-presale-wallet-btn');
        if (copyPresaleWalletBtn) {
            copyPresaleWalletBtn.addEventListener('click', () => {
                const presaleWallet = document.getElementById('presale-wallet');
                if (presaleWallet) {
                    navigator.clipboard.writeText(presaleWallet.textContent)
                        .then(() => this.showToast('Carteira copiada!', 'success'))
                        .catch(() => this.showToast('Erro ao copiar carteira.', 'error'));
                }
            });
        }

        const solAmountInput = document.getElementById('sol-amount');
        const detAmountInput = document.getElementById('det-amount');
        if (solAmountInput && detAmountInput) {
            solAmountInput.addEventListener('input', () => {
                const sol = parseFloat(solAmountInput.value) || 0;
                detAmountInput.value = (sol * 150 / 0.02).toFixed(5);
            });
        }

        const buyPresaleBtn = document.getElementById('buy-presale-btn');
        if (buyPresaleBtn) {
            buyPresaleBtn.addEventListener('click', () => {
                if (!detAmountInput) return;
                const detAmount = parseFloat(detAmountInput.value);
                if (detAmount < 500 || detAmount > 100000) {
                    this.showToast('Quantidade deve estar entre 500 e 100.000 DET.', 'error');
                    return;
                }
                this.userData.totalBalance += detAmount;
                this.addTransaction('presale', `Compra na Pré-venda: +${detAmount.toFixed(5)} DET`, detAmount);
                this.saveUserData();
                this.updateUI();
                this.showToast(`Compra de ${detAmount.toFixed(5)} DET realizada!`, 'success');
            });
        }

        const withdrawBtn = document.getElementById('withdraw-btn');
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', () => {
                const amountInput = document.getElementById('withdraw-amount-input');
                const addressInput = document.getElementById('withdraw-address-input');
                if (amountInput && addressInput) {
                    try {
                        this.withdrawToWallet(addressInput.value, parseFloat(amountInput.value));
                    } catch (error) {
                        console.error('Erro no saque:', error);
                        this.showToast(error.message, 'error');
                    }
                } else {
                    this.showToast('Campos de saque não encontrados.', 'error');
                }
            });
        }

        const stakeVoluntaryBtn = document.getElementById('stake-voluntary-btn');
        if (stakeVoluntaryBtn) {
            stakeVoluntaryBtn.addEventListener('click', () => {
                const stakeAmountInput = document.getElementById('stake-amount-input');
                if (!stakeAmountInput) {
                    this.showToast('Campo de stake não encontrado.', 'error');
                    return;
                }
                const amount = parseFloat(stakeAmountInput.value);
                try {
                    this.stakeVoluntary(amount);
                    stakeAmountInput.value = '';
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        }

        const unstakeVoluntaryBtn = document.getElementById('unstake-voluntary-btn');
        if (unstakeVoluntaryBtn) {
            unstakeVoluntaryBtn.addEventListener('click', () => {
                const unstakeAmountInput = document.getElementById('unstake-amount-input');
                if (!unstakeAmountInput) {
                    this.showToast('Campo de retirada não encontrado.', 'error');
                    return;
                }
                const amount = parseFloat(unstakeAmountInput.value);
                try {
                    this.unstakeVoluntaryPartial(amount);
                    unstakeAmountInput.value = '';
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        }

        const withdrawMaxVoluntaryBtn = document.getElementById('withdraw-max-voluntary-btn');
        if (withdrawMaxVoluntaryBtn) {
            withdrawMaxVoluntaryBtn.addEventListener('click', () => {
                try {
                    this.withdrawMaxVoluntary();
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        }

        const withdrawMaxObligatoryBtn = document.getElementById('withdraw-max-obligatory-btn');
        if (withdrawMaxObligatoryBtn) {
            withdrawMaxObligatoryBtn.addEventListener('click', () => {
                try {
                    this.withdrawMaxObligatory();
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        }

        const transferLotteryBtn = document.getElementById('transfer-lottery-btn');
        if (transferLotteryBtn) {
            transferLotteryBtn.replaceWith(transferLotteryBtn.cloneNode(true));
            const newTransferLotteryBtn = document.getElementById('transfer-lottery-btn');
            const transferAmountInput = document.getElementById('transfer-amount-input');
            if (transferAmountInput) {
                newTransferLotteryBtn.addEventListener('click', () => {
                    const amount = parseFloat(transferAmountInput.value);
                    if (amount && amount > 0) {
                        try {
                            this.transferLotteryWinningsToTotal(amount);
                            transferAmountInput.value = '';
                        } catch (error) {
                            this.showToast(error.message, 'error');
                        }
                    } else {
                        this.showToast('Insira uma quantidade válida.', 'error');
                    }
                });
            }
        }

        const missionsGrid = document.getElementById('missions-grid');
        if (missionsGrid) {
            missionsGrid.addEventListener('click', e => {
                const button = e.target.closest('.mission-button');
                if (button && !button.disabled) {
                    this.openMissionModal(button.dataset.missionId);
                }
            });
        }

        const fixedMissionsGrid = document.getElementById('fixed-missions-grid');
        if (fixedMissionsGrid) {
            fixedMissionsGrid.addEventListener('click', e => {
                const button = e.target.closest('.mission-button');
                if (button && !button.disabled) {
                    this.openMissionModal(button.dataset.missionId);
                }
            });
        }

        const photoInput = document.getElementById('photo-input');
        const photoPreview = document.getElementById('photo-preview');
        const submitMissionBtn = document.getElementById('submit-mission-btn');
        if (photoInput && photoPreview && submitMissionBtn) {
            photoInput.addEventListener('change', () => {
                if (photoInput.files && photoInput.files[0]) {
                    const reader = new FileReader();
                    reader.onload = e => {
                        photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                        submitMissionBtn.disabled = false;
                    };
                    reader.readAsDataURL(photoInput.files[0]);
                }
            });
        }

        if (submitMissionBtn) {
            submitMissionBtn.addEventListener('click', () => this.submitMission());
        }

        const closeModalBtn = document.getElementById('close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }

        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const category = button.dataset.category;
                const shopItems = document.querySelectorAll('.shop-item');
                shopItems.forEach(item => {
                    if (category === 'all' || item.dataset.category === category) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });

        const shopGrid = document.querySelector('.shop-grid');
        if (shopGrid) {
            shopGrid.addEventListener('click', e => {
                if (e.target.classList.contains('buy-btn')) {
                    const item = e.target.closest('.shop-item');
                    if (!item) return;
                    const priceElement = item.querySelector('.item-price');
                    if (!priceElement) return;
                    const price = parseFloat(priceElement.textContent);
                    if ((this.userData.spendingBalance || 0) < price) {
                        this.showToast('Saldo insuficiente para comprar este item.', 'error');
                        return;
                    }
                    const itemName = item.querySelector('h4')?.textContent || 'Item';
                    this.userData.spendingBalance -= price;
                    this.userData.lotteryWinnings = Math.max(0, (this.userData.lotteryWinnings || 0) - price);
                    this.addTransaction('purchase', `Compra: ${itemName} (-${price.toFixed(5)} DET)`, -price);
                    this.saveUserData();
                    this.updateUI();
                    this.showToast('Item comprado com sucesso!', 'success');
                }
            });
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando app...');
    window.app = new DetHabitsApp();
    window.app.init();
});