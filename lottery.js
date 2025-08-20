/* global window */

class LotterySystem {
    constructor() {
        this.lotteries = [
            { id: 1, name: 'Baú Inicial', cost: 1, minPrize: 1, maxPrize: 3 },
            { id: 2, name: 'Baú Simples', cost: 5, minPrize: 4, maxPrize: 12 },
            { id: 3, name: 'Baú de Bronze', cost: 10, minPrize: 8, maxPrize: 20 },
            { id: 4, name: 'Baú de Prata', cost: 20, minPrize: 16, maxPrize: 40 },
            { id: 5, name: 'Baú de Ouro', cost: 40, minPrize: 32, maxPrize: 70 },
            { id: 6, name: 'Baú de Platina', cost: 60, minPrize: 50, maxPrize: 100 },
            { id: 7, name: 'Baú Épico', cost: 80, minPrize: 65, maxPrize: 130 },
            { id: 8, name: 'Baú Mítico', cost: 120, minPrize: 100, maxPrize: 200 },
            { id: 9, name: 'Baú Supremo', cost: 250, minPrize: 200, maxPrize: 450 },
            {
                id: 10,
                name: 'Baú Lendário',
                cost: 500,
                minPrize: 400,
                maxPrize: 900,
                prizeRanges: [
                    { min: 400, max: 600, probability: 0.80 },
                    { min: 601, max: 700, probability: 0.15 },
                    { min: 701, max: 900, probability: 0.05 }
                ]
            }
        ];
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('Configurando event listeners para sorteios...');
        const lotteryGrid = document.querySelector('.lottery-grid');
        if (lotteryGrid) {
            lotteryGrid.addEventListener('click', (e) => {
                if (e.target.classList.contains('lottery-btn')) {
                    const lotteryId = parseInt(e.target.getAttribute('onclick').match(/\d+/)[0]);
                    this.enterLottery(lotteryId);
                }
            });
        }
    }

    enterLottery(lotteryId) {
        console.log(`Tentando participar do sorteio ${lotteryId}...`);
        try {
            if (!window.app || !window.app.userData) {
                console.error('Aplicação DetHabits não inicializada');
                window.app.showToast('Erro: Aplicação não inicializada.', 'error');
                return;
            }

            const lottery = this.lotteries.find(l => l.id === lotteryId);
            if (!lottery) {
                console.error('Sorteio não encontrado:', lotteryId);
                window.app.showToast('Sorteio não encontrado.', 'error');
                return;
            }

            const cost = lottery.cost;
            if ((window.app.userData.spendingBalance || 0) < cost) {
                console.error('Saldo insuficiente para sorteio:', {
                    spendingBalance: window.app.userData.spendingBalance,
                    cost
                });
                window.app.showToast(`Saldo insuficiente. Você precisa de ${cost} DET para abrir o ${lottery.name}.`, 'error');
                return;
            }

            // Debitar custo do spendingBalance
            window.app.userData.spendingBalance -= cost;
            window.app.addTransaction('lottery', `Abertura do ${lottery.name}: -${cost.toFixed(5)} DET`, -cost);

            // Calcular prêmio
            let prize;
            if (lottery.id === 10) {
                // Baú Lendário com probabilidades ponderadas
                const rand = Math.random();
                let cumulativeProbability = 0;
                for (const range of lottery.prizeRanges) {
                    cumulativeProbability += range.probability;
                    if (rand <= cumulativeProbability) {
                        prize = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
                        break;
                    }
                }
            } else {
                // Sorteios normais com distribuição uniforme
                prize = Math.floor(Math.random() * (lottery.maxPrize - lottery.minPrize + 1)) + lottery.minPrize;
            }

            // Adicionar prêmio ao totalBalance
            window.app.userData.totalBalance = (window.app.userData.totalBalance || 0) + prize;
            window.app.addTransaction('lottery', `Prêmio do ${lottery.name}: +${prize.toFixed(5)} DET`, prize);

            // Salvar dados e atualizar UI
            window.app.saveUserData();
            window.app.updateUI();
            window.app.showToast(`Você abriu o ${lottery.name} e ganhou ${prize.toFixed(5)} DET!`, 'success');
            console.log(`Sorteio ${lottery.name} concluído: Custo ${cost} DET, Prêmio ${prize} DET`);
        } catch (error) {
            console.error('Erro ao participar do sorteio:', error);
            window.app.showToast('Erro ao abrir o baú.', 'error');
        }
    }
}

window.lottery = new LotterySystem();