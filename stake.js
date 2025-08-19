class StakeManager {
    constructor() {
        console.log('Inicializando StakeManager...');
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
            transactions: []
        };
        this.minuteYieldRate = 300 / (365 * 24 * 60) / 100; // Taxa de rendimento de 300% ao ano
        this.yieldInterval = null;
    }

    async init() {
        console.log('Inicializando aplicação de staking...');
        try {
            this.loadUserData();
            this.setupEventListeners();
            this.startYieldUpdater();
            this.updateUI();
        } catch (error) {
            console.error('Erro durante inicialização:', error);
            this.showToast('Erro ao inicializar a aplicação. Verifique o console.', 'error');
        }
    }

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
            this.hideLoading();
        }
    }

    disconnectWallet() {
        console.log('Desconectando carteira...');
        this.saveUserData();
        this.wallet = null;
        this.updateWalletDisplay();
        this.showToast('Carteira desconectada', 'success');
    }

    updateWalletDisplay() {
        console.log('Atualizando display da carteira');
        const walletAddressElement = document.getElementById('wallet-address');
        if (walletAddressElement) {
            walletAddressElement.textContent = this.wallet
                ? `${this.wallet.substring(0, 4)}...${this.wallet.substring(this.wallet.length - 4)}`
                : 'Não conectado';
        } else {
            console.warn('Elemento wallet-address não encontrado');
        }
    }

    updateUI() {
        console.log('Atualizando UI');
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
        const withdrawMaxObligatoryButton = document.getElementById('withdraw-max-obligatory-btn');
        if (withdrawMaxObligatoryButton) {
            withdrawMaxObligatoryButton.disabled = (this.userData.stakeBalance || 0) <= 0;
        }
        const withdrawMaxVoluntaryButton = document.getElementById('withdraw-max-voluntary-btn');
        if (withdrawMaxVoluntaryButton) {
            withdrawMaxVoluntaryButton.disabled = (this.userData.voluntaryStakeBalance || 0) <= 0;
        }
        this.loadTransactionHistory();
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
                        ${transaction.type === 'stake' ? '🏦' : '↗️'}
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
            Array.isArray(data.transactions)
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
                        transactions: data.transactions || []
                    };
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
            transactions: []
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

    setupEventListeners() {
        console.log('Configurando event listeners...');
        const connectButton = document.getElementById('connect-wallet-btn');
        if (connectButton) {
            connectButton.addEventListener('click', () => this.connectWallet());
        } else {
            console.warn('Botão connect-wallet-btn não encontrado');
        }
        const disconnectButton = document.getElementById('disconnect-btn');
        if (disconnectButton) {
            disconnectButton.addEventListener('click', () => this.disconnectWallet());
        } else {
            console.warn('Botão disconnect-btn não encontrado');
        }
        const stakeVoluntaryButton = document.getElementById('stake-voluntary-btn');
        if (stakeVoluntaryButton) {
            stakeVoluntaryButton.addEventListener('click', () => this.stakeVoluntary());
        } else {
            console.warn('Botão stake-voluntary-btn não encontrado');
        }
        const unstakeVoluntaryButton = document.getElementById('unstake-voluntary-btn');
        if (unstakeVoluntaryButton) {
            unstakeVoluntaryButton.addEventListener('click', () => this.unstakeVoluntary());
        } else {
            console.warn('Botão unstake-voluntary-btn não encontrado');
        }
        const withdrawMaxObligatoryButton = document.getElementById('withdraw-max-obligatory-btn');
        if (withdrawMaxObligatoryButton) {
            withdrawMaxObligatoryButton.addEventListener('click', () => this.withdrawMaxObligatory());
        } else {
            console.warn('Botão withdraw-max-obligatory-btn não encontrado');
        }
        const withdrawMaxVoluntaryButton = document.getElementById('withdraw-max-voluntary-btn');
        if (withdrawMaxVoluntaryButton) {
            withdrawMaxVoluntaryButton.addEventListener('click', () => this.withdrawMaxVoluntary());
        } else {
            console.warn('Botão withdraw-max-voluntary-btn não encontrado');
        }
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando app');
    try {
        window.stakeApp = new StakeManager();
        window.stakeApp.init();
    } catch (error) {
        console.error('Erro ao inicializar StakeManager:', error);
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