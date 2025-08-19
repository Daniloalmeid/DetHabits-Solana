class DetHabitsApp {
    constructor() {
        console.log('Construindo DetHabitsApp...');
        this.wallet = null;
        this.userData = {
            totalBalance: 294, // Inicializado com 294 DET
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
            fixedMissions: [],
            stakeLockEnd: null
        };
        this.allMissions = [];
        this.fixedMissions = [];
        this.missions = [];
        this.lastMissionResetDate = new Date().toDateString();
        this.currentPage = 'home';
        this.currentMission = null;
        this.nextMissionReset = null;
        this.minuteYieldRate = 10 / (365 * 24 * 60) / 100; // 10% anual por minuto
        this.secondYieldRate = this.minuteYieldRate / 60;
        this.yieldInterval = null;
        this.uiYieldInterval = null;
    }

    async init() {
        console.log('Inicializando DetHabitsApp...');
        try {
            await this.loadAllMissions();
            this.loadUserData();
            this.selectDailyMissions();
            this.setupEventListeners();
            this.startMissionTimer();
            this.loadMissions();
            this.updateUI();
            this.startBackupInterval();
            if (window.solana && window.solana.isPhantom) {
                console.log('Tentando reconexão automática com Phantom...');
                await this.connectWallet(true);
            }
        } catch (error) {
            console.error('Erro durante inicialização:', error);
            this.showToast('Erro ao inicializar a aplicação. Verifique o console.', 'error');
        }
    }

    initStaking() {
        console.log('Inicializando funcionalidades de staking...');
        try {
            this.startYieldUpdater();
        } catch (error) {
            console.error('Erro ao inicializar staking:', error);
            this.showToast('Erro ao inicializar staking. Funcionalidades de stake podem não funcionar.', 'error');
        }
    }

    // --- Staking Logic ---
    startYieldUpdater() {
        console.log('Iniciando atualizador de rendimentos');
        try {
            if (this.yieldInterval) clearInterval(this.yieldInterval);
            if (this.uiYieldInterval) clearInterval(this.uiYieldInterval);
            this.resetDailyYields();
            this.yieldInterval = setInterval(() => this.updateYields(), 60000);
            this.uiYieldInterval = setInterval(() => this.updateYieldsUI(), 1000);
        } catch (error) {
            console.error('Erro no startYieldUpdater:', error);
            this.showToast('Erro ao iniciar atualizador de rendimentos.', 'error');
        }
    }

    updateYields() {
        console.log('Atualizando rendimentos');
        try {
            if (!this.wallet) {
                console.warn('Carteira não conectada, pulando atualização de rendimentos');
                return;
            }
            const now = new Date();
            const today = now.toDateString();

            if ((this.userData.lastYieldResetDate || '') !== today) {
                console.log('Resetando rendimentos diários');
                this.resetDailyYields();
                this.userData.lastYieldResetDate = today;
                this.showToast('Rendimentos diários foram resetados com sucesso!', 'success');
            }

            const obligatoryYield = (this.userData.stakeBalance || 0) * this.minuteYieldRate;
            const voluntaryYield = (this.userData.voluntaryStakeBalance || 0) * this.minuteYieldRate;

            this.userData.fractionalYieldObligatory = (this.userData.fractionalYieldObligatory || 0) + obligatoryYield;
            this.userData.fractionalYieldVoluntary = (this.userData.fractionalYieldVoluntary || 0) + voluntaryYield;

            const obligatoryWhole = Math.floor(this.userData.fractionalYieldObligatory);
            const voluntaryWhole = Math.floor(this.userData.fractionalYieldVoluntary);

            if (obligatoryWhole >= 1) {
                this.userData.stakeBalance = (this.userData.stakeBalance || 0) + obligatoryWhole;
                this.userData.fractionalYieldObligatory -= obligatoryWhole;
                this.userData.dailyYieldObligatoryAccumulated = (this.userData.dailyYieldObligatoryAccumulated || 0) + obligatoryWhole;
                this.addTransaction('yield', `Rendimento Obrigatório: +${obligatoryWhole} DET`, obligatoryWhole);
                this.showToast(`Você ganhou ${obligatoryWhole} DET no stake obrigatório!`, 'success');
            }

            if (voluntaryWhole >= 1) {
                this.userData.voluntaryStakeBalance = (this.userData.voluntaryStakeBalance || 0) + voluntaryWhole;
                this.userData.fractionalYieldVoluntary -= voluntaryWhole;
                this.userData.dailyYieldVoluntaryAccumulated = (this.userData.dailyYieldVoluntaryAccumulated || 0) + voluntaryWhole;
                this.addTransaction('yield', `Rendimento Voluntário: +${voluntaryWhole} DET`, voluntaryWhole);
                this.showToast(`Você ganhou ${voluntaryWhole} DET no stake voluntário!`, 'success');
            }

            this.updateStakeLockTimer();
            this.saveUserData();
            this.updateUI();
            console.log('Rendimentos atualizados:', {
                obligatory: this.userData.dailyYieldObligatoryAccumulated,
                voluntary: this.userData.dailyYieldVoluntaryAccumulated
            });
        } catch (error) {
            console.error('Erro ao atualizar rendimentos:', error);
            this.showToast('Erro ao atualizar rendimentos.', 'error');
        }
    }

    updateYieldsUI() {
        console.log('Atualizando UI dos rendimentos em tempo real');
        try {
            if (!this.wallet) {
                console.warn('Carteira não conectada, pulando atualização da UI de rendimentos');
                return;
            }
            const obligatoryYield = (this.userData.stakeBalance || 0) * this.secondYieldRate;
            const voluntaryYield = (this.userData.voluntaryStakeBalance || 0) * this.secondYieldRate;

            const tempFractionalObligatory = (this.userData.fractionalYieldObligatory || 0) + obligatoryYield;
            const tempFractionalVoluntary = (this.userData.fractionalYieldVoluntary || 0) + voluntaryYield;

            const dailyYieldElement = document.getElementById('daily-yield');
            if (dailyYieldElement) {
                const totalObligatoryYield = ((this.userData.dailyYieldObligatoryAccumulated || 0) + tempFractionalObligatory).toFixed(5);
                dailyYieldElement.textContent = `+${totalObligatoryYield} DET`;
                dailyYieldElement.classList.add('yield-update');
                setTimeout(() => dailyYieldElement.classList.remove('yield-update'), 500);
            }

            const dailyYieldVoluntaryElement = document.getElementById('daily-yield-voluntary');
            if (dailyYieldVoluntaryElement) {
                const totalVoluntaryYield = ((this.userData.dailyYieldVoluntaryAccumulated || 0) + tempFractionalVoluntary).toFixed(5);
                dailyYieldVoluntaryElement.textContent = `+${totalVoluntaryYield} DET`;
                dailyYieldVoluntaryElement.classList.add('yield-update');
                setTimeout(() => dailyYieldVoluntaryElement.classList.remove('yield-update'), 500);
            }
        } catch (error) {
            console.error('Erro ao atualizar UI dos rendimentos:', error);
            this.showToast('Erro ao atualizar rendimentos na interface.', 'error');
        }
    }

    resetDailyYields() {
        console.log('Resetando rendimentos diários');
        try {
            const obligatoryYield = Math.floor(this.userData.fractionalYieldObligatory || 0);
            const voluntaryYield = Math.floor(this.userData.fractionalYieldVoluntary || 0);

            if (obligatoryYield >= 1) {
                this.userData.stakeBalance = (this.userData.stakeBalance || 0) + obligatoryYield;
                this.userData.fractionalYieldObligatory -= obligatoryYield;
                this.addTransaction('yield', `Rendimento Obrigatório Acumulado: +${obligatoryYield} DET`, obligatoryYield);
            }

            if (voluntaryYield >= 1) {
                this.userData.voluntaryStakeBalance = (this.userData.voluntaryStakeBalance || 0) + voluntaryYield;
                this.userData.fractionalYieldVoluntary -= voluntaryYield;
                this.addTransaction('yield', `Rendimento Voluntário Acumulado: +${voluntaryYield} DET`, voluntaryYield);
            }

            this.userData.dailyYieldObligatoryAccumulated = 0;
            this.userData.dailyYieldVoluntaryAccumulated = 0;
            this.userData.fractionalYieldObligatory = 0;
            this.userData.fractionalYieldVoluntary = 0;
            this.saveUserData();
        } catch (error) {
            console.error('Erro ao resetar rendimentos diários:', error);
            this.showToast('Erro ao resetar rendimentos diários.', 'error');
        }
    }

    stakeVoluntary(amount) {
        console.log('Tentando realizar stake voluntário:', amount);
        try {
            if (!Number.isInteger(amount) || amount <= 0) {
                console.error('Quantidade inválida para stake:', amount);
                throw new Error('Por favor, insira uma quantidade válida (número inteiro positivo).');
            }
            if (amount > 10000) {
                console.error('Quantidade excede o limite máximo:', amount);
                throw new Error('O stake voluntário não pode exceder 10.000 DET por transação.');
            }
            if ((this.userData.totalBalance || 0) < amount) {
                console.error('Saldo insuficiente para stake:', {
                    totalBalance: this.userData.totalBalance,
                    amount
                });
                throw new Error(`Saldo insuficiente. Você tem ${(this.userData.totalBalance || 0).toFixed(5)} DET, mas tentou fazer stake de ${amount} DET.`);
            }
            this.userData.totalBalance -= amount;
            this.userData.voluntaryStakeBalance = (this.userData.voluntaryStakeBalance || 0) + amount;
            this.addTransaction('stake', `Stake Voluntário: ${amount} DET`, amount);
            this.saveUserData();
            this.updateUI();
            console.log('Stake voluntário realizado:', amount);
            this.showToast(`Stake voluntário de ${amount} DET realizado com sucesso!`, 'success');
            return amount;
        } catch (error) {
            console.error('Erro ao realizar stake voluntário:', error);
            throw error;
        }
    }

    unstakeVoluntaryPartial(amount) {
        console.log('Tentando retirar parcialmente do stake voluntário:', amount);
        try {
            if (!Number.isInteger(amount) || amount <= 0) {
                console.error('Quantidade inválida para retirada:', amount);
                throw new Error('Por favor, insira uma quantidade válida (número inteiro positivo).');
            }
            if ((this.userData.voluntaryStakeBalance || 0) < amount) {
                console.error('Quantidade insuficiente no stake voluntário:', {
                    voluntaryStakeBalance: this.userData.voluntaryStakeBalance,
                    amount
                });
                throw new Error(`Quantidade insuficiente. Você tem ${(this.userData.voluntaryStakeBalance || 0).toFixed(5)} DET em stake voluntário, mas tentou retirar ${amount} DET.`);
            }
            const totalStake = this.userData.voluntaryStakeBalance || 0;
            const proportion = amount / totalStake;
            const yieldAmount = (this.userData.fractionalYieldVoluntary || 0) * proportion;

            this.userData.voluntaryStakeBalance -= amount;
            this.userData.fractionalYieldVoluntary -= yieldAmount;
            this.userData.totalBalance = (this.userData.totalBalance || 0) + amount + yieldAmount;
            this.addTransaction('unstake', `Retirada Parcial de Stake Voluntário: ${(amount + yieldAmount).toFixed(5)} DET`, amount + yieldAmount);
            this.saveUserData();
            this.updateUI();
            console.log('Retirada parcial do stake voluntário realizada:', amount + yieldAmount);
            this.showToast(`Retirada de ${(amount + yieldAmount).toFixed(5)} DET do stake voluntário realizada!`, 'success');
            return amount + yieldAmount;
        } catch (error) {
            console.error('Erro ao retirar parcialmente do stake voluntário:', error);
            throw error;
        }
    }

    withdrawMaxObligatory() {
        console.log('Tentando retirar máximo do stake obrigatório');
        try {
            const now = new Date();
            if (this.userData.stakeLockEnd && new Date(this.userData.stakeLockEnd) > now) {
                const remainingDays = Math.ceil((new Date(this.userData.stakeLockEnd) - now) / (1000 * 60 * 60 * 24));
                throw new Error(`O stake obrigatório está bloqueado por mais ${remainingDays} dias.`);
            }
            const amount = this.userData.stakeBalance || 0;
            if (amount <= 0) {
                console.error('Nenhum valor em stake obrigatório para retirar');
                throw new Error('Nenhum valor disponível em stake obrigatório para retirada.');
            }
            const yieldAmount = (this.userData.fractionalYieldObligatory || 0) + (this.userData.dailyYieldObligatoryAccumulated || 0);
            this.userData.stakeBalance = 0;
            this.userData.fractionalYieldObligatory = 0;
            this.userData.dailyYieldObligatoryAccumulated = 0;
            this.userData.stakeLockEnd = null;
            this.userData.totalBalance = (this.userData.totalBalance || 0) + amount + yieldAmount;
            this.addTransaction('unstake', `Retirada de Stake Obrigatório: ${(amount + yieldAmount).toFixed(5)} DET`, amount + yieldAmount);
            this.saveUserData();
            this.updateUI();
            console.log('Stake obrigatório retirado:', amount + yieldAmount);
            this.showToast(`Retirada de ${(amount + yieldAmount).toFixed(5)} DET do stake obrigatório realizada!`, 'success');
            return amount + yieldAmount;
        } catch (error) {
            console.error('Erro ao retirar stake obrigatório:', error);
            throw error;
        }
    }

    withdrawMaxVoluntary() {
        console.log('Tentando retirar máximo do stake voluntário');
        try {
            const amount = this.userData.voluntaryStakeBalance || 0;
            if (amount <= 0) {
                console.error('Nenhum valor em stake voluntário para retirar');
                throw new Error('Nenhum valor disponível em stake voluntário para retirada.');
            }
            const yieldAmount = (this.userData.fractionalYieldVoluntary || 0) + (this.userData.dailyYieldVoluntaryAccumulated || 0);
            this.userData.voluntaryStakeBalance = 0;
            this.userData.fractionalYieldVoluntary = 0;
            this.userData.dailyYieldVoluntaryAccumulated = 0;
            this.userData.totalBalance = (this.userData.totalBalance || 0) + amount + yieldAmount;
            this.addTransaction('unstake', `Retirada Máxima de Stake Voluntário: ${(amount + yieldAmount).toFixed(5)} DET`, amount + yieldAmount);
            this.saveUserData();
            this.updateUI();
            console.log('Stake voluntário máximo retirado:', amount + yieldAmount);
            this.showToast(`Retirada de ${(amount + yieldAmount).toFixed(5)} DET do stake voluntário realizada!`, 'success');
            return amount + yieldAmount;
        } catch (error) {
            console.error('Erro ao retirar máximo do stake voluntário:', error);
            throw error;
        }
    }

    updateStakeLockTimer() {
        const stakeTimeLeftElement = document.getElementById('stake-time-left');
        if (!stakeTimeLeftElement) {
            console.warn('Elemento stake-time-left não encontrado');
            return;
        }
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

    // --- Wallet Connection ---
    async connectWallet(onlyIfTrusted = false) {
        console.log(`Tentando conectar carteira (onlyIfTrusted: ${onlyIfTrusted})...`);
        this.showLoading('Conectando à carteira Phantom...');
        try {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            console.log('Ambiente detectado:', isMobile ? 'Mobile' : 'Desktop');

            if (!window.solana || !window.solana.isPhantom) {
                console.warn('Carteira Phantom não detectada.');
                this.hideLoading();
                if (isMobile) {
                    this.showToast(
                        'Por favor, abra esta URL no navegador interno do aplicativo Phantom: https://daniloalmeid.github.io/DetHabits-Solana/',
                        'info'
                    );
                    const redirectUrl = encodeURIComponent('https://daniloalmeid.github.io/DetHabits-Solana/');
                    const deepLink = `phantom://connect?app_url=${redirectUrl}&dapp_name=DetHabits`;
                    console.log('Redirecionando para deep link:', deepLink);
                    window.location.href = deepLink;
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    if (window.solana && window.solana.isPhantom) {
                        console.log('Phantom detectado após redirecionamento, tentando conectar...');
                        await this.connectWallet(onlyIfTrusted);
                    } else {
                        this.showToast(
                            'Não foi possível detectar a carteira Phantom. Certifique-se de estar usando o navegador interno do Phantom.',
                            'error'
                        );
                    }
                } else {
                    this.showToast(
                        'A extensão Phantom não foi encontrada. Por favor, instale a extensão no seu navegador.',
                        'error'
                    );
                }
                return;
            }

            console.log('Conectando com a carteira Phantom...');
            const response = await window.solana.connect({ onlyIfTrusted });
            this.wallet = response.publicKey.toString();
            console.log('Carteira conectada com sucesso:', this.wallet);
            this.showToast('Carteira Phantom conectada com sucesso!', 'success');

            const homePage = document.getElementById('home-page');
            if (homePage) homePage.style.display = 'none';
            const navbar = document.getElementById('navbar');
            if (navbar) navbar.style.display = 'block';
            this.navigateTo('missions');
            this.loadUserData();
            this.updateWalletDisplay();
            this.updateUI();
            this.initStaking();
        } catch (error) {
            console.error('Erro ao conectar carteira:', error);
            if (error.code === 4001) {
                this.showToast('Você rejeitou a conexão com a carteira.', 'error');
            } else {
                this.showToast(
                    'Erro ao conectar a carteira. No celular, abra esta URL no navegador interno do Phantom: https://daniloalmeid.github.io/DetHabits-Solana/',
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
        this.showToast('Carteira desconectada com sucesso!', 'success');
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
        }
        const walletAddressFullElement = document.getElementById('wallet-address-full');
        if (walletAddressFullElement) {
            walletAddressFullElement.textContent = this.wallet;
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
                    icon: '💧',
                    reward: 7,
                    completed: false
                },
                {
                    id: 'walk_1',
                    title: 'Caminhar por 5 Minutos',
                    description: 'Faça uma caminhada de pelo menos 5 minutos e registre o momento.',
                    icon: '🚶',
                    reward: 7,
                    completed: false
                },
                {
                    id: 'meditation_1',
                    title: 'Meditar por 3 Minutos',
                    description: 'Dedique 3 minutos para meditação e tire uma selfie relaxante.',
                    icon: '🧘',
                    reward: 7,
                    completed: false
                },
                {
                    id: 'nap_1',
                    title: 'Tirar uma Soneca de 15 Minutos',
                    description: 'Tire uma soneca de 15 minutos e comprove com uma foto do ambiente.',
                    icon: '😴',
                    reward: 7,
                    completed: false
                },
                {
                    id: 'stretch_1',
                    title: 'Alongar o Corpo por 2 Minutos',
                    description: 'Faça alongamentos por 2 minutos e envie uma foto ou vídeo.',
                    icon: '🤸',
                    reward: 7,
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
                reward: this.applyVipBonus(mission.reward),
                completed: this.userData.completedMissions.some(cm => cm.id === mission.id)
            }));
            this.lastMissionResetDate = today;
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

    applyVipBonus(reward) {
        const totalStaked = (this.userData.stakeBalance || 0) + (this.userData.voluntaryStakeBalance || 0);
        let bonus = 1;
        if (totalStaked >= 500 && totalStaked <= 4999) bonus = 1.05;
        else if (totalStaked >= 5000 && totalStaked <= 49999) bonus = 1.15;
        else if (totalStaked >= 50000 && totalStaked <= 100000) bonus = 1.25;
        return Math.ceil(reward * bonus);
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

    updateMissionProgress() {
        const completedCount = this.userData.completedMissions.filter(cm =>
            this.missions.some(m => m.id === cm.id)
        ).length;
        const progress = (completedCount / this.missions.length) * 100;
        const progressBar = document.getElementById('daily-progress');
        const completedMissions = document.getElementById('completed-missions');
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (completedMissions) completedMissions.textContent = `${completedCount}/${this.missions.length}`;
    }

    openMissionModal(missionId) {
        const mission = this.missions.find(m => m.id === missionId) || this.fixedMissions.find(m => m.id === missionId);
        if (!mission) {
            console.error('Missão não encontrada:', missionId);
            this.showToast('Missão não encontrada.', 'error');
            return;
        }
        this.currentMission = mission;
        const modal = document.getElementById('photo-modal');
        const modalTitle = document.getElementById('modal-mission-title');
        if (modal && modalTitle) {
            modal.classList.add('active');
            modalTitle.textContent = mission.title;
        }
    }

    submitMission() {
        if (!this.currentMission) {
            console.error('Nenhuma missão selecionada para envio');
            this.showToast('Erro: Nenhuma missão selecionada.', 'error');
            return;
        }
        console.log('Enviando missão:', this.currentMission.id);
        try {
            const reward = this.currentMission.reward;
            // Divisão da recompensa: 80% totalBalance, 10% stakeBalance, 10% spendingBalance
            const totalBalanceReward = reward * 0.8;
            const stakeBalanceReward = reward * 0.1;
            const spendingBalanceReward = reward * 0.1;

            this.userData.totalBalance = (this.userData.totalBalance || 0) + totalBalanceReward;
            this.userData.stakeBalance = (this.userData.stakeBalance || 0) + stakeBalanceReward;
            this.userData.spendingBalance = (this.userData.spendingBalance || 0) + spendingBalanceReward;

            // Definir período de bloqueio de 90 dias para o stake obrigatório, se ainda não definido
            if (!this.userData.stakeLockEnd && stakeBalanceReward > 0) {
                const now = new Date();
                this.userData.stakeLockEnd = new Date(now.setDate(now.getDate() + 90)).toISOString();
            }

            this.userData.completedMissions.push({ id: this.currentMission.id, completedAt: new Date().toISOString() });
            this.addTransaction('mission', `Missão Concluída: ${this.currentMission.title} (+${reward} DET: 80% Total, 10% Stake, 10% Gastos)`, reward);
            this.saveUserData();
            this.loadMissions();
            this.updateMissionProgress();
            this.updateUI();
            this.closeModal();
            this.showToast(
                `Missão "${this.currentMission.title}" concluída! Você ganhou ${totalBalanceReward.toFixed(5)} DET no Saldo Total, ${stakeBalanceReward.toFixed(5)} DET no Stake Obrigatório e ${spendingBalanceReward.toFixed(5)} DET no Saldo de Gastos!`,
                'success'
            );
        } catch (error) {
            console.error('Erro ao enviar missão:', error);
            this.showToast('Erro ao enviar missão.', 'error');
        }
    }

    // --- Data Persistence ---
    loadUserData() {
        console.log('Carregando dados do usuário do localStorage...');
        try {
            const savedData = localStorage.getItem(`dethabits_${this.wallet || 'default'}`);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.userData = {
                    ...this.userData,
                    ...parsedData,
                    totalBalance: parsedData.totalBalance !== undefined ? parsedData.totalBalance : this.userData.totalBalance,
                    stakeBalance: parsedData.stakeBalance || 0,
                    voluntaryStakeBalance: parsedData.voluntaryStakeBalance || 0,
                    fractionalYieldObligatory: parsedData.fractionalYieldObligatory || 0,
                    fractionalYieldVoluntary: parsedData.fractionalYieldVoluntary || 0,
                    dailyYieldObligatoryAccumulated: parsedData.dailyYieldObligatoryAccumulated || 0,
                    dailyYieldVoluntaryAccumulated: parsedData.dailyYieldVoluntaryAccumulated || 0,
                    spendingBalance: parsedData.spendingBalance || 0,
                    completedMissions: parsedData.completedMissions || [],
                    transactions: parsedData.transactions || [],
                    dailyMissions: parsedData.dailyMissions || [],
                    fixedMissions: parsedData.fixedMissions || [],
                    stakeLockEnd: parsedData.stakeLockEnd || null,
                    lastYieldResetDate: parsedData.lastYieldResetDate || new Date().toDateString(),
                    lastMissionResetDate: parsedData.lastMissionResetDate || new Date().toDateString()
                };
                this.missions = this.userData.dailyMissions;
                console.log('Dados do usuário carregados:', this.userData);
            }
            this.updateUI();
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            this.showToast('Erro ao carregar dados do usuário. Usando valores padrão.', 'error');
        }
    }

    saveUserData() {
        console.log('Salvando dados do usuário no localStorage...');
        try {
            localStorage.setItem(`dethabits_${this.wallet || 'default'}`, JSON.stringify(this.userData));
            console.log('Dados do usuário salvos com sucesso');
        } catch (error) {
            console.error('Erro ao salvar dados do usuário:', error);
            this.showToast('Erro ao salvar dados do usuário.', 'error');
        }
    }

    startBackupInterval() {
        console.log('Iniciando intervalo de backup automático');
        setInterval(() => {
            if (this.wallet) {
                this.saveUserData();
                console.log('Backup automático realizado');
            }
        }, 5 * 60 * 1000); // Backup a cada 5 minutos
    }

    // --- UI Updates ---
    updateUI() {
        console.log('Atualizando UI...');
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
        const withdrawBtn = document.getElementById('withdraw-btn');
        const withdrawMaxObligatoryBtn = document.getElementById('withdraw-max-obligatory-btn');
        const withdrawMaxVoluntaryBtn = document.getElementById('withdraw-max-voluntary-btn');

        if (totalBalanceElement) totalBalanceElement.textContent = (this.userData.totalBalance || 0).toFixed(5);
        if (stakeBalanceElement) stakeBalanceElement.textContent = (this.userData.stakeBalance || 0).toFixed(5);
        if (voluntaryStakeBalanceElement) voluntaryStakeBalanceElement.textContent = (this.userData.voluntaryStakeBalance || 0).toFixed(5);
        if (spendingBalanceElement) spendingBalanceElement.textContent = (this.userData.spendingBalance || 0).toFixed(5);
        if (withdrawBtn) withdrawBtn.disabled = (this.userData.totalBalance || 0) < 800;
        if (withdrawMaxObligatoryBtn) {
            const now = new Date();
            withdrawMaxObligatoryBtn.disabled = !this.userData.stakeBalance || (this.userData.stakeLockEnd && new Date(this.userData.stakeLockEnd) > now);
        }
        if (withdrawMaxVoluntaryBtn) withdrawMaxVoluntaryBtn.disabled = !this.userData.voluntaryStakeBalance;
    }

    updateShopPage() {
        const shopBalanceElement = document.getElementById('shop-balance');
        if (shopBalanceElement) shopBalanceElement.textContent = (this.userData.spendingBalance || 0).toFixed(5);
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

    // --- Navigation ---
    navigateTo(page) {
        console.log('Navegando para:', page);
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

    // --- UI Utilities ---
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
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

    // --- Event Listeners ---
    setupEventListeners() {
        console.log('Configurando event listeners...');
        // Navbar
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', () => {
                this.navigateTo(button.dataset.page);
                document.querySelector('.nav-links').classList.remove('mobile-active');
            });
        });

        // Mobile Menu
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                document.querySelector('.nav-links').classList.toggle('mobile-active');
            });
        }

        // Connect Wallet
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        if (connectWalletBtn) {
            connectWalletBtn.addEventListener('click', () => this.connectWallet());
        }

        // Disconnect Wallet
        const disconnectBtn = document.getElementById('disconnect-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnectWallet());
        }

        // Copy URL
        const copyUrlBtn = document.getElementById('copy-url-btn');
        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(document.getElementById('app-url').textContent)
                    .then(() => this.showToast('URL copiada com sucesso!', 'success'))
                    .catch(() => this.showToast('Erro ao copiar URL.', 'error'));
            });
        }

        // Presale Button
        const presaleBtn = document.getElementById('presale-btn');
        if (presaleBtn) {
            presaleBtn.addEventListener('click', () => this.navigateTo('presale'));
        }

        // Copy Presale Wallet
        const copyPresaleWalletBtn = document.getElementById('copy-presale-wallet-btn');
        if (copyPresaleWalletBtn) {
            copyPresaleWalletBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(document.getElementById('presale-wallet').textContent)
                    .then(() => this.showToast('Carteira de pré-venda copiada!', 'success'))
                    .catch(() => this.showToast('Erro ao copiar carteira.', 'error'));
            });
        }

        // Presale Calculator
        const solAmountInput = document.getElementById('sol-amount');
        const detAmountInput = document.getElementById('det-amount');
        if (solAmountInput && detAmountInput) {
            solAmountInput.addEventListener('input', () => {
                const sol = parseFloat(solAmountInput.value) || 0;
                detAmountInput.value = (sol * 150 / 0.02).toFixed(5);
            });
        }

        // Buy Presale
        const buyPresaleBtn = document.getElementById('buy-presale-btn');
        if (buyPresaleBtn) {
            buyPresaleBtn.addEventListener('click', () => {
                const detAmount = parseFloat(detAmountInput.value);
                if (detAmount < 500 || detAmount > 100000) {
                    this.showToast('A quantidade deve estar entre 500 e 100.000 DET.', 'error');
                    return;
                }
                this.userData.totalBalance += detAmount;
                this.addTransaction('presale', `Compra na Pré-venda: +${detAmount} DET`, detAmount);
                this.saveUserData();
                this.updateUI();
                this.showToast(`Compra de ${detAmount} DET realizada com sucesso!`, 'success');
            });
        }

        // Mission Buttons
        document.getElementById('missions-grid').addEventListener('click', e => {
            if (e.target.classList.contains('mission-button') && !e.target.disabled) {
                this.openMissionModal(e.target.dataset.missionId);
            }
        });
        document.getElementById('fixed-missions-grid').addEventListener('click', e => {
            if (e.target.classList.contains('mission-button') && !e.target.disabled) {
                this.openMissionModal(e.target.dataset.missionId);
            }
        });

        // Photo Upload
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

        // Submit Mission
        if (submitMissionBtn) {
            submitMissionBtn.addEventListener('click', () => this.submitMission());
        }

        // Close Modal
        const closeModalBtn = document.getElementById('close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }

        // Shop Category Buttons
        document.querySelectorAll('.category-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const category = button.dataset.category;
                document.querySelectorAll('.shop-item').forEach(item => {
                    if (category === 'all' || item.dataset.category === category) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });

        // Buy Item
        document.querySelector('.shop-grid').addEventListener('click', e => {
            if (e.target.classList.contains('buy-btn')) {
                const item = e.target.closest('.shop-item');
                const price = parseFloat(item.querySelector('.item-price').textContent);
                if ((this.userData.spendingBalance || 0) < price) {
                    this.showToast('Saldo insuficiente para comprar este item.', 'error');
                    return;
                }
                this.userData.spendingBalance -= price;
                this.addTransaction('purchase', `Compra: ${item.querySelector('h4').textContent} (-${price} DET)`, -price);
                this.saveUserData();
                this.updateUI();
                this.showToast('Item comprado com sucesso!', 'success');
            }
        });

        // Withdraw
        const withdrawBtn = document.getElementById('withdraw-btn');
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', () => {
                if ((this.userData.totalBalance || 0) < 800) {
                    this.showToast('Mínimo de 800 DET necessário para saque.', 'error');
                    return;
                }
                const amount = this.userData.totalBalance;
                this.userData.totalBalance = 0;
                this.addTransaction('withdraw', `Saque: ${amount.toFixed(5)} DET`, -amount);
                this.saveUserData();
                this.updateUI();
                this.showToast(`Saque de ${amount.toFixed(5)} DET solicitado!`, 'success');
            });
        }

        // Stake Voluntary
        const stakeVoluntaryBtn = document.getElementById('stake-voluntary-btn');
        if (stakeVoluntaryBtn) {
            stakeVoluntaryBtn.addEventListener('click', () => {
                const stakeAmountInput = document.getElementById('stake-amount-input');
                if (!stakeAmountInput) {
                    console.error('Elemento stake-amount-input não encontrado');
                    this.showToast('Erro: Campo de stake não encontrado.', 'error');
                    return;
                }
                const amount = parseInt(stakeAmountInput.value);
                try {
                    this.stakeVoluntary(amount);
                    stakeAmountInput.value = '';
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        }

        // Unstake Voluntary Partial
        const unstakeVoluntaryBtn = document.getElementById('unstake-voluntary-btn');
        if (unstakeVoluntaryBtn) {
            unstakeVoluntaryBtn.addEventListener('click', () => {
                const unstakeAmountInput = document.getElementById('unstake-amount-input');
                if (!unstakeAmountInput) {
                    console.error('Elemento unstake-amount-input não encontrado');
                    this.showToast('Erro: Campo de retirada não encontrado.', 'error');
                    return;
                }
                const amount = parseInt(unstakeAmountInput.value);
                try {
                    this.unstakeVoluntaryPartial(amount);
                    unstakeAmountInput.value = '';
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        }

        // Withdraw Max Voluntary
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

        // Withdraw Max Obligatory
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
    }
}

// Initialize the app
const app = new DetHabitsApp();
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando aplicação...');
    app.init();
});