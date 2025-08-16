// staking.js
export class StakingManager {
    constructor(userData, minuteYieldRate, saveCallback, backupCallback, updateUICallback, showToastCallback) {
        this.userData = userData;
        this.minuteYieldRate = minuteYieldRate || 300 / (365 * 24 * 60) / 100; // 300% ao ano por minuto
        this.saveCallback = saveCallback;
        this.backupCallback = backupCallback;
        this.updateUICallback = updateUICallback;
        this.showToastCallback = showToastCallback;
    }

    startYieldUpdater() {
        console.log('Iniciando atualizador de rendimento de staking');
        setInterval(() => {
            console.log('Verificando rendimentos...');
            // Stake Obrigatório
            if (this.userData.stakeBalance > 0) {
                const calculatedYield = this.userData.stakeBalance * this.minuteYieldRate;
                this.userData.fractionalYieldObligatory += calculatedYield;
                const minuteYield = Math.floor(this.userData.fractionalYieldObligatory);
                if (minuteYield > 0) {
                    this.userData.stakeBalance += minuteYield;
                    this.userData.fractionalYieldObligatory -= minuteYield;
                    this.userData.dailyYieldObligatoryAccumulated += minuteYield;
                    this.addTransaction('yield', `Rendimento de stake obrigatório`, minuteYield);
                    this.showToastCallback(`+${minuteYield} DET acumulados no stake obrigatório!`, 'success');
                }
                console.log(`Rendimento stake obrigatório: ${minuteYield} DET (calculado: ${calculatedYield}, fractional restante: ${this.userData.fractionalYieldObligatory})`);
            }
            // Stake Voluntário
            if (this.userData.voluntaryStakeBalance > 0) {
                const calculatedYield = this.userData.voluntaryStakeBalance * this.minuteYieldRate;
                this.userData.fractionalYieldVoluntary += calculatedYield;
                const minuteYield = Math.floor(this.userData.fractionalYieldVoluntary);
                if (minuteYield > 0) {
                    this.userData.voluntaryStakeBalance += minuteYield;
                    this.userData.fractionalYieldVoluntary -= minuteYield;
                    this.userData.dailyYieldVoluntaryAccumulated += minuteYield;
                    this.addTransaction('yield', `Rendimento de stake voluntário`, minuteYield);
                    this.showToastCallback(`+${minuteYield} DET acumulados no stake voluntário!`, 'success');
                }
                console.log(`Rendimento stake voluntário: ${minuteYield} DET (calculado: ${calculatedYield}, fractional restante: ${this.userData.fractionalYieldVoluntary})`);
            }
            this.saveCallback();
            this.backupCallback();
            this.updateUICallback();
        }, 60000);
    }

    stakeVoluntary(amount) {
        if (isNaN(amount) || amount <= 0 || amount > this.userData.totalBalance) {
            throw new Error('Quantidade inválida ou saldo insuficiente.');
        }
        this.userData.totalBalance -= amount;
        this.userData.voluntaryStakeBalance += amount;
        this.addTransaction('stake', `Stake voluntário de ${amount} DET`, -amount);
        this.saveCallback();
        this.backupCallback();
        this.updateUICallback();
        return amount;
    }

    unstakeVoluntary() {
        if (this.userData.voluntaryStakeBalance <= 0 && this.userData.fractionalYieldVoluntary <= 0) {
            throw new Error('Nenhum valor em stake voluntário para retirar.');
        }
        const amount = this.userData.voluntaryStakeBalance + Math.floor(this.userData.fractionalYieldVoluntary);
        this.userData.voluntaryStakeBalance = 0;
        this.userData.fractionalYieldVoluntary = 0;
        this.userData.dailyYieldVoluntaryAccumulated = 0;
        this.userData.totalBalance += amount;
        this.addTransaction('unstake', `Retirada de stake voluntário de ${amount} DET`, amount);
        this.saveCallback();
        this.backupCallback();
        this.updateUICallback();
        return amount;
    }

    withdrawObligatory(amount) {
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Quantidade inválida para saque.');
        }
        if (this.userData.stakeBalance <= 0) {
            throw new Error('Nenhum valor em stake obrigatório para retirar.');
        }
        const totalAvailable = this.userData.stakeBalance + Math.floor(this.userData.fractionalYieldObligatory);
        if (amount > totalAvailable) {
            throw new Error('Quantidade excede o valor disponível (stake + rendimentos).');
        }
        if (!this.canWithdrawObligatory()) {
            throw new Error('Stake obrigatório bloqueado por 90 dias. Tente novamente após o período de bloqueio.');
        }
        this.userData.stakeBalance -= amount;
        this.userData.totalBalance += amount;
        this.addTransaction('unstake', `Saque de ${amount} DET do stake obrigatório`, amount);
        if (this.userData.stakeBalance === 0) {
            this.userData.fractionalYieldObligatory = 0;
            this.userData.dailyYieldObligatoryAccumulated = 0;
            this.userData.stakeStartDate = null; // Resetar data de início
        }
        this.saveCallback();
        this.backupCallback();
        this.updateUICallback();
        return amount;
    }

    withdrawMaxObligatory() {
        if (this.userData.stakeBalance <= 0 && this.userData.fractionalYieldObligatory <= 0) {
            throw new Error('Nenhum valor em stake obrigatório para retirar.');
        }
        if (!this.canWithdrawObligatory()) {
            throw new Error('Stake obrigatório bloqueado por 90 dias. Tente novamente após o período de bloqueio.');
        }
        const amount = this.userData.stakeBalance + Math.floor(this.userData.fractionalYieldObligatory);
        this.userData.stakeBalance = 0;
        this.userData.fractionalYieldObligatory = 0;
        this.userData.dailyYieldObligatoryAccumulated = 0;
        this.userData.stakeStartDate = null; // Resetar data de início
        this.userData.totalBalance += amount;
        this.addTransaction('unstake', `Retirada máxima de stake obrigatório de ${amount} DET`, amount);
        this.saveCallback();
        this.backupCallback();
        this.updateUICallback();
        return amount;
    }

    withdrawMaxVoluntary() {
        if (this.userData.voluntaryStakeBalance <= 0 && this.userData.fractionalYieldVoluntary <= 0) {
            throw new Error('Nenhum valor em stake voluntário para retirar.');
        }
        const amount = this.userData.voluntaryStakeBalance + Math.floor(this.userData.fractionalYieldVoluntary);
        this.userData.voluntaryStakeBalance = 0;
        this.userData.fractionalYieldVoluntary = 0;
        this.userData.dailyYieldVoluntaryAccumulated = 0;
        this.userData.totalBalance += amount;
        this.addTransaction('unstake', `Retirada máxima de stake voluntário de ${amount} DET`, amount);
        this.saveCallback();
        this.backupCallback();
        this.updateUICallback();
        return amount;
    }

    canWithdrawObligatory() {
        if (!this.userData.stakeStartDate) {
            return false; // Nenhum stake foi feito
        }
        const startDate = new Date(this.userData.stakeStartDate);
        const now = new Date();
        const diffDays = (now - startDate) / (1000 * 60 * 60 * 24);
        return diffDays >= 90; // Permitir saque após 90 dias
    }

    addTransaction(type, description, amount) {
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
    }

    resetDailyYields() {
        const today = new Date().toDateString();
        if (this.userData.lastYieldResetDate !== today) {
            this.userData.dailyYieldObligatoryAccumulated = 0;
            this.userData.dailyYieldVoluntaryAccumulated = 0;
            this.userData.lastYieldResetDate = today;
            this.saveCallback();
            this.backupCallback();
        }
    }

    // Registrar data de início do stake obrigatório
    registerObligatoryStake(amount) {
        if (amount > 0 && !this.userData.stakeStartDate) {
            this.userData.stakeStartDate = new Date().toISOString();
            this.saveCallback();
            this.backupCallback();
        }
    }
}