import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';

class LotterySystem {
    constructor(app) {
        this.app = app;
        this.connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
        this.tokenMintAddress = new PublicKey('DET_TOKEN_MINT_ADDRESS'); // Substitua pelo endereço real do token DET
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
        this.dailyAttempts = {};
        this.maxDailyAttempts = 7;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const transferBtn = document.getElementById('transfer-lottery-btn');
        if (transferBtn) {
            transferBtn.addEventListener('click', async () => {
                console.log('Botão de transferência clicado');
                try {
                    await this.transferLotteryWinnings();
                } catch (error) {
                    console.error('Erro ao transferir ganhos de sorteios:', error);
                    this.app.showToast('Erro ao transferir ganhos de sorteios. Tente novamente.', 'error');
                }
            });
        } else {
            console.error('Botão de transferência (#transfer-lottery-btn) não encontrado');
        }
    }

    getCurrentDate() {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    resetDailyAttempts() {
        const today = this.getCurrentDate();
        if (this.app.userData.lastAttemptDate !== today) {
            this.dailyAttempts = {};
            this.app.userData.lastAttemptDate = today;
            this.app.saveUserData();
        }
    }

    async getTokenAccount(walletAddress, mintAddress) {
        try {
            const tokenAccounts = await this.connection.getTokenAccountsByOwner(
                new PublicKey(walletAddress),
                { mint: mintAddress }
            );
            if (tokenAccounts.value.length > 0) {
                return tokenAccounts.value[0].pubkey;
            }
            throw new Error('Conta de token não encontrada');
        } catch (error) {
            console.error('Erro ao obter conta de token:', error);
            throw error;
        }
    }

    async enterLottery(lotteryId) {
        console.log(`Tentando participar do sorteio ${lotteryId}...`);
        this.resetDailyAttempts();

        const lottery = this.lotteries.find(l => l.id === lotteryId);
        if (!lottery) {
            this.app.showToast('Sorteio inválido!', 'error');
            return;
        }

        const today = this.getCurrentDate();
        this.dailyAttempts[lotteryId] = this.dailyAttempts[lotteryId] || { date: today, count: 0 };

        if (this.dailyAttempts[lotteryId].date !== today) {
            this.dailyAttempts[lotteryId] = { date: today, count: 0 };
        }

        if (this.dailyAttempts[lotteryId].count >= this.maxDailyAttempts) {
            this.app.showToast(`Limite de ${this.maxDailyAttempts} tentativas diárias para ${lottery.name} atingido.`, 'error');
            return;
        }

        if (this.app.userData.spendingBalance < lottery.cost) {
            this.app.showToast(`Saldo de gastos insuficiente para ${lottery.name}. Necessário: ${lottery.cost} DET`, 'error');
            return;
        }

        try {
            const userWallet = this.app.publicKey;
            if (!userWallet) {
                this.app.showToast('Carteira não conectada!', 'error');
                return;
            }

            const sourceTokenAccount = await this.getTokenAccount(userWallet.toString(), this.tokenMintAddress);
            const destinationTokenAccount = await this.getTokenAccount('LOTTERY_WALLET_ADDRESS', this.tokenMintAddress); // Substitua pelo endereço real da carteira de sorteios

            const transaction = new Transaction().add(
                createTransferInstruction(
                    sourceTokenAccount,
                    destinationTokenAccount,
                    userWallet,
                    BigInt(Math.round(lottery.cost * 10 ** 9)), // Ajustar para decimais do token
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = userWallet;

            const signedTransaction = await this.app.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            await this.connection.confirmTransaction(signature);

            this.app.userData.spendingBalance -= lottery.cost;
            const prize = Math.random() * (lottery.maxPrize - lottery.minPrize) + lottery.minPrize;
            this.app.userData.spendingBalance += prize;
            this.app.userData.lotteryWinnings = (this.app.userData.lotteryWinnings || 0) + prize;

            this.dailyAttempts[lotteryId].count += 1;
            this.app.userData.transactions.push({
                type: 'lottery',
                description: `Sorteio ${lottery.name}: Custo ${lottery.cost} DET, Prêmio ${prize.toFixed(5)} DET`,
                amount: prize - lottery.cost,
                timestamp: new Date().toISOString()
            });

            this.app.saveUserData();
            this.app.updateUI();

            // Notificação visual atrativa
            this.app.showToast(`🎉 Parabéns! Você abriu o ${lottery.name} e ganhou ${prize.toFixed(5)} DET!`, 'lottery-win');
            console.log(`Sorteio ${lottery.name} concluído: Custo ${lottery.cost} DET, Prêmio ${prize.toFixed(5)} DET`);
        } catch (error) {
            console.error('Erro ao processar sorteio:', error);
            this.app.showToast('Erro ao processar o sorteio. Tente novamente.', 'error');
        }
    }

    async transferLotteryWinnings() {
        const winnings = this.app.userData.lotteryWinnings || 0;
        if (winnings <= 0) {
            this.app.showToast('Nenhum ganho de sorteios disponível para transferência.', 'error');
            return;
        }

        try {
            const userWallet = this.app.publicKey;
            if (!userWallet) {
                this.app.showToast('Carteira não conectada!', 'error');
                return;
            }

            const sourceTokenAccount = await this.getTokenAccount(userWallet.toString(), this.tokenMintAddress);
            const destinationTokenAccount = await this.getTokenAccount(userWallet.toString(), this.tokenMintAddress); // Mesma conta para transferência interna

            const transaction = new Transaction().add(
                createTransferInstruction(
                    sourceTokenAccount,
                    destinationTokenAccount,
                    userWallet,
                    BigInt(Math.round(winnings * 10 ** 9)), // Ajustar para decimais do token
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = userWallet;

            const signedTransaction = await this.app.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            await this.connection.confirmTransaction(signature);

            this.app.userData.totalBalance += winnings;
            this.app.userData.spendingBalance -= winnings;
            this.app.userData.lotteryWinnings = 0;

            this.app.userData.transactions.push({
                type: 'transfer',
                description: `Transferência de ${winnings.toFixed(5)} DET de ganhos de sorteios para Saldo Total`,
                amount: winnings,
                timestamp: new Date().toISOString()
            });

            this.app.saveUserData();
            this.app.updateUI();

            this.app.showToast(`Transferência de ${winnings.toFixed(5)} DET para Saldo Total realizada com sucesso!`, 'success');
            console.log(`Transferência de ${winnings.toFixed(5)} DET realizada com sucesso`);
        } catch (error) {
            console.error('Erro ao transferir ganhos:', error);
            this.app.showToast('Erro ao transferir ganhos de sorteios. Tente novamente.', 'error');
        }
    }
}

window.LotterySystem = LotterySystem;
export default LotterySystem;