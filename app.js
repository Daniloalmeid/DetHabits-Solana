// DetHabits Application
class DetHabitsApp {
    constructor() {
        this.wallet = null;
        this.userData = {
            totalBalance: 0,
            stakeBalance: 0,
            spendingBalance: 0,
            completedMissions: [],
            transactions: []
        };
        this.missions = [
            { id: 'water', title: 'Beber 1 Copo de Água', description: 'Hidrate-se bebendo pelo menos um copo de água e comprove com uma foto.', icon: '💧', reward: 5, completed: false },
            { id: 'twitter', title: 'Seguir no X (Twitter)', description: 'Siga nossa conta oficial no X e tire um print da tela.', icon: '🐦', reward: 5, completed: false },
            { id: 'instagram', title: 'Seguir no Instagram', description: 'Siga nosso perfil no Instagram e compartilhe uma foto.', icon: '📸', reward: 5, completed: false },
            { id: 'walk', title: 'Caminhar por 5 Minutos', description: 'Faça uma caminhada de pelo menos 5 minutos e registre o momento.', icon: '🚶', reward: 5, completed: false },
            { id: 'meditation', title: 'Meditar por 3 Minutos', description: 'Dedique 3 minutos para meditação e tire uma selfie relaxante.', icon: '🧘', reward: 5, completed: false }
        ];
        this.currentPage = 'home';
        this.currentMission = null;

        this.init();
    }

    init() {
        this.checkPhantomRedirect();
        this.loadUserData();
        this.setupEventListeners();
        this.updateUI();
        this.startMissionTimer();
        this.loadMissions();
    }

    setupEventListeners() {
        document.getElementById('connect-wallet-btn').addEventListener('click', () => this.connectWallet());
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.navigateTo(e.target.dataset.page));
        });
        document.getElementById('disconnect-btn').addEventListener('click', () => this.disconnectWallet());
        document.getElementById('presale-btn').addEventListener('click', () => this.navigateTo('presale'));
        document.getElementById('close-modal').addEventListener('click', () => this.closePhotoModal());
        document.getElementById('photo-input').addEventListener('change', (e) => this.handlePhotoSelect(e));
        document.getElementById('submit-mission-btn').addEventListener('click', () => this.completeMission());
        document.getElementById('sol-amount').addEventListener('input', (e) => this.updatePresaleCalculation(e));
        document.getElementById('buy-presale-btn').addEventListener('click', () => this.buyPresale());
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterShopItems(e.target.dataset.category));
        });
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.buyItem(e));
        });
        document.getElementById('mobile-menu-btn').addEventListener('click', () => this.toggleMobileMenu());
        document.getElementById('photo-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closePhotoModal();
            }
        });
    }

    async connectWallet() {
        this.showLoading('Conectando carteira...');
        try {
            if (window.solana && window.solana.isPhantom) {
                // Desktop Phantom
                const response = await window.solana.connect();
                this.wallet = response.publicKey.toString();
                this.finishWalletConnection();
            } else {
                // Mobile Phantom Universal Link
                const appUrl = encodeURIComponent('https://daniloalmeid.github.io/DetHabits-Solana/');
                const redirectLink = encodeURIComponent(window.location.href);
                const deepLink = `https://phantom.app/ul/v1/connect?app_url=${appUrl}&redirect_link=${redirectLink}`;
                window.location.href = deepLink;
            }
        } catch (error) {
            console.error('Erro de conexão com a carteira:', error);
            this.showToast('Erro ao conectar carteira.', 'error');
        }
        this.hideLoading();
    }

    checkPhantomRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        const publicKey = urlParams.get('public_key');
        if (publicKey) {
            this.wallet = publicKey;
            this.showToast('Carteira conectada com sucesso!', 'success');
            this.finishWalletConnection();
            // Remove parâmetros da URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    finishWalletConnection() {
        this.navigateTo('missions');
        this.loadUserData();
        this.updateWalletDisplay();
        this.updateUI();
    }

    disconnectWallet() {
        this.saveUserData();
        this.wallet = null;
        document.getElementById('navbar').style.display = 'none';
        this.navigateTo('home');
        this.showToast('Carteira desconectada', 'success');
    }

    updateWalletDisplay() {
        if (this.wallet) {
            document.getElementById('navbar').style.display = 'block';
            document.getElementById('wallet-address').textContent = `${this.wallet.substring(0, 4)}...${this.wallet.substring(this.wallet.length - 4)}`;
            document.getElementById('wallet-address-full').textContent = this.wallet;
        }
    }

    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        this.currentPage = page;
        if (page === 'wallet') this.updateWalletPage();
        else if (page === 'missions') this.updateMissionsPage();
        else if (page === 'shop') this.updateShopPage();
    }

    loadMissions() {
        const missionsGrid = document.getElementById('missions-grid');
        missionsGrid.innerHTML = '';
        this.missions.forEach(mission => {
            const missionCard = this.createMissionCard(mission);
            missionsGrid.appendChild(missionCard);
        });
        this.updateMissionProgress();
    }

    createMissionCard(mission) {
        const card = document.createElement('div');
        card.className = `mission-card ${mission.completed ? 'completed' : ''}`;
        card.innerHTML = `
            <div class="mission-header">
                <div class="mission-icon">${mission.icon}</div>
                <div class="mission-reward">+${mission.reward} DET</div>
            </div>
            <div class="mission-title">${mission.title}</div>
            <div class="mission-description">${mission.description}</div>
            <button class="mission-button ${mission.completed ? 'completed' : 'pending'}" 
                    ${mission.completed ? 'disabled' : ''} 
                    onclick="app.openPhotoModal('${mission.id}')">
                ${mission.completed ? '✅ Concluída' : '📷 Completar Missão'}
            </button>
        `;
        return card;
    }

    openPhotoModal(missionId) {
        this.currentMission = this.missions.find(m => m.id === missionId);
        if (!this.currentMission || this.currentMission.completed) return;
        document.getElementById('modal-mission-title').textContent = this.currentMission.title;
        document.getElementById('photo-modal').classList.add('active');
        document.getElementById('submit-mission-btn').disabled = true;
        document.getElementById('photo-preview').innerHTML = '';
    }

    closePhotoModal() {
        document.getElementById('photo-modal').classList.remove('active');
        document.getElementById('photo-input').value = '';
        document.getElementById('photo-preview').innerHTML = '';
        this.currentMission = null;
    }

    handlePhotoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
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
            document.getElementById('photo-preview').innerHTML = `<img src="${e.target.result}" alt="Preview da missão">`;
            document.getElementById('submit-mission-btn').disabled = false;
        };
        reader.readAsDataURL(file);
    }

    completeMission() {
        if (!this.currentMission) return;
        this.currentMission.completed = true;
        this.userData.completedMissions.push({
            id: this.currentMission.id,
            completedAt: new Date().toISOString(),
            reward: this.currentMission.reward
        });
        const totalReward = this.currentMission.reward;
        const stakeAmount = Math.floor(totalReward * 0.1);
        const spendingAmount = Math.floor(totalReward * 0.1);
        const walletAmount = totalReward - stakeAmount - spendingAmount;
        this.userData.totalBalance += walletAmount;
        this.userData.stakeBalance += stakeAmount;
        this.userData.spendingBalance += spendingAmount;
        this.addTransaction('mission', `Missão: ${this.currentMission.title}`, totalReward);
        this.closePhotoModal();
        this.loadMissions();
        this.updateWalletPage();
        this.saveUserData();
        this.showToast(`Missão concluída! +${totalReward} DET adicionados`, 'success');
        if (this.missions.filter(m => m.completed).length === this.missions.length) {
            setTimeout(() => this.showToast('🎉 Parabéns! Todas as missões do dia foram concluídas!', 'success'), 1000);
        }
    }

    updateMissionProgress() {
        const completedCount = this.missions.filter(m => m.completed).length;
        const progressPercentage = (completedCount / this.missions.length) * 100;
        document.getElementById('daily-progress').style.width = `${progressPercentage}%`;
        document.getElementById('completed-missions').textContent = completedCount;
    }

    updateMissionsPage() {
        this.loadMissions();
        this.updateMissionProgress();
    }

    updateWalletPage() {
        document.getElementById('total-balance').textContent = this.userData.totalBalance;
        document.getElementById('stake-balance').textContent = this.userData.stakeBalance;
        document.getElementById('spending-balance').textContent = this.userData.spendingBalance;
        document.getElementById('daily-yield').textContent = `+${Math.floor(this.userData.stakeBalance * 0.008)}`;
        this.loadTransactionHistory();
    }

    updateShopPage() {
        document.getElementById('shop-balance').textContent = `${this.userData.spendingBalance} DET`;
    }

    addTransaction(type, description, amount) {
        this.userData.transactions.unshift({ id: Date.now(), type, description, amount, timestamp: new Date().toISOString() });
        if (this.userData.transactions.length > 50) {
            this.userData.transactions = this.userData.transactions.slice(0, 50);
        }
    }

    loadTransactionHistory() {
        const historyContainer = document.getElementById('transaction-history');
        historyContainer.innerHTML = '';
        if (this.userData.transactions.length === 0) {
            historyContainer.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">Nenhuma transação encontrada</p>';
            return;
        }
        this.userData.transactions.forEach(transaction => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            const date = new Date(transaction.timestamp).toLocaleDateString('pt-BR');
            const time = new Date(transaction.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            item.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.type}">
                        ${transaction.type === 'mission' ? '🎯' : transaction.type === 'stake' ? '🏦' : '🛍️'}
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
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            document.getElementById('mission-timer').textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    updatePresaleCalculation(event) {
        const solAmount = parseFloat(event.target.value) || 0;
        const detAmount = solAmount * 10000;
        document.getElementById('det-amount').value = detAmount.toLocaleString('pt-BR');
    }

    buyPresale() {
        const solAmount = document.getElementById('sol-amount').value;
        if (!solAmount || parseFloat(solAmount) <= 0) {
            this.showToast('Por favor, insira um valor válido em SOL.', 'error');
            return;
        }
        this.showToast('Funcionalidade de compra será implementada em breve!', 'info');
    }

    filterShopItems(category) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        document.querySelectorAll('.shop-item').forEach(item => {
            item.style.display = (category === 'all' || item.dataset.category === category) ? 'block' : 'none';
        });
    }

    buyItem(event) {
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
        this.showToast(`${itemName} comprado com sucesso!`, 'success');
    }

    toggleMobileMenu() {
        this.showToast('Menu mobile em desenvolvimento', 'info');
    }

    showLoading(message) {
        const overlay = document.getElementById('loading-overlay');
        overlay.querySelector('p').textContent = message;
        overlay.classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    loadUserData() {
        if (!this.wallet) return;
        const saved = localStorage.getItem(`dethabits_data_${this.wallet}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.userData = { ...this.userData, ...data };
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
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        } else {
            this.userData = { totalBalance: 0, stakeBalance: 0, spendingBalance: 0, completedMissions: [], transactions: [] };
            this.missions.forEach(mission => mission.completed = false);
        }
    }

    saveUserData() {
        if (!this.wallet) return;
        try {
            localStorage.setItem(`dethabits_data_${this.wallet}`, JSON.stringify(this.userData));
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    updateUI() {
        if (this.wallet) {
            this.updateWalletDisplay();
        }
        this.updateWalletPage();
        this.updateShopPage();
        this.updateMissionsPage();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new DetHabitsApp();
});
setInterval(() => {
    if (window.app) window.app.saveUserData();
}, 30000);
