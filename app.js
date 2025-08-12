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
                completed: false
            },
            {
                id: 'instagram',
                title: 'Seguir no Instagram',
                description: 'Siga nosso perfil no Instagram e compartilhe uma foto.',
                icon: '📸',
                reward: 5,
                completed: false
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
        
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.updateUI();
        this.startMissionTimer();
        this.loadMissions();
    }

    setupEventListeners() {
        // Connect wallet
        document.getElementById('connect-wallet-btn').addEventListener('click', () => this.connectWallet());
        
        // Navigation
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.navigateTo(e.target.dataset.page));
        });
        
        // Disconnect wallet
        document.getElementById('disconnect-btn').addEventListener('click', () => this.disconnectWallet());
        
        // Presale button
        document.getElementById('presale-btn').addEventListener('click', () => this.navigateTo('presale'));
        
        // Photo modal
        document.getElementById('close-modal').addEventListener('click', () => this.closePhotoModal());
        document.getElementById('photo-input').addEventListener('change', (e) => this.handlePhotoSelect(e));
        document.getElementById('submit-mission-btn').addEventListener('click', () => this.completeMission());
        
        // Presale calculator
        document.getElementById('sol-amount').addEventListener('input', (e) => this.updatePresaleCalculation(e));
        document.getElementById('buy-presale-btn').addEventListener('click', () => this.buyPresale());
        
        // Shop categories
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterShopItems(e.target.dataset.category));
        });
        
        // Buy buttons
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.buyItem(e));
        });
        
        // Mobile menu
        document.getElementById('mobile-menu-btn').addEventListener('click', () => this.toggleMobileMenu());
        
        // Click outside modal to close
        document.getElementById('photo-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closePhotoModal();
            }
        });
    }

    async connectWallet() {
        this.showLoading('Conectando carteira...');

        try {
            // Verifica se o Phantom está disponível (desktop)
            if (window.solana && window.solana.isPhantom) {
                const response = await window.solana.connect();
                this.wallet = response.publicKey.toString();
            } else {
                // Lógica para mobile: tenta abrir o app Phantom via deep link
                const redirectUrl = encodeURIComponent('https://daniloalmeid.github.io/DetHabits-Solana/');
                const deepLink = `phantom://connect?redirect=${redirectUrl}&dapp_name=DetHabits&dapp_url=${encodeURIComponent('https://daniloalmeid.github.io/DetHabits-Solana/')}&action=connect`;
                console.log('Abrindo deep link:', deepLink);
                window.location.href = deepLink;
                console.log('Deep link disparado');

                // Aguarda retorno (15 segundos) e verifica conexão
                await new Promise((resolve) => setTimeout(resolve, 15000));

                if (!this.wallet) {
                    this.hideLoading();
                    console.log('Falha na conexão automática. Verifique o app Phantom para detalhes.');
                    this.showToast('A conexão automática falhou. Por favor, abra https://daniloalmeid.github.io/DetHabits-Solana/ no navegador interno do app Phantom, confirme a conexão e aceite a assinatura, se solicitado.', 'info');
                }
            }

            // Se conectado com sucesso
            if (this.wallet) {
                this.showToast('Carteira conectada com sucesso!', 'success');
                this.navigateTo('missions');
                this.loadUserData();
                this.updateWalletDisplay();
                this.updateUI();
            }
            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            console.error('Erro de conexão com a carteira:', error);
            this.showToast('Erro ao conectar carteira. Tente novamente, reinicie o app Phantom ou abra https://daniloalmeid.github.io/DetHabits-Solana/ no navegador interno do Phantom.', 'error');
        }
    }

    disconnectWallet() {
        // Save current data before disconnecting
        this.saveUserData();
        
        // Clear current session
        this.wallet = null;
        
        // Hide navbar and go to home
        document.getElementById('navbar').style.display = 'none';
        this.navigateTo('home');
        
        this.showToast('Carteira desconectada', 'success');
    }

    updateWalletDisplay() {
        if (this.wallet) {
            document.getElementById('navbar').style.display = 'block';
            document.getElementById('wallet-address').textContent = 
                `${this.wallet.substring(0, 4)}...${this.wallet.substring(this.wallet.length - 4)}`;
            document.getElementById('wallet-address-full').textContent = this.wallet;
        }
    }

    navigateTo(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Show target page
        document.getElementById(`${page}-page`).classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        
        this.currentPage = page;
        
        // Update page-specific content
        if (page === 'wallet') {
            this.updateWalletPage();
        } else if (page === 'missions') {
            this.updateMissionsPage();
        } else if (page === 'shop') {
            this.updateShopPage();
        }
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
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Por favor, selecione uma imagem válida.', 'error');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('A imagem deve ter no máximo 5MB.', 'error');
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('photo-preview').innerHTML = 
                `<img src="${e.target.result}" alt="Preview da missão">`;
            document.getElementById('submit-mission-btn').disabled = false;
        };
        reader.readAsDataURL(file);
    }

    completeMission() {
        if (!this.currentMission) return;
        
        // Mark mission as completed
        this.currentMission.completed = true;
        this.userData.completedMissions.push({
            id: this.currentMission.id,
            completedAt: new Date().toISOString(),
            reward: this.currentMission.reward
        });
        
        // Calculate token distribution
        const totalReward = this.currentMission.reward;
        const stakeAmount = Math.floor(totalReward * 0.1); // 10% to stake
        const spendingAmount = Math.floor(totalReward * 0.1); // 10% to spending
        const walletAmount = totalReward - stakeAmount - spendingAmount; // Remaining to wallet
        
        // Update balances
        this.userData.totalBalance += walletAmount;
        this.userData.stakeBalance += stakeAmount;
        this.userData.spendingBalance += spendingAmount;
        
        // Add transaction
        this.addTransaction('mission', `Missão: ${this.currentMission.title}`, totalReward);
        
        // Update UI
        this.closePhotoModal();
        this.loadMissions();
        this.updateWalletPage();
        this.saveUserData();
        
        this.showToast(`Missão concluída! +${totalReward} DET adicionados`, 'success');
        
        // Check if all missions completed
        const completedToday = this.missions.filter(m => m.completed).length;
        if (completedToday === this.missions.length) {
            setTimeout(() => {
                this.showToast('🎉 Parabéns! Todas as missões do dia foram concluídas!', 'success');
            }, 1000);
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
        this.userData.transactions.unshift({
            id: Date.now(),
            type,
            description,
            amount,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 transactions
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
            const time = new Date(transaction.timestamp).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
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
                <div class="transaction-amount positive">+${transaction.amount} DET</div>
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
        const detAmount = solAmount * 10000; // Example rate: 1 SOL = 10,000 DET
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
        // Update active category button
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Filter items
        document.querySelectorAll('.shop-item').forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
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
        
        // Deduct from spending balance
        this.userData.spendingBalance -= itemPrice;
        
        // Add transaction
        this.addTransaction('purchase', `Compra: ${itemName}`, -itemPrice);
        
        // Update UI
        this.updateShopPage();
        this.saveUserData();
        
        this.showToast(`${itemName} comprado com sucesso!`, 'success');
    }

    toggleMobileMenu() {
        // Mobile menu implementation would go here
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
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    loadUserData() {
        if (!this.wallet) return;
        
        // Load data specific to this wallet address
        const saved = localStorage.getItem(`dethabits_data_${this.wallet}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.userData = { ...this.userData, ...data };
                
                // Restore mission completion status
                if (data.completedMissions) {
                    data.completedMissions.forEach(completed => {
                        const mission = this.missions.find(m => m.id === completed.id);
                        if (mission) {
                            // Check if mission was completed today
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
            // Initialize fresh data for new wallet
            this.userData = {
                totalBalance: 0,
                stakeBalance: 0,
                spendingBalance: 0,
                completedMissions: [],
                transactions: []
            };
            this.missions.forEach(mission => mission.completed = false);
        }
    }

    saveUserData() {
        if (!this.wallet) return;
        
        try {
            // Save data with wallet address as key
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DetHabitsApp();
});

// Auto-save data periodically
setInterval(() => {
    if (window.app) {
        window.app.saveUserData();
    }
}, 30000); // Save every 30 seconds