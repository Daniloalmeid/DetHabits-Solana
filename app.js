class DetHabitsApp {
    constructor() {
        console.log('Construindo DetHabitsApp...');
        this.wallet = null;
        this.userData = {
            totalBalance: 26, // Saldo inicial de 26 DET
            stakeBalance: 0,
            voluntaryStakeBalance: 0,
            fractionalYieldObligatory: 0,
            fractionalYieldVoluntary: 0,
            dailyYieldObligatoryAccumulated: 0,
            dailyYieldVoluntaryAccumulated: 0,
            lastYieldResetDate: new Date().toDateString(),
            spendingBalance: 0,
            completedMissions: [],
            transactions: [],
            lastMissionResetDate: new Date().toDateString(),
            dailyMissions: [],
            fixedMissions: []
        };
        this.allMissions = [];
        this.fixedMissions = [];
        this.missions = [];
        this.lastMissionResetDate = new Date().toDateString();
        this.currentPage = 'home';
        this.currentMission = null;
        this.nextMissionReset = null;
        this.minuteYieldRate = 300 / (365 * 24 * 60) / 100; // Taxa de rendimento de 300% ao ano
        this.yieldInterval = null;
    }async init() {
    console.log('Inicializando DetHabitsApp...');
    try {
        await this.loadAllMissions();
        this.loadUserData();
        this.selectDailyMissions();
        this.setupEventListeners();
        this.startMissionTimer();
        this.startYieldUpdater();
        this.loadMissions();
        this.updateUI();
        this.startBackupInterval();
        // Tenta reconectar automaticamente
        if (window.solana && window.solana.isPhantom) {
            console.log('Tentando reconexão automática com Phantom...');
            await this.connectWallet(true);
        }
    } catch (error) {
        console.error('Erro durante inicialização:', error);
        this.showToast('Erro ao inicializar a aplicação. Verifique o console.', 'error');
    }
}

// --- Staking Logic ---
startYieldUpdater() {
    console.log('Iniciando atualizador de rendimentos');
    if (this.yieldInterval) {
        clearInterval(this.yieldInterval);
    }
    this.resetDailyYields();
    this.yieldInterval = setInterval(() => {
        this.updateYields();
    }, 60000); // Atualiza a cada minuto
}

updateYields() {
    console.log('Atualizando rendimentos');
    const now = new Date();
    const today = now.toDateString();

    if ((this.userData.lastYieldResetDate || '') !== today) {
        console.log('Resetando rendimentos diários');
        this.resetDailyYields();
        this.userData.lastYieldResetDate = today;
    }

    const obligatoryYield = (this.userData.stakeBalance || 0) * this.minuteYieldRate;
    const voluntaryYield = (this.userData.voluntaryStakeBalance || 0) * this.minuteYieldRate;

    this.userData.fractionalYieldObligatory = (this.userData.fractionalYieldObligatory || 0) + obligatoryYield;
    this.userData.fractionalYieldVoluntary = (this.userData.fractionalYieldVoluntary || 0) + voluntaryYield;

    const obligatoryWhole = Math.floor(this.userData.fractionalYieldObligatory);
    const voluntaryWhole = Math.floor(this.userData.fractionalYieldVoluntary);

    if (obligatoryWhole >= 1) {
        this.userData.dailyYieldObligatoryAccumulated = (this.userData.dailyYieldObligatoryAccumulated || 0) + obligatoryWhole;
        this.userData.fractionalYieldObligatory -= obligatoryWhole;
    }

    if (voluntaryWhole >= 1) {
        this.userData.dailyYieldVoluntaryAccumulated = (this.userData.dailyYieldVoluntaryAccumulated || 0) + voluntaryWhole;
        this.userData.fractionalYieldVoluntary -= voluntaryWhole;
    }

    this.saveUserData();
    this.updateUI();
    console.log('Rendimentos atualizados:', {
        obligatory: this.userData.dailyYieldObligatoryAccumulated,
        voluntary: this.userData.dailyYieldVoluntaryAccumulated
    });
}

resetDailyYields() {
    console.log('Resetando rendimentos diários');
    const obligatoryYield = Math.floor(this.userData.fractionalYieldObligatory || 0);
    const voluntaryYield = Math.floor(this.userData.fractionalYieldVoluntary || 0);

    if (obligatoryYield >= 1) {
        this.userData.stakeBalance = (this.userData.stakeBalance || 0) + obligatoryYield;
        this.userData.fractionalYieldObligatory -= obligatoryYield;
    }

    if (voluntaryYield >= 1) {
        this.userData.voluntaryStakeBalance = (this.userData.voluntaryStakeBalance || 0) + voluntaryYield;
        this.userData.fractionalYieldVoluntary -= voluntaryYield;
    }

    this.userData.dailyYieldObligatoryAccumulated = 0;
    this.userData.dailyYieldVoluntaryAccumulated = 0;
    this.userData.fractionalYieldObligatory = 0;
    this.userData.fractionalYieldVoluntary = 0;
    this.saveUserData();
}

stakeVoluntary(amount) {
    console.log('Tentando realizar stake voluntário:', amount);
    if (!Number.isInteger(amount) || amount <= 0) {
        console.error('Quantidade inválida para stake:', amount);
        throw new Error('Por favor, insira uma quantidade válida (número inteiro positivo).');
    }
    if ((this.userData.totalBalance || 0) < amount) {
        console.error('Saldo insuficiente para stake:', {
            totalBalance: this.userData.totalBalance,
            amount
        });
        throw new Error(`Saldo insuficiente. Você tem ${this.userData.totalBalance || 0} DET, mas tentou fazer stake de ${amount} DET.`);
    }
    this.userData.totalBalance -= amount;
    this.userData.voluntaryStakeBalance = (this.userData.voluntaryStakeBalance || 0) + amount;
    this.addTransaction('stake', `Stake Voluntário: ${amount} DET`, amount);
    this.saveUserData();
    this.updateUI();
    console.log('Stake voluntário realizado:', amount);
    return amount;
}

unstakeVoluntary() {
    console.log('Tentando retirar stake voluntário');
    const amount = this.userData.voluntaryStakeBalance || 0;
    if (amount <= 0) {
        console.error('Nenhum valor em stake voluntário para retirar');
        throw new Error('Nenhum valor disponível em stake voluntário para retirada.');
    }
    const yield = Math.floor(this.userData.fractionalYieldVoluntary || 0);
    this.userData.voluntaryStakeBalance = 0;
    this.userData.fractionalYieldVoluntary = 0;
    this.userData.dailyYieldVoluntaryAccumulated = 0;
    this.userData.totalBalance = (this.userData.totalBalance || 0) + amount + yield;
    this.addTransaction('unstake', `Retirada de Stake Voluntário: ${amount + yield} DET`, amount + yield);
    this.saveUserData();
    this.updateUI();
    console.log('Stake voluntário retirado:', amount + yield);
    return amount + yield;
}

withdrawMaxObligatory() {
    console.log('Tentando retirar máximo do stake obrigatório');
    const amount = this.userData.stakeBalance || 0;
    if (amount <= 0) {
        console.error('Nenhum valor em stake obrigatório para retirar');
        throw new Error('Nenhum valor disponível em stake obrigatório para retirada.');
    }
    const yield = Math.floor(this.userData.fractionalYieldObligatory || 0);
    this.userData.stakeBalance = 0;
    this.userData.fractionalYieldObligatory = 0;
    this.userData.dailyYieldObligatoryAccumulated = 0;
    this.userData.totalBalance = (this.userData.totalBalance || 0) + amount + yield;
    this.addTransaction('unstake', `Retirada de Stake Obrigatório: ${amount + yield} DET`, amount + yield);
    this.saveUserData();
    this.updateUI();
    console.log('Stake obrigatório retirado:', amount + yield);
    return amount + yield;
}

withdrawMaxVoluntary() {
    console.log('Retirando máximo do stake voluntário');
    return this.unstakeVoluntary();
}

// --- Wallet Connection ---
async connectWallet(onlyIfTrusted = false) {
    console.log(`Tentando conectar carteira (onlyIfTrusted: ${onlyIfTrusted})...`);
    this.showLoading('Conectando carteira...');
    try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Ambiente detectado:', isMobile ? 'Mobile' : 'Desktop');

        if (!window.solana || !window.solana.isPhantom) {
            console.warn('Phantom Wallet não detectado.');
            this.hideLoading();
            if (isMobile) {
                this.showToast(
                    'Abra esta URL no navegador interno do Phantom: https://daniloalmeid.github.io/DetHabits-Solana/',
                    'info'
                );
                const redirectUrl = encodeURIComponent('https://daniloalmeid.github.io/DetHabits-Solana/');
                const deepLink = `phantom://connect?app_url=${redirectUrl}&dapp_name=DetHabits`;
                console.log('Redirecionando para deep link:', deepLink);
                window.location.href = deepLink;
                // Aguarda redirecionamento e tenta reconectar
                setTimeout(async () => {
                    if (window.solana && window.solana.isPhantom) {
                        console.log('Phantom detectado após redirecionamento, tentando conectar...');
                        await this.connectWallet(onlyIfTrusted);
                    }
                }, 3000);
            } else {
                this.showToast('Por favor, instale a extensão Phantom no seu navegador.', 'error');
            }
            return;
        }

        console.log('Conectando com Phantom Wallet...');
        const response = await window.solana.connect({ onlyIfTrusted });
        this.wallet = response.publicKey.toString();
        console.log('Carteira conectada:', this.wallet);
        this.showToast('Carteira conectada com sucesso!', 'success');

        // Atualiza interface após conexão
        const homePage = document.getElementById('home-page');
        if (homePage) {
            homePage.style.display = 'none';
        } else {
            console.warn('Elemento home-page não encontrado');
        }
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.style.display = 'block';
        } else {
            console.warn('Elemento navbar não encontrado');
        }
        this.navigateTo('missions');
        this.loadUserData();
        this.updateWalletDisplay();
        this.updateUI();
    } catch (error) {
        console.error('Erro ao conectar carteira:', error);
        if (error.code === 4001) {
            this.showToast('Conexão rejeitada pelo usuário.', 'error');
        } else {
            this.showToast(
                'Erro ao conectar carteira. No celular, abra esta URL no navegador interno do Phantom: https://daniloalmeid.github.io/DetHabits-Solana/',
                'error'
            );
        }
    } finally {
        this.hideLoading();
    }
}

disconnectWallet() {
    console.log('Desconectando carteira...');
    if (window.solana && window.solana.isPhantom) {
        try {
            window.solana.disconnect();
            console.log('Carteira desconectada via Phantom API');
        } catch (error) {
            console.error('Erro ao desconectar carteira:', error);
        }
    }
    this.saveUserData();
    this.wallet = null;
    const homePage = document.getElementById('home-page');
    const navbar = document.getElementById('navbar');
    if (homePage) homePage.style.display = 'block';
    if (navbar) navbar.style.display = 'none';
    this.navigateTo('home');
    this.showToast('Carteira desconectada', 'success');
    this.updateUI();
}

updateWalletDisplay() {
    if (!this.wallet) {
        console.log('Nenhuma carteira conectada, pulando atualização de display');
        return;
    }
    console.log('Atualizando display da carteira:', this.wallet);
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.style.display = 'block';
    const walletAddressElement = document.getElementById('wallet-address');
    if (walletAddressElement) {
        walletAddressElement.textContent =
            `${this.wallet.substring(0, 4)}...${this.wallet.substring(this.wallet.length - 4)}`;
    } else {
        console.warn('Elemento wallet-address não encontrado');
    }
    const walletAddressFullElement = document.getElementById('wallet-address-full');
    if (walletAddressFullElement) {
        walletAddressFullElement.textContent = this.wallet;
    } else {
        console.warn('Elemento wallet-address-full não encontrado');
    }
}

// --- Missions Logic ---
async loadAllMissions() {
    console.log('Carregando missões do missions.json...');
    try {
        const response = await fetch('missions.json');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data = await response.json();
        this.allMissions = data.dailyMissions || [];
        this.fixedMissions = data.fixedMissions || [];
        console.log('Missões diárias carregadas:', this.allMissions.length);
        console.log('Missões fixas carregadas:', this.fixedMissions.length);
    } catch (error) {
        console.error('Erro ao carregar missões:', error);
        this.showToast('Erro ao carregar missões. Usando lista padrão.', 'error');
        this.allMissions = [
            {
                id: 'water_1',
                title: 'Beber 1 Copo de Água',
                description: 'Hidrate-se bebendo pelo menos um copo de água e comprove com uma foto.',
                icon: '',
                reward: 5,
                completed: false
            },
            {
                id: 'walk_1',
                title: 'Caminhar por 5 Minutos',
                description: 'Faça uma caminhada de pelo menos 5 minutos e registre o momento.',
                icon: '',
                reward: 5,
                completed: false
            },
            {
                id: 'meditation_1',
                title: 'Meditar por 3 Minutos',
                description: 'Dedique 3 minutos para meditação e tire uma selfie relaxante.',
                icon: '',
                reward: 5,
                completed: false
            },
            {
                id: 'nap_1',
                title: 'Tirar uma Soneca de 15 Minutos',
                description: 'Tire uma soneca de 15 minutos e comprove com uma foto do ambiente.',
                icon: '',
                reward: 5,
                completed: false
            },
            {
                id: 'stretch_1',
                title: 'Alongar o Corpo por 2 Minutos',
                description: 'Faça alongamentos por 2 minutos e envie uma foto ou vídeo.',
                icon: '',
                reward: 5,
                completed: false
            }
        ];
        this.fixedMissions = [];
        console.log('Usando missões diárias padrão:', this.allMissions);
    }
}

selectDailyMissions(forceReset = false) {
    console.log('Selecionando missões diárias...');
    const today = new Date().toDateString();

    if (forceReset || this.missions.length === 0 || this.lastMissionResetDate !== today) {
        console.log('Forçando reset ou novo dia detectado, selecionando novas missões diárias');
        if (this.allMissions.length === 0) {
            console.warn('Nenhuma missão diária disponível em allMissions');
            this.showToast('Nenhuma missão diária disponível. Tente novamente mais tarde.', 'error');
            return;
        }
        const shuffledMissions = [...this.allMissions].sort(() => Math.random() - 0.5);
        this.missions = shuffledMissions.slice(0, 5).map(mission => ({
            ...mission,
            completed: false
        }));
        this.lastMissionResetDate = today;
        this.userData.completedMissions = this.userData.completedMissions.filter(cm =>
            this.fixedMissions.some(fm => fm.id === cm.id)
        );
        this.userData.dailyMissions = this.missions;
        this.saveUserData();
        console.log('Novas missões diárias selecionadas:', this.missions);
        this.showToast('Novas missões diárias disponíveis!', 'success');
        this.nextMissionReset = new Date();
        this.nextMissionReset.setDate(this.nextMissionReset.getDate() + 1);
        this.nextMissionReset.setHours(0, 0, 0, 0);
        console.log('Próximo reset de missões:', this.nextMissionReset);
    } else {
        console.log('Missões diárias do dia já carregadas:', this.missions);
    }
}

startMissionTimer() {
    console.log('Iniciando temporizador de missões');
    if (!this.nextMissionReset) {
        this.nextMissionReset = new Date();
        this.nextMissionReset.setDate(this.nextMissionReset.getDate() + 1);
        this.nextMissionReset.setHours(0, 0, 0, 0);
        console.log('nextMissionReset inicializado:', this.nextMissionReset);
    }

    const updateTimer = () => {
        const now = new Date();
        const diff = this.nextMissionReset - now;
        console.log('Tempo até próximo reset (ms):', diff);

        if (diff <= 0) {
            console.log('Resetando missões diárias...');
            this.lastMissionResetDate = new Date().toDateString();
            this.selectDailyMissions(true);
            this.loadMissions();
            this.updateMissionProgress();
            this.nextMissionReset = new Date();
            this.nextMissionReset.setDate(this.nextMissionReset.getDate() + 1);
            this.nextMissionReset.setHours(0, 0, 0, 0);
            console.log('Novo próximo reset:', this.nextMissionReset);
            this.showToast('Missões diárias resetadas com sucesso!', 'success');
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        console.log(`Tempo formatado: ${hours}:${minutes}:${seconds}`);

        const missionTimer = document.getElementById('mission-timer');
        if (missionTimer) {
            missionTimer.textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            console.warn('Elemento mission-timer não encontrado no DOM');
        }
    };

    updateTimer();
    setInterval(updateTimer, 1000);
}

// --- UI Updates ---
updateUI() {
    console.log('Atualizando UI');
    if (this.currentPage === 'wallet') {
        this.updateWalletPage();
    } else if (this.currentPage === 'missions') {
        this.updateMissionsPage();
    } else if (this.currentPage === 'shop') {
        this.updateShopPage();
    }
}

updateWalletPage() {
    console.log('Atualizando página da carteira');
    const totalBalanceElement = document.getElementById('total-balance');
    if (totalBalanceElement) {
        totalBalanceElement.textContent = (this.userData.totalBalance || 0).toFixed(0);
    }
    const stakeBalanceElement = document.getElementById('stake-balance');
    if (stakeBalanceElement) {
        stakeBalanceElement.textContent = (this.userData.stakeBalance || 0).toFixed(0);
    }
    const voluntaryStakeBalanceElement = document.getElementById('voluntary-stake-balance');
    if (voluntaryStakeBalanceElement) {
        voluntaryStakeBalanceElement.textContent = (this.userData.voluntaryStakeBalance || 0).toFixed(0);
    }
    const dailyYieldElement = document.getElementById('daily-yield');
    if (dailyYieldElement) {
        const totalObligatoryYield = ((this.userData.dailyYieldObligatoryAccumulated || 0) + (this.userData.fractionalYieldObligatory || 0)).toFixed(5);
        dailyYieldElement.textContent = `+${totalObligatoryYield} DET`;
    }
    const dailyYieldVoluntaryElement = document.getElementById('daily-yield-voluntary');
    if (dailyYieldVoluntaryElement) {
        const totalVoluntaryYield = ((this.userData.dailyYieldVoluntaryAccumulated || 0) + (this.userData.fractionalYieldVoluntary || 0)).toFixed(5);
        dailyYieldVoluntaryElement.textContent = `+${totalVoluntaryYield} DET`;
    }
    const spendingBalanceElement = document.getElementById('spending-balance');
    if (spendingBalanceElement) {
        spendingBalanceElement.textContent = (this.userData.spendingBalance || 0).toFixed(0);
    }
    const withdrawMaxObligatoryButton = document.getElementById('withdraw-max-obligatory-btn');
    if (withdrawMaxObligatoryButton) {
        withdrawMaxObligatoryButton.disabled = (this.userData.stakeBalance || 0) <= 0;
    }
    const withdrawMaxVoluntaryButton = document.getElementById('withdraw-max-voluntary-btn');
    if (withdrawMaxVoluntaryButton) {
        withdrawMaxVoluntaryButton.disabled = (this.userData.voluntaryStakeBalance || 0) <= 0;
    }
    const unstakeVoluntaryButton = document.getElementById('unstake-voluntary-btn');
    if (unstakeVoluntaryButton) {
        unstakeVoluntaryButton.disabled = (this.userData.voluntaryStakeBalance || 0) <= 0;
    }
    const withdrawButton = document.getElementById('withdraw-btn');
    if (withdrawButton) {
        withdrawButton.disabled = (this.userData.totalBalance || 0) < 800;
    }
    this.loadTransactionHistory();
}

updateMissionsPage() {
    console.log('Atualizando página de missões');
    this.loadMissions();
    this.updateMissionProgress();
}

updateShopPage() {
    console.log('Atualizando página da loja');
    const shopBalance = document.getElementById('shop-balance');
    if (shopBalance) {
        shopBalance.textContent = `${(this.userData.spendingBalance || 0).toFixed(0)} DET`;
    }
}

loadTransactionHistory() {
    console.log('Carregando histórico de transações');
    const historyContainer = document.getElementById('transaction-history');
    if (!historyContainer) {
        console.warn('Elemento transaction-history não encontrado');
        return;
    }
    historyContainer.innerHTML = '';
    if (this.userData.transactions.length === 0) {
        historyContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma transação encontrada</p>';
        return;
    }
    this.userData.transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        const date = new Date(transaction.timestamp).toLocaleDateString('pt-BR');
        const time = new Date(transaction.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        item.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-icon ${transaction.type}">
                    ${transaction.type === 'stake' ? '' : transaction.type === 'unstake' ? '' : ''}
                </div>
                <div class="transaction-details">
                    <h4>${transaction.description}</h4>
                    <p>${date} às ${time}</p>
                </div>
            </div>
            <div class="transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                ${transaction.amount >= 0 ? '+' : ''}${transaction.amount} DET
            </div>
        `;
        historyContainer.appendChild(item);
    });
}

addTransaction(type, description, amount) {
    console.log('Adicionando transação:', type, description, amount);
    this.userData.transactions.unshift({
        id: Date.now(),
        type,
        description,
        amount,
        timestamp: new Date().toISOString()
    });
    if (this.userData.transactions.length > 50) {
        this.userData.transactions = this.userData.transactions.slice(0, 50);
    }
    this.saveUserData();
}

// --- Data Management ---
validateUserData(data) {
    if (!data) return false;
    return (
        typeof data.totalBalance === 'number' &&
        typeof data.stakeBalance === 'number' &&
        typeof data.voluntaryStakeBalance === 'number' &&
        typeof data.fractionalYieldObligatory === 'number' &&
        typeof data.fractionalYieldVoluntary === 'number' &&
        typeof data.dailyYieldObligatoryAccumulated === 'number' &&
        typeof data.dailyYieldVoluntaryAccumulated === 'number' &&
        typeof data.lastYieldResetDate === 'string' &&
        typeof data.spendingBalance === 'number' &&
        Array.isArray(data.completedMissions) &&
        Array.isArray(data.transactions) &&
        Array.isArray(data.dailyMissions) &&
        typeof data.lastMissionResetDate === 'string'
    );
}

loadUserData() {
    if (!this.wallet) {
        console.log('Nenhuma carteira conectada, pulando carregamento de dados');
        return;
    }
    console.log('Carregando dados do usuário para carteira:', this.wallet);
    const today = new Date().toDateString();
    const saved = localStorage.getItem(`dethabits_data_${this.wallet}`);
    let data;
    if (saved) {
        try {
            data = JSON.parse(saved);
            if (this.validateUserData(data)) {
                this.userData = {
                    totalBalance: Number(data.totalBalance) || 26,
                    stakeBalance: Number(data.stakeBalance) || 0,
                    voluntaryStakeBalance: Number(data.voluntaryStakeBalance) || 0,
                    fractionalYieldObligatory: Number(data.fractionalYieldObligatory) || 0,
                    fractionalYieldVoluntary: Number(data.fractionalYieldVoluntary) || 0,
                    dailyYieldObligatoryAccumulated: Number(data.dailyYieldObligatoryAccumulated) || 0,
                    dailyYieldVoluntaryAccumulated: Number(data.dailyYieldVoluntaryAccumulated) || 0,
                    lastYieldResetDate: data.lastYieldResetDate || today,
                    spendingBalance: Number(data.spendingBalance) || 0,
                    completedMissions: data.completedMissions || [],
                    transactions: data.transactions || [],
                    dailyMissions: data.dailyMissions || [],
                    lastMissionResetDate: data.lastMissionResetDate || today,
                    fixedMissions: data.fixedMissions || []
                };
                this.missions = this.userData.dailyMissions;
                this.resetDailyYields();
                console.log('Dados carregados com sucesso');
                return;
            } else {
                console.warn('Dados corrompidos, inicializando com valores padrão');
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }
    this.userData = {
        totalBalance: 26,
        stakeBalance: 0,
        voluntaryStakeBalance: 0,
        fractionalYieldObligatory: 0,
        fractionalYieldVoluntary: 0,
        dailyYieldObligatoryAccumulated: 0,
        dailyYieldVoluntaryAccumulated: 0,
        lastYieldResetDate: today,
        spendingBalance: 0,
        completedMissions: [],
        transactions: [],
        dailyMissions: [],
        lastMissionResetDate: today,
        fixedMissions: []
    };
    this.saveUserData();
    console.log('Dados inicializados com valores padrão');
}

saveUserData() {
    if (!this.wallet) {
        console.log('Nenhuma carteira conectada, pulando salvamento de dados');
        return;
    }
    console.log('Salvando dados do usuário para carteira:', this.wallet);
    try {
        if (this.validateUserData(this.userData)) {
            localStorage.setItem(`dethabits_data_${this.wallet}`, JSON.stringify(this.userData));
        } else {
            console.error('Dados inválidos, não salvando');
            this.showToast('Erro ao salvar dados.', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        this.showToast('Erro ao salvar dados.', 'error');
    }
}

startBackupInterval() {
    console.log('Iniciando intervalo de backup');
    setInterval(() => {
        this.saveUserData();
        console.log('Dados salvos automaticamente');
    }, 5 * 60 * 1000); // Backup a cada 5 minutos
}

// --- Navigation and Event Listeners ---
setupEventListeners() {
    console.log('Configurando event listeners...');
    const connectButton = document.getElementById('connect-wallet-btn');
    if (connectButton) {
        connectButton.addEventListener('click', () => this.connectWallet(false));
    } else {
        console.warn('Botão connect-wallet-btn não encontrado');
    }
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.addEventListener('click', (e) => this.navigateTo(e.target.dataset.page));
    });
    const disconnectButton = document.getElementById('disconnect-btn');
    if (disconnectButton) {
        disconnectButton.addEventListener('click', () => this.disconnectWallet());
    }
    const presaleButton = document.getElementById('presale-btn');
    if (presaleButton) {
        presaleButton.addEventListener('click', () => this.navigateTo('presale'));
    }
    const closeModalButton = document.getElementById('close-modal');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => this.closePhotoModal());
    }
    const photoInput = document.getElementById('photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => this.handlePhotoSelect(e));
    }
    const submitMissionButton = document.getElementById('submit-mission-btn');
    if (submitMissionButton) {
        submitMissionButton.addEventListener('click', () => this.completeMission());
    }
    const solAmountInput = document.getElementById('sol-amount');
    if (solAmountInput) {
        solAmountInput.addEventListener('input', (e) => this.updatePresaleCalculation(e));
    }
    const buyPresaleButton = document.getElementById('buy-presale-btn');
    if (buyPresaleButton) {
        buyPresaleButton.addEventListener('click', () => this.buyPresale());
    }
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.filterShopItems(e.target.dataset.category));
    });
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.buyItem(e));
    });
    const mobileMenuButton = document.getElementById('mobile-menu-btn');
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => this.toggleMobileMenu());
    }
    const photoModal = document.getElementById('photo-modal');
    if (photoModal) {
        photoModal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closePhotoModal();
            }
        });
    }
    const copyUrlButton = document.getElementById('copy-url-btn');
    if (copyUrlButton) {
        copyUrlButton.addEventListener('click', () => this.copyAppUrl());
    }
    const copyPresaleWalletButton = document.getElementById('copy-presale-wallet-btn');
    if (copyPresaleWalletButton) {
        copyPresaleWalletButton.addEventListener('click', () => this.copyPresaleWallet());
    }
    const stakeVoluntaryButton = document.getElementById('stake-voluntary-btn');
    if (stakeVoluntaryButton) {
        stakeVoluntaryButton.addEventListener('click', () => {
            const amountInput = document.getElementById('stake-amount-input');
            if (!amountInput) {
                console.error('Elemento stake-amount-input não encontrado');
                this.showToast('Erro: Campo de stake não encontrado.', 'error');
                return;
            }
            const amount = parseInt(amountInput.value);
            try {
                this.stakeVoluntary(amount);
                amountInput.value = '';
                this.showToast(`Stake voluntário de ${amount} DET realizado com sucesso!`, 'success');
            } catch (error) {
                console.error('Erro ao realizar stake voluntário:', error.message);
                this.showToast(error.message, 'error');
            }
        });
    } else {
        console.warn('Botão stake-voluntary-btn não encontrado');
    }
    const unstakeVoluntaryButton = document.getElementById('unstake-voluntary-btn');
    if (unstakeVoluntaryButton) {
        unstakeVoluntaryButton.addEventListener('click', () => {
            try {
                const amount = this.unstakeVoluntary();
                this.showToast(`Retirada de ${amount} DET do stake voluntário realizada com sucesso!`, 'success');
            } catch (error) {
                console.error('Erro ao retirar stake voluntário:', error.message);
                this.showToast(error.message, 'error');
            }
        });
    } else {
        console.warn('Botão unstake-voluntary-btn não encontrado');
    }
    const withdrawMaxObligatoryButton = document.getElementById('withdraw-max-obligatory-btn');
    if (withdrawMaxObligatoryButton) {
        withdrawMaxObligatoryButton.addEventListener('click', () => {
            try {
                const amount = this.withdrawMaxObligatory();
                this.showToast(`Retirada de ${amount} DET do stake obrigatório realizada com sucesso!`, 'success');
            } catch (error) {
                console.error('Erro ao retirar stake obrigatório:', error.message);
                this.showToast(error.message, 'error');
            }
        });
    } else {
        console.warn('Botão withdraw-max-obligatory-btn não encontrado');
    }
    const withdrawMaxVoluntaryButton = document.getElementById('withdraw-max-voluntary-btn');
    if (withdrawMaxVoluntaryButton) {
        withdrawMaxVoluntaryButton.addEventListener('click', () => {
            try {
                const amount = this.withdrawMaxVoluntary();
                this.showToast(`Retirada de ${amount} DET do stake voluntário realizada com sucesso!`, 'success');
            } catch (error) {
                console.error('Erro ao retirar stake voluntário:', error.message);
                this.showToast(error.message, 'error');
            }
        });
    } else {
        console.warn('Botão withdraw-max-voluntary-btn não encontrado');
    }
}

// --- Shop and Presale Logic ---
copyAppUrl() {
    const appUrl = document.getElementById('app-url');
    if (!appUrl) {
        console.warn('Elemento app-url não encontrado');
        this.showToast('Erro ao copiar a URL.', 'error');
        return;
    }
    navigator.clipboard.writeText(appUrl.textContent).then(() => {
        this.showToast('URL copiada para a área de transferência!', 'success');
    }).catch(() => {
        this.showToast('Erro ao copiar a URL.', 'error');
    });
}

copyPresaleWallet() {
    const presaleWallet = document.getElementById('presale-wallet');
    if (!presaleWallet) {
        console.warn('Elemento presale-wallet não encontrado');
        this.showToast('Erro ao copiar a carteira da pré-venda.', 'error');
        return;
    }
    navigator.clipboard.writeText(presaleWallet.textContent).then(() => {
        this.showToast('Carteira da pré-venda copiada!', 'success');
    }).catch(() => {
        this.showToast('Erro ao copiar a carteira da pré-venda.', 'error');
    });
}

updatePresaleCalculation(event) {
    console.log('Atualizando cálculo da pré-venda');
    const solAmount = parseFloat(event.target.value) || 0;
    const detPriceInSol = 0.02 / 150; // Supondo 1 SOL = $150
    const detAmount = solAmount / detPriceInSol;
    const detAmountInput = document.getElementById('det-amount');
    if (detAmountInput) {
        detAmountInput.value = detAmount.toFixed(0);
    }
}

buyPresale() {
    console.log('Tentando comprar DET na pré-venda');
    const solAmountInput = document.getElementById('sol-amount');
    const detAmountInput = document.getElementById('det-amount');
    if (!solAmountInput || !detAmountInput) {
        console.warn('Elementos sol-amount ou det-amount não encontrados');
        this.showToast('Erro ao processar a compra.', 'error');
        return;
    }
    const detAmount = parseInt(detAmountInput.value);
    if (detAmount < 500 || detAmount > 100000) {
        this.showToast('A compra deve ser entre 500 e 100.000 DET.', 'error');
        return;
    }
    this.showToast('Compra enviada! Envie SOL para a carteira indicada.', 'success');
}

filterShopItems(category) {
    console.log('Filtrando itens da loja por categoria:', category);
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector(`.category-btn[data-category="${category}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    const shopItems = document.querySelectorAll('.shop-item');
    shopItems.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

buyItem(event) {
    console.log('Tentando comprar item da loja');
    const item = event.target.closest('.shop-item');
    if (!item) {
        console.warn('Item da loja não encontrado');
        return;
    }
    const price = parseInt(item.querySelector('.item-price').textContent);
    if ((this.userData.spendingBalance || 0) < price) {
        this.showToast('Saldo insuficiente para comprar este item.', 'error');
        return;
    }
    this.userData.spendingBalance -= price;
    this.addTransaction('purchase', `Compra: ${item.querySelector('h4').textContent}`, -price);
    this.saveUserData();
    this.updateShopPage();
    this.showToast('Item comprado com sucesso!', 'success');
}

toggleMobileMenu() {
    console.log('Alternando menu mobile');
    const navLinks = document.querySelector('.nav-links');
    const mobileMenuButton = document.getElementById('mobile-menu-btn');
    if (navLinks && mobileMenuButton) {
        navLinks.classList.toggle('mobile-active');
        mobileMenuButton.classList.toggle('active');
    }
}

// --- Mission Completion ---
handlePhotoSelect(event) {
    console.log('Foto selecionada');
    const file = event.target.files[0];
    if (!file) {
        console.warn('Nenhum arquivo selecionado');
        return;
    }
    if (!file.type.startsWith('image/')) {
        this.showToast('Por favor, selecione uma imagem válida.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        this.showToast('A imagem deve ter no máximo 5MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const photoPreview = document.getElementById('photo-preview');
        if (photoPreview) {
            photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px;">`;
        }
        const submitMissionButton = document.getElementById('submit-mission-btn');
        if (submitMissionButton) {
            submitMissionButton.disabled = false;
        }
    };
    reader.readAsDataURL(file);
}

completeMission() {
    console.log('Completando missão:', this.currentMission?.id);
    if (!this.currentMission) {
        console.warn('Nenhuma missão selecionada');
        this.showToast('Erro: Nenhuma missão selecionada.', 'error');
        return;
    }
    const reward = this.currentMission.reward;
    const obligatoryStake = Math.ceil(reward * 0.1);
    const spendingBalance = Math.ceil(reward * 0.1);
    const walletBalance = reward - obligatoryStake - spendingBalance;

    this.userData.totalBalance = (this.userData.totalBalance || 0) + walletBalance;
    this.userData.stakeBalance = (this.userData.stakeBalance || 0) + obligatoryStake;
    this.userData.spendingBalance = (this.userData.spendingBalance || 0) + spendingBalance;
    this.userData.completedMissions.push({
        id: this.currentMission.id,
        timestamp: new Date().toISOString()
    });
    this.addTransaction('mission', `Missão Concluída: ${this.currentMission.title}`, reward);
    this.missions = this.missions.map(m =>
        m.id === this.currentMission.id ? { ...m, completed: true } : m
    );
    this.userData.dailyMissions = this.missions;
    this.saveUserData();
    this.closePhotoModal();
    this.loadMissions();
    this.updateMissionProgress();
    this.showToast(`Missão concluída! Você ganhou ${reward} DET.`, 'success');
}

closePhotoModal() {
    console.log('Fechando modal de foto');
    const photoModal = document.getElementById('photo-modal');
    if (photoModal) {
        photoModal.classList.remove('active');
    }
    const photoInput = document.getElementById('photo-input');
    if (photoInput) {
        photoInput.value = '';
    }
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
        photoPreview.innerHTML = '';
    }
    this.currentMission = null;
}

updateMissionProgress() {
    console.log('Atualizando progresso das missões');
    const completedCount = this.missions.filter(m => m.completed).length;
    const completedMissionsElement = document.getElementById('completed-missions');
    if (completedMissionsElement) {
        completedMissionsElement.textContent = completedCount;
    }
    const dailyProgressElement = document.getElementById('daily-progress');
    if (dailyProgressElement) {
        dailyProgressElement.style.width = `${(completedCount / 5) * 100}%`;
    }
}

loadMissions() {
    console.log('Carregando missões para exibição...');
    const missionsGrid = document.getElementById('missions-grid');
    if (!missionsGrid) {
        console.warn('Elemento missions-grid não encontrado no DOM');
        this.showToast('Erro ao carregar missões: elemento missions-grid não encontrado.', 'error');
        return;
    }
    missionsGrid.innerHTML = '';
    if (this.missions.length === 0) {
        console.warn('Nenhuma missão diária disponível para exibir');
        missionsGrid.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">Nenhuma missão diária disponível</p>';
    } else {
        this.missions.forEach(mission => {
            const missionCard = this.createMissionCard(mission);
            missionsGrid.appendChild(missionCard);
        });
    }

    const fixedMissionsGrid = document.getElementById('fixed-missions-grid');
    if (!fixedMissionsGrid) {
        console.warn('Elemento fixed-missions-grid não encontrado no DOM');
        this.showToast('Erro ao carregar missões fixas: elemento fixed-missions-grid não encontrado.', 'error');
        return;
    }
    fixedMissionsGrid.innerHTML = '';
    if (this.fixedMissions.length === 0) {
        console.warn('Nenhuma missão fixa disponível para exibir');
        fixedMissionsGrid.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">Nenhuma missão fixa disponível</p>';
    } else {
        this.fixedMissions.forEach(mission => {
            const completed = this.userData.completedMissions.find(cm => cm.id === mission.id);
            mission.completed = !!completed;
            const missionCard = this.createMissionCard(mission);
            fixedMissionsGrid.appendChild(missionCard);
        });
    }
}

createMissionCard(mission) {
    console.log('Criando cartão para missão:', mission.id);
    const card = document.createElement('div');
    card.className = `mission-card ${mission.completed ? 'completed' : ''}`;
    let linkHtml = mission.url ? `<a href="${mission.url}" target="_blank" class="mission-link">Abrir Perfil</a>` : '';
    card.innerHTML = `
        <div class="mission-header">
            <div class="mission-icon">${mission.icon}</div>
            <div class="mission-reward">+${mission.reward} DET</div>
        </div>
        <div class="mission-title">${mission.title}</div>
        <div class="mission-description">${mission.description}</div>
        ${linkHtml}
        <button class="mission-button ${mission.completed ? 'completed' : 'pending'}" 
                ${mission.completed ? 'disabled' : ''}>
            ${mission.completed ? ' Concluída' : ' Completar Missão'}
        </button>
    `;
    const button = card.querySelector('.mission-button');
    if (!mission.completed) {
        button.addEventListener('click', () => this.openPhotoModal(mission.id));
    }
    return card;
}

openPhotoModal(missionId) {
    console.log('Abrindo modal de foto para missão:', missionId);
    this.currentMission = this.missions.find(m => m.id === missionId) ||
                        this.fixedMissions.find(m => m.id === missionId);
    if (!this.currentMission || this.currentMission.completed) {
        console.warn('Missão não encontrada ou já completada');
        return;
    }
    const modalTitle = document.getElementById('modal-mission-title');
    if (modalTitle) {
        modalTitle.textContent = this.currentMission.title;
    }
    const photoModal = document.getElementById('photo-modal');
    if (photoModal) {
        photoModal.classList.add('active');
    }
    const submitMissionButton = document.getElementById('submit-mission-btn');
    if (submitMissionButton) {
        submitMissionButton.disabled = true;
    }
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
        photoPreview.innerHTML = '';
    }
}

// --- Utility Functions ---
navigateTo(page) {
    console.log('Navegando para a página:', page);
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
    } else {
        console.warn(`Página ${page}-page não encontrada`);
    }
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    const navButton = document.querySelector(`[data-page="${page}"]`);
    if (navButton) {
        navButton.classList.add('active');
    }
    this.currentPage = page;
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && navLinks.classList.contains('mobile-active')) {
        this.toggleMobileMenu();
    }
    this.updateUI();
}

showLoading(message) {
    console.log('Exibindo overlay de carregamento:', message);
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.querySelector('p').textContent = message;
        overlay.classList.add('active');
    } else {
        console.warn('Elemento loading-overlay não encontrado');
    }
}

hideLoading() {
    console.log('Ocultando overlay de carregamento');
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    } else {
        console.warn('Elemento loading-overlay não encontrado');
    }
}

showToast(message, type = 'info') {
    console.log('Exibindo toast:', message, type);
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Elemento toast-container não encontrado');
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
}}document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando app');
    try {
        const app = new DetHabitsApp();
        app.init();
    } catch (error) {
        console.error('Erro ao inicializar DetHabitsApp:', error);
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = 'toast error';
            toast.textContent = 'Erro ao inicializar a aplicação. Verifique o console para mais detalhes.';
            toastContainer.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        }
    }
});

