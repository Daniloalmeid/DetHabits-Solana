class LotterySystem {
    constructor(app) {
        this.app = app;
        this.lotteries = [
            { id: 1, name: "Baú Inicial", cost: 1, minPrize: 1, maxPrize: 3 },
            { id: 2, name: "Baú Simples", cost: 5, minPrize: 4, maxPrize: 12 },
            { id: 3, name: "Baú de Bronze", cost: 10, minPrize: 8, maxPrize: 20 },
            { id: 4, name: "Baú de Prata", cost: 20, minPrize: 16, maxPrize: 40 },
            { id: 5, name: "Baú de Ouro", cost: 40, minPrize: 32, maxPrize: 70 },
            { id: 6, name: "Baú de Platina", cost: 60, minPrize: 50, maxPrize: 100 },
            { id: 7, name: "Baú Épico", cost: 80, minPrize: 65, maxPrize: 130 },
            { id: 8, name: "Baú Mítico", cost: 120, minPrize: 100, maxPrize: 200 },
            { id: 9, name: "Baú Supremo", cost: 250, minPrize: 200, maxPrize: 450 },
            { id: 10, name: "Baú Lendário", cost: 500, minPrize: 400, maxPrize: 900 }
        ];
        this.maxDailyAttempts = 7;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const transferAmountInput = document.getElementById('transfer-amount-input');
        const transferBtn = document.getElementById('transfer-lottery-btn');

        if (transferAmountInput && transferBtn) {
            transferAmountInput.addEventListener('input', () => {
                const amount = parseFloat(transferAmountInput.value);
                const winnings = this.app.userData.lotteryWinnings || 0;
                transferBtn.disabled = !amount || amount <= 0 || amount > winnings || amount > (this.app.userData.spendingBalance || 0);
            });

            transferBtn.addEventListener('click', () => {
                const amount = parseFloat(transferAmountInput.value);
                if (amount && amount > 0) {
                    try {
                        this.app.transferLotteryWinningsToTotal(amount);
                        transferAmountInput.value = '';
                    } catch (error) {
                        this.app.showToast(error.message, 'error');
                    }
                }
            });
        } else {
            console.error('Elementos de transferência não encontrados');
            this.app.showToast('Erro: Elementos de transferência não encontrados.', 'error');
        }
    }

    getCurrentDate() {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    resetDailyAttempts() {
        const today = this.getCurrentDate();
        if (this.app.userData.lastAttemptDate !== today) {
            this.app.userData.lotteryAttempts = {};
            this.app.userData.lastAttemptDate = today;
            this.app.saveUserData();
        }
    }

    createParticles() {
        const particleContainer = document.querySelector('.particle-container');
        if (!particleContainer) return;

        particleContainer.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 1.5}s`;
            particle.style.background = ['#FFD700', '#FFA500', '#FF69B4', '#00CED1'][Math.floor(Math.random() * 4)];
            particleContainer.appendChild(particle);
        }
    }

    showLotteryWinModal(lotteryName, prize) {
        const modal = document.getElementById('lottery-win-modal');
        const message = document.getElementById('lottery-win-message');
        const closeBtn = document.getElementById('close-lottery-modal');

        if (modal && message && closeBtn) {
            message.textContent = `Você abriu o ${lotteryName} e ganhou ${prize.toFixed(5)} DET no Saldo de Gastos!`;
            modal.classList.add('active');
            this.createParticles();

            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            }, { once: true });

            setTimeout(() => {
                modal.classList.remove('active');
            }, 5000);
        } else {
            console.error('Elementos do modal de vitória não encontrados');
            this.app.showToast(`Parabéns! Você ganhou ${prize.toFixed(5)} DET no ${lotteryName}!`, 'success');
        }
    }

    enterLottery(lotteryId) {
        console.log(`Tentando participar do sorteio ${lotteryId}...`);
        this.resetDailyAttempts();

        const lottery = this.lotteries.find(l => l.id === lotteryId);
        if (!lottery) {
            this.app.showToast('Sorteio inválido!', 'error');
            return;
        }

        const today = this.getCurrentDate();
        this.app.userData.lotteryAttempts = this.app.userData.lotteryAttempts || {};
        this.app.userData.lotteryAttempts[lotteryId] = this.app.userData.lotteryAttempts[lotteryId] || { date: today, count: 0 };

        if (this.app.userData.lotteryAttempts[lotteryId].date !== today) {
            this.app.userData.lotteryAttempts[lotteryId] = { date: today, count: 0 };
        }

        if (this.app.userData.lotteryAttempts[lotteryId].count >= this.maxDailyAttempts) {
            this.app.showToast(`Limite de ${this.maxDailyAttempts} tentativas diárias para ${lottery.name} atingido.`, 'error');
            return;
        }

        if ((this.app.userData.spendingBalance || 0) < lottery.cost) {
            this.app.showToast(`Saldo de gastos insuficiente para ${lottery.name}. Necessário: ${lottery.cost} DET`, 'error');
            return;
        }

        try {
            // Deduzir o custo do baú
            this.app.userData.spendingBalance -= lottery.cost;
            // Gerar o prêmio
            const prize = Math.random() * (lottery.maxPrize - lottery.minPrize) + lottery.minPrize;
            // Adicionar o prêmio ao spendingBalance e rastrear em lotteryWinnings
            this.app.userData.spendingBalance += prize;
            this.app.userData.lotteryWinnings = (this.app.userData.lotteryWinnings || 0) + prize;

            // Incrementar tentativas
            this.app.userData.lotteryAttempts[lotteryId].count += 1;

            // Registrar transações separadas para custo e prêmio
            this.app.addTransaction('lottery', `Sorteio ${lottery.name}: Custo ${lottery.cost} DET`, -lottery.cost);
            this.app.addTransaction('lottery', `Sorteio ${lottery.name}: Prêmio ${prize.toFixed(5)} DET`, prize);

            this.app.saveUserData();
            this.app.updateUI();

            this.showLotteryWinModal(lottery.name, prize);
            console.log(`Sorteio ${lottery.name} concluído: Custo ${lottery.cost} DET, Prêmio ${prize.toFixed(5)} DET, Resultado líquido: ${(prize - lottery.cost).toFixed(5)} DET`);
        } catch (error) {
            console.error('Erro ao processar sorteio:', error);
            this.app.showToast('Erro ao processar o sorteio. Tente novamente.', 'error');
        }
    }
}

window.lottery = new LotterySystem(window.app);
export default LotterySystem;