// DetHabits Application
class DetHabitsApp {
    constructor() {
        this.wallet = null;
        this.userData = {
            totalBalance: 0,
            stakeBalance: 0,
            spendingBalance: 0,
            voluntaryStakeBalance: 0,
            fractionalYieldObligatory: 0,
            fractionalYieldVoluntary: 0,
            dailyYieldObligatoryAccumulated: 0,
            dailyYieldVoluntaryAccumulated: 0,
            lastYieldResetDate: new Date().toDateString(),
            completedMissions: [],
            transactions: []
        };
        this.missions = [
            {
                id: 'water',
                title: 'Beber 1 Copo de Água',
                description: 'Hidrate-se bebendo pelo menos um copo de água e comprove com uma foto.',
                icon: '💧',
                reward: 5,
                completed: false
            },
            {
                id: 'twitter',
                title: 'Seguir no X (Twitter)',
                description: 'Siga nossa conta oficial no X e tire um print da tela.',
                icon: '🐦',
                reward: 5,
                completed: false,
                url: 'https://x.com/seuperfil'
            },
            {
                id: 'instagram',
                title: 'Seguir no Instagram',
                description: 'Siga nosso perfil no Instagram e compartilhe uma foto.',
                icon: '📸',
                reward: 5,
                completed: false,
                url: 'https://instagram.com/seuperfil'
            },
            {
                id: 'walk',
                title: 'Caminhar por 5 Minutos',
                description: 'Faça uma caminhada de pelo menos 5 minutos e registre o momento.',
                icon: '🚶',
                reward: 5,
                completed: false
            },
            {
                id: 'meditation',
                title: 'Meditar por 3 Minutos',
                description: 'Dedique 3 minutos para meditação e tire uma selfie relaxante.',
                icon: '🧘',
                reward: 5,
                completed: false
            }
        ];
        this.currentPage = 'home';
        this.currentMission = null;
        this.minuteYieldRate = 300 / (365 * 24 * 60) / 100; // 300% anual dividido por 525.600 minutos no ano
        
        this.init();
    }

    init() {
        console.log('Inicializando DetHabitsApp...');
        this.loadUserData();
        this.setupEventListeners();
        this.updateUI();
        this.startMissionTimer();
        this.loadMissions();
        this.startYieldUpdater();
        this.startBackupInterval();
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        const connectButton = document.getElementById('connect-wallet-btn');
        if (connectButton) {
            connectButton.addEventListener('click', () => this.connectWallet());
        } else {
            console.error('Botão de conexão não encontrado');
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
        const withdrawButton = document.getElementById('withdraw-btn');
        if (withdrawButton) {
            withdrawButton.addEventListener('click', () => this.withdrawToSolana());
        }
        const stakeVoluntaryButton = document.getElementById('stake-voluntary-btn');
        if (stakeVoluntaryButton) {
            stakeVoluntaryButton.addEventListener('click', () => this.stakeVoluntary());
        }
        const unstakeVoluntaryButton = document.getElementById('unstake-voluntary-btn');
        if (unstakeVoluntaryButton) {
            unstakeVoluntaryButton.addEventListener('click', () => this.unstakeVoluntary());
        }
        const copyUrlButton = document.getElementById('copy-url-btn');
        if (copyUrlButton) {
            copyUrlButton.addEventListener('click', () => this.copyAppUrl());
        }
        const exportDataButton = document.getElementById('export-data-btn');
        if (exportDataButton) {
            exportDataButton.addEventListener('click', () => this.exportUserData());
        }
    }

    copyAppUrl() {
        const appUrl = document.getElementById('app-url').textContent;
        navigator.clipboard.writeText(appUrl).then(() => {
            this.showToast('URL copiada para a área de transferência!', 'success');
        }).catch(() => {
            this.showToast('Erro ao copiar a URL.', 'error');
        });
    }

    async connectWallet() {
        console.log('Tentando conectar carteira...');
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
                } else {
                    this.showToast('Por favor, instale a extensão Phantom no seu navegador.', 'error');
                }
                return;
            }

            console.log('Conectando com Phantom Wallet...');
            const response = await window.solana.connect({ onlyIfTrusted: false });
            this.wallet = response.publicKey.toString();
            console.log('Carteira conectada:', this.wallet);
            this.showToast('Carteira conectada com sucesso!', 'success');

            document.getElementById('home-page').style.display = 'none';
            this.navigateTo('missions');
            this.loadUserData();
            this.updateWalletDisplay();
            this.updateUI();
        } catch (error) {
            console.error('Erro ao conectar carteira:', error);
            this.showToast(
                'Erro ao conectar carteira. No celular, abra esta URL no navegador interno do Phantom: https://daniloalmeid.github.io/DetHabits-Solana/',
                'error'
            );
        } finally {
            console.log('Finalizando tentativa de conexão');
            this.hideLoading();
        }
    }

    disconnectWallet() {
        console.log('Desconectando carteira...');
        this.saveUserData();
        this.backupUserData();
        this.wallet = null;
        document.getElementById('home-page').style.display = 'block';
        document.getElementById('navbar').style.display = 'none';
        this.navigateTo('home');
        this.showToast('Carteira desconectada', 'success');
    }

    updateWalletDisplay() {
        if (!this.wallet) {
            console.log('Nenhuma carteira conectada, pulando atualização de display');
            return;
        }
        console.log('Atualizando display da carteira:', this.wallet);
        document.getElementById('navbar').style.display = 'block';
        const walletAddressElement = document.getElementById('wallet-address');
        if (walletAddressElement) {
            walletAddressElement.textContent = 
                `${this.wallet.substring(0, 4)}...${this.wallet.substring(this.wallet.length - 4)}`;
        } else {
            console.error('Elemento wallet-address não encontrado');
        }
        const walletAddressFullElement = document.getElementById('wallet-address-full');
        if (walletAddressFullElement) {
            walletAddressFullElement.textContent = this.wallet;
        } else {
            console.error('Elemento wallet-address-full não encontrado');
        }
    }

    navigateTo(page) {
        console.log('Navegando para a página:', page);
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        } else {
            console.error(`Página ${page}-page não encontrada`);
        }
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        const navButton = document.querySelector(`[data-page="${page}"]`);
        if (navButton) {
            navButton.classList.add('active');
        }
        this.currentPage = page;
        // Fecha o menu móvel automaticamente, se estiver aberto
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && navLinks.classList.contains('mobile-active')) {
            this.toggleMobileMenu();
        }
        if (page === 'wallet' && this.wallet) {
            this.updateWalletPage();
        } else if (page === 'missions') {
            this.updateMissionsPage();
        } else if (page === 'shop') {
            this.updateShopPage();
        }
    }

    loadMissions() {
        console.log('Carregando missões...');
        const missionsGrid = document.getElementById('missions-grid');
        if (missionsGrid) {
            missionsGrid.innerHTML = '';
            this.missions.forEach(mission => {
                const missionCard = this.createMissionCard(mission);
                missionsGrid.appendChild(missionCard);
            });
            this.updateMissionProgress();
        } else {
            console.error('Elemento missions-grid não encontrado');
        }
    }

    createMissionCard(mission) {
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
                ${mission.completed ? '✅ Concluída' : '📷 Completar Missão'}
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
        this.currentMission = this.missions.find(m => m.id === missionId);
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
                photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview da missão">`;
            }
            const submitMissionButton = document.getElementById('submit-mission-btn');
            if (submitMissionButton) {
                submitMissionButton.disabled = false;
            }
        };
        reader.readAsDataURL(file);
    }

    completeMission() {
        if (!this.currentMission) {
            console.warn('Nenhuma missão selecionada');
            return;
        }
        console.log('Completando missão:', this.currentMission.id);
        this.currentMission.completed = true;
        this.userData.completedMissions.push({
            id: this.currentMission.id,
            completedAt: new Date().toISOString(),
            reward: this.currentMission.reward
        });
        const totalReward = this.currentMission.reward;
        const stakeAmount = Math.ceil(totalReward * 0.1);
        const spendingAmount = Math.ceil(totalReward * 0.1);
        const walletAmount = totalReward - stakeAmount - spendingAmount;
        this.userData.totalBalance += walletAmount;
        this.userData.stakeBalance += stakeAmount;
        this.userData.spendingBalance += spendingAmount;
        this.addTransaction('mission', `Missão: ${this.currentMission.title}`, totalReward);
        this.closePhotoModal();
        this.loadMissions();
        this.updateWalletPage();
        this.saveUserData();
        this.backupUserData();
        this.showToast(`Missão concluída! +${totalReward} DET adicionados (Stake: ${stakeAmount}, Compras: ${spendingAmount}, Wallet: ${walletAmount})`, 'success');
        const completedToday = this.missions.filter(m => m.completed).length;
        if (completedToday === this.missions.length) {
            setTimeout(() => {
                this.showToast('🎉 Parabéns! Todas as missões do dia foram concluídas!', 'success');
            }, 1000);
        }
    }

    updateMissionProgress() {
        console.log('Atualizando progresso das missões');
        const completedCount = this.missions.filter(m => m.completed).length;
        const progressPercentage = (completedCount / this.missions.length) * 100;
        const dailyProgress = document.getElementById('daily-progress');
        if (dailyProgress) {
            dailyProgress.style.width = `${progressPercentage}%`;
        }
        const completedMissions = document.getElementById('completed-missions');
        if (completedMissions) {
            completedMissions.textContent = completedCount;
        }
    }

    updateMissionsPage() {
        console.log('Atualizando página de missões');
        this.loadMissions();
        this.updateMissionProgress();
    }

    updateWalletPage() {
        if (!this.wallet) {
            console.log('Carteira não conectada, pulando atualização da página da wallet');
            return;
        }
        console.log('Atualizando página da wallet');
        const totalBalanceElement = document.getElementById('total-balance');
        if (totalBalanceElement) {
            totalBalanceElement.textContent = this.userData.totalBalance.toFixed(0) || 0;
        }
        const stakeBalanceElement = document.getElementById('stake-balance');
        if (stakeBalanceElement) {
            stakeBalanceElement.textContent = this.userData.stakeBalance.toFixed(0) || 0;
        }
        const spendingBalanceElement = document.getElementById('spending-balance');
        if (spendingBalanceElement) {
            spendingBalanceElement.textContent = this.userData.spendingBalance.toFixed(0) || 0;
        }
        const voluntaryStakeBalanceElement = document.getElementById('voluntary-stake-balance');
        if (voluntaryStakeBalanceElement) {
            voluntaryStakeBalanceElement.textContent = this.userData.voluntaryStakeBalance.toFixed(0) || 0;
        }
        const dailyYieldElement = document.getElementById('daily-yield');
        if (dailyYieldElement) {
            dailyYieldElement.textContent = `+${this.userData.dailyYieldObligatoryAccumulated.toFixed(5)}`;
        }
        const dailyYieldVoluntaryElement = document.getElementById('daily-yield-voluntary');
        if (dailyYieldVoluntaryElement) {
            dailyYieldVoluntaryElement.textContent = `+${this.userData.dailyYieldVoluntaryAccumulated.toFixed(5)}`;
        }
        const withdrawBtn = document.getElementById('withdraw-btn');
        if (withdrawBtn) {
            withdrawBtn.disabled = this.userData.totalBalance < 800;
        }
        this.loadTransactionHistory();
    }

    updateShopPage() {
        console.log('Atualizando página da loja');
        const shopBalanceElement = document.getElementById('shop-balance');
        if (shopBalanceElement) {
            shopBalanceElement.textContent = `${this.userData.spendingBalance.toFixed(0)} DET`;
        }
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
        this.backupUserData();
    }

    loadTransactionHistory() {
        console.log('Carregando histórico de transações');
        const historyContainer = document.getElementById('transaction-history');
        if (!historyContainer) {
            console.error('Elemento transaction-history não encontrado');
            return;
        }
        historyContainer.innerHTML = '';
        if (this.userData.transactions.length === 0) {
            historyContainer.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">Nenhuma transação encontrada</p>';
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
                        ${transaction.type === 'mission' ? '🎯' : transaction.type === 'stake' || transaction.type === 'unstake' ? '🏦' : transaction.type === 'yield' ? '💸' : transaction.type === 'withdraw' ? '↗️' : transaction.type === 'presale' ? '💰' : '🛍️'}
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

    startMissionTimer() {
        console.log('Iniciando temporizador de missões');
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            const missionTimer = document.getElementById('mission-timer');
            if (missionTimer) {
                missionTimer.textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    async getSolPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            return data.solana.usd;
        } catch (error) {
            console.error('Erro ao obter preço do SOL:', error);
            return 150; // Valor padrão em caso de erro
        }
    }

    async updatePresaleCalculation(event) {
        console.log('Atualizando cálculo de pré-venda');
        const solAmount = parseFloat(event.target.value) || 0;
        const solToUsd = await this.getSolPrice();
        const usdAmount = solAmount * solToUsd;
        const detAmount = usdAmount / 0.02; // $0.02 por DET
        const detAmountElement = document.getElementById('det-amount');
        if (detAmountElement) {
            detAmountElement.value = detAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        }
    }

    async buyPresale() {
        console.log('Tentativa de compra na pré-venda');
        this.showToast('A pré-venda será ativada em breve com um contrato inteligente. Fique atento!', 'info');
    }

    filterShopItems(category) {
        console.log('Filtrando itens da loja por categoria:', category);
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        const categoryBtn = document.querySelector(`[data-category="${category}"]`);
        if (categoryBtn) {
            categoryBtn.classList.add('active');
        }
        document.querySelectorAll('.shop-item').forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    buyItem(event) {
        console.log('Comprando item da loja');
        const itemCard = event.target.closest('.shop-item');
        const itemName = itemCard.querySelector('h4').textContent;
        const itemPrice = parseInt(itemCard.querySelector('.item-price').textContent);
        if (this.userData.spendingBalance < itemPrice) {
            this.showToast('Saldo insuficiente para esta compra.', 'error');
            return;
        }
        this.userData.spendingBalance -= itemPrice;
        this.addTransaction('purchase', `Compra: ${itemName}`, -itemPrice);
        this.updateShopPage();
        this.saveUserData();
        this.backupUserData();
        this.showToast(`${itemName} comprado com sucesso!`, 'success');
    }

    toggleMobileMenu() {
        console.log('Alternando menu móvel');
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.classList.toggle('mobile-active');
        }
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (menuBtn) {
            menuBtn.classList.toggle('active');
        }
    }

    showLoading(message) {
        console.log('Exibindo overlay de carregamento:', message);
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.add('active');
        } else {
            console.error('Elemento loading-overlay não encontrado');
        }
    }

    hideLoading() {
        console.log('Ocultando overlay de carregamento');
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        } else {
            console.error('Elemento loading-overlay não encontrado');
        }
    }

    showToast(message, type = 'info') {
        console.log('Exibindo toast:', message, type);
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.error('Elemento toast-container não encontrado');
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    validateUserData(data) {
        if (!data) return false;
        return (
            typeof data.totalBalance === 'number' &&
            typeof data.stakeBalance === 'number' &&
            typeof data.spendingBalance === 'number' &&
            typeof data.voluntaryStakeBalance === 'number' &&
            typeof data.fractionalYieldObligatory === 'number' &&
            typeof data.fractionalYieldVoluntary === 'number' &&
            typeof data.dailyYieldObligatoryAccumulated === 'number' &&
            typeof data.dailyYieldVoluntaryAccumulated === 'number' &&
            typeof data.lastYieldResetDate === 'string' &&
            Array.isArray(data.completedMissions) &&
            Array.isArray(data.transactions)
        );
    }

    loadUserData() {
        if (!this.wallet) {
            console.log('Nenhuma carteira conectada, pulando carregamento de dados');
            return;
        }
        console.log('Carregando dados do usuário para carteira:', this.wallet);
        const saved = localStorage.getItem(`dethabits_data_${this.wallet}`);
        let data;
        if (saved) {
            try {
                data = JSON.parse(saved);
                if (this.validateUserData(data)) {
                    this.userData = {
                        totalBalance: Number(data.totalBalance) || 0,
                        stakeBalance: Number(data.stakeBalance) || 0,
                        spendingBalance: Number(data.spendingBalance) || 0,
                        voluntaryStakeBalance: Number(data.voluntaryStakeBalance) || 0,
                        fractionalYieldObligatory: Number(data.fractionalYieldObligatory) || 0,
                        fractionalYieldVoluntary: Number(data.fractionalYieldVoluntary) || 0,
                        dailyYieldObligatoryAccumulated: Number(data.dailyYieldObligatoryAccumulated) || 0,
                        dailyYieldVoluntaryAccumulated: Number(data.dailyYieldVoluntaryAccumulated) || 0,
                        lastYieldResetDate: data.lastYieldResetDate || new Date().toDateString(),
                        completedMissions: data.completedMissions || [],
                        transactions: data.transactions || []
                    };
                    if (data.completedMissions) {
                        data.completedMissions.forEach(completed => {
                            const mission = this.missions.find(m => m.id === completed.id);
                            if (mission) {
                                const completedDate = new Date(completed.completedAt).toDateString();
                                const today = new Date().toDateString();
                                mission.completed = completedDate === today;
                            }
                        });
                    }
                    // Resetar acumuladores se o dia mudou
                    const today = new Date().toDateString();
                    if (this.userData.lastYieldResetDate !== today) {
                        this.userData.dailyYieldObligatoryAccumulated = 0;
                        this.userData.dailyYieldVoluntaryAccumulated = 0;
                        this.userData.lastYieldResetDate = today;
                        this.saveUserData();
                        this.backupUserData();
                        console.log('Acumuladores de rendimento resetados para o novo dia');
                    }
                    console.log('Dados carregados com sucesso');
                    return;
                } else {
                    console.warn('Dados primários corrompidos, tentando backup');
                }
            } catch (error) {
                console.error('Erro ao carregar dados primários:', error);
            }
        }
        // Tenta carregar do backup
        const backup = localStorage.getItem(`dethabits_backup_${this.wallet}`);
        if (backup) {
            try {
                data = JSON.parse(backup);
                if (this.validateUserData(data)) {
                    this.userData = {
                        totalBalance: Number(data.totalBalance) || 0,
                        stakeBalance: Number(data.stakeBalance) || 0,
                        spendingBalance: Number(data.spendingBalance) || 0,
                        voluntaryStakeBalance: Number(data.voluntaryStakeBalance) || 0,
                        fractionalYieldObligatory: Number(data.fractionalYieldObligatory) || 0,
                        fractionalYieldVoluntary: Number(data.fractionalYieldVoluntary) || 0,
                        dailyYieldObligatoryAccumulated: Number(data.dailyYieldObligatoryAccumulated) || 0,
                        dailyYieldVoluntaryAccumulated: Number(data.dailyYieldVoluntaryAccumulated) || 0,
                        lastYieldResetDate: data.lastYieldResetDate || new Date().toDateString(),
                        completedMissions: data.completedMissions || [],
                        transactions: data.transactions || []
                    };
                    if (data.completedMissions) {
                        data.completedMissions.forEach(completed => {
                            const mission = this.missions.find(m => m.id === completed.id);
                            if (mission) {
                                const completedDate = new Date(completed.completedAt).toDateString();
                                const today = new Date().toDateString();
                                mission.completed = completedDate === today;
                            }
                        });
                    }
                    // Resetar acumuladores se o dia mudou
                    const today = new Date().toDateString();
                    if (this.userData.lastYieldResetDate !== today) {
                        this.userData.dailyYieldObligatoryAccumulated = 0;
                        this.userData.dailyYieldVoluntaryAccumulated = 0;
                        this.userData.lastYieldResetDate = today;
                        this.saveUserData();
                        console.log('Acumuladores de rendimento resetados para o novo dia');
                    }
                    console.log('Dados restaurados do backup com sucesso');
                    this.saveUserData();
                    return;
                } else {
                    console.warn('Dados de backup corrompidos');
                }
            } catch (error) {
                console.error('Erro ao carregar dados de backup:', error);
            }
        }
        // Se não houver dados válidos, inicializa com valores padrão
        this.userData = {
            totalBalance: 0,
            stakeBalance: 0,
            spendingBalance: 0,
            voluntaryStakeBalance: 0,
            fractionalYieldObligatory: 0,
            fractionalYieldVoluntary: 0,
            dailyYieldObligatoryAccumulated: 0,
            dailyYieldVoluntaryAccumulated: 0,
            lastYieldResetDate: new Date().toDateString(),
            completedMissions: [],
            transactions: []
        };
        this.missions.forEach(mission => mission.completed = false);
        console.log('Dados inicializados com valores padrão');
        this.saveUserData();
        this.backupUserData();
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
                this.showToast('Erro ao salvar dados. Exporte seus dados manualmente.', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar dados do usuário:', error);
            this.showToast('Erro ao salvar dados. Exporte seus dados manualmente.', 'error');
        }
    }

    backupUserData() {
        if (!this.wallet) {
            console.log('Nenhuma carteira conectada, pulando backup de dados');
            return;
        }
        console.log('Fazendo backup dos dados do usuário para carteira:', this.wallet);
        try {
            if (this.validateUserData(this.userData)) {
                localStorage.setItem(`dethabits_backup_${this.wallet}`, JSON.stringify(this.userData));
            } else {
                console.error('Dados inválidos, não fazendo backup');
            }
        } catch (error) {
            console.error('Erro ao fazer backup dos dados:', error);
        }
    }

    startBackupInterval() {
        console.log('Iniciando intervalo de backup automático');
        setInterval(() => {
            if (this.wallet) {
                this.backupUserData();
            }
        }, 60000); // Backup a cada 1 minuto
    }

    exportUserData() {
        if (!this.wallet) {
            this.showToast('Conecte sua carteira primeiro.', 'error');
            return;
        }
        try {
            const dataStr = JSON.stringify(this.userData);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `dethabits_data_${this.wallet}.json`;
            link.click();
            URL.revokeObjectURL(url);
            this.showToast('Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            this.showToast('Erro ao exportar dados.', 'error');
        }
    }

    importUserData(event) {
        const file = event.target.files[0];
        if (!file) {
            this.showToast('Nenhum arquivo selecionado.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (this.validateUserData(data)) {
                    this.userData = {
                        totalBalance: Number(data.totalBalance) || 0,
                        stakeBalance: Number(data.stakeBalance) || 0,
                        spendingBalance: Number(data.spendingBalance) || 0,
                        voluntaryStakeBalance: Number(data.voluntaryStakeBalance) || 0,
                        fractionalYieldObligatory: Number(data.fractionalYieldObligatory) || 0,
                        fractionalYieldVoluntary: Number(data.fractionalYieldVoluntary) || 0,
                        dailyYieldObligatoryAccumulated: Number(data.dailyYieldObligatoryAccumulated) || 0,
                        dailyYieldVoluntaryAccumulated: Number(data.dailyYieldVoluntaryAccumulated) || 0,
                        lastYieldResetDate: data.lastYieldResetDate || new Date().toDateString(),
                        completedMissions: data.completedMissions || [],
                        transactions: data.transactions || []
                    };
                    this.saveUserData();
                    this.backupUserData();
                    this.updateUI();
                    this.showToast('Dados importados com sucesso!', 'success');
                } else {
                    this.showToast('Arquivo de dados inválido.', 'error');
                }
            } catch (error) {
                console.error('Erro ao importar dados:', error);
                this.showToast('Erro ao importar dados.', 'error');
            }
        };
        reader.readAsText(file);
    }

    updateUI() {
        console.log('Atualizando UI geral');
        if (this.wallet) {
            this.updateWalletDisplay();
        }
        if (this.currentPage === 'wallet') {
            this.updateWalletPage();
        }
        if (this.currentPage === 'shop') {
            this.updateShopPage();
        }
        if (this.currentPage === 'missions') {
            this.updateMissionsPage();
        }
    }

    startYieldUpdater() {
        console.log('Iniciando atualizador de rendimento a cada minuto');
        setInterval(() => {
            console.log('Verificando rendimentos...');
            if (this.userData.stakeBalance > 0) {
                let calculatedYield = this.userData.stakeBalance * this.minuteYieldRate;
                let minuteYield = Math.floor(calculatedYield + this.userData.fractionalYieldObligatory);
                this.userData.fractionalYieldObligatory = calculatedYield + this.userData.fractionalYieldObligatory - minuteYield;
                console.log(`Rendimento stake obrigatório: ${minuteYield} DET (calculado: ${calculatedYield}, fractional restante: ${this.userData.fractionalYieldObligatory})`);
                this.userData.stakeBalance += minuteYield;
                this.userData.dailyYieldObligatoryAccumulated += calculatedYield;
                this.saveUserData();
                this.backupUserData();
                this.updateUI();
                if (this.currentPage === 'wallet' && calculatedYield > 0) {
                    this.showToast(`+${calculatedYield.toFixed(5)} DET acumulados no stake obrigatório!`, 'success');
                }
            } else {
                console.log('Nenhum saldo em stake obrigatório, pulando atualização');
            }
            if (this.userData.voluntaryStakeBalance > 0) {
                let calculatedYield = this.userData.voluntaryStakeBalance * this.minuteYieldRate;
                let minuteYield = Math.floor(calculatedYield + this.userData.fractionalYieldVoluntary);
                this.userData.fractionalYieldVoluntary = calculatedYield + this.userData.fractionalYieldVoluntary - minuteYield;
                console.log(`Rendimento stake voluntário: ${minuteYield} DET (calculado: ${calculatedYield}, fractional restante: ${this.userData.fractionalYieldVoluntary})`);
                this.userData.voluntaryStakeBalance += minuteYield;
                this.userData.dailyYieldVoluntaryAccumulated += calculatedYield;
                this.saveUserData();
                this.backupUserData();
                this.updateUI();
                if (this.currentPage === 'wallet' && calculatedYield > 0) {
                    this.showToast(`+${calculatedYield.toFixed(5)} DET acumulados no stake voluntário!`, 'success');
                }
            } else {
                console.log('Nenhum saldo em stake voluntário, pulando atualização');
            }
        }, 60000); // 1 minuto
    }

    stakeVoluntary() {
        console.log('Realizando stake voluntário');
        const amountInput = document.getElementById('stake-amount-input');
        const amount = parseInt(amountInput.value);
        if (isNaN(amount) || amount <= 0 || amount > this.userData.totalBalance) {
            this.showToast('Quantidade inválida ou saldo insuficiente.', 'error');
            return;
        }
        this.userData.totalBalance -= amount;
        this.userData.voluntaryStakeBalance += amount;
        this.addTransaction('stake', `Stake voluntário de ${amount} DET`, -amount);
        this.saveUserData();
        this.backupUserData();
        this.updateWalletPage();
        amountInput.value = '';
        this.showToast(`Stake voluntário de ${amount} DET realizado com sucesso!`, 'success');
    }

    unstakeVoluntary() {
        console.log('Retirando stake voluntário');
        if (this.userData.voluntaryStakeBalance <= 0) {
            this.showToast('Nenhum valor em stake voluntário para retirar.', 'error');
            return;
        }
        const amount = this.userData.voluntaryStakeBalance;
        this.userData.voluntaryStakeBalance = 0;
        this.userData.totalBalance += amount;
        this.addTransaction('unstake', `Retirada de stake voluntário de ${amount} DET`, amount);
        this.saveUserData();
        this.backupUserData();
        this.updateWalletPage();
        this.showToast(`Retirada de ${amount} DET do stake voluntário realizada com sucesso!`, 'success');
    }

    async withdrawToSolana() {
        console.log('Tentando retirada para Solana');
        if (!this.wallet) {
            this.showToast('Carteira não conectada. Conecte sua carteira Phantom primeiro.', 'error');
            return;
        }
        if (this.userData.totalBalance < 800) {
            this.showToast('Saldo mínimo para retirada é 800 DET.', 'error');
            return;
        }
        try {
            this.showLoading('Enviando DET para carteira Solana...');
            const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
            const fromPubkey = new solanaWeb3.PublicKey(this.wallet);
            const toPubkey = new solanaWeb3.PublicKey(this.wallet);
            const tokenMint = new solanaWeb3.PublicKey('TOKEN_MINT_DET_AQUI');
            const fromATA = await splToken.getAssociatedTokenAddress(tokenMint, fromPubkey);
            const toATA = await splToken.getAssociatedTokenAddress(tokenMint, toPubkey);

            const toAccountInfo = await connection.getAccountInfo(toATA);
            if (!toAccountInfo) {
                const transaction = new solanaWeb3.Transaction().add(
                    splToken.createAssociatedTokenAccountInstruction(
                        fromPubkey,
                        toATA,
                        toPubkey,
                        tokenMint
                    )
                );
                const signature = await window.solana.signAndSendTransaction(transaction);
                await connection.confirmTransaction(signature, 'confirmed');
                console.log('Conta de token associada criada:', signature);
            }

            const amount = this.userData.totalBalance * 1e9; // Assumindo 9 decimais para o token DET
            const transaction = new solanaWeb3.Transaction().add(
                splToken.createTransferInstruction(
                    fromATA,
                    toATA,
                    fromPubkey,
                    amount
                )
            );

            const signature = await window.solana.signAndSendTransaction(transaction);
            await connection.confirmTransaction(signature, 'confirmed');
            console.log('Transação de retirada confirmada:', signature);

            this.addTransaction('withdraw', `Retirada de ${this.userData.totalBalance} DET para carteira Solana`, -this.userData.totalBalance);
            this.userData.totalBalance = 0;
            this.saveUserData();
            this.backupUserData();
            this.updateWalletPage();
            this.showToast('Retirada realizada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro na retirada:', error);
            this.showToast('Erro ao realizar a retirada. Tente novamente.', 'error');
        } finally {
            this.hideLoading();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando app');
    window.app = new DetHabitsApp();
});

setInterval(() => {
    if (window.app) {
        window.app.saveUserData();
        window.app.backupUserData();
    }
}, 30000);