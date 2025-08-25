const { Connection, Keypair, PublicKey, AccountLayout } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
require('dotenv').config();

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const TOKEN_MINT_ADDRESS = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
const CENTRAL_WALLET_KEY = JSON.parse(process.env.CENTRAL_WALLET_KEY);

async function checkBalance() {
    try {
        const centralPublicKey = Keypair.fromSecretKey(new Uint8Array(CENTRAL_WALLET_KEY)).publicKey;
        const associatedTokenAddress = await getAssociatedTokenAddress(TOKEN_MINT_ADDRESS, centralPublicKey);
        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);

        if (accountInfo === null) {
            console.log(`Endereço da conta de token: ${associatedTokenAddress.toBase58()}`);
            console.log('Saldo da conta de token: 0 DET (conta não existe ou está vazia)');
        } else {
            const data = AccountLayout.decode(accountInfo.data);
            // Obtém os decimais do mint do token (pode variar, 6 é comum)
            const mintInfo = await connection.getAccountInfo(TOKEN_MINT_ADDRESS);
            const decimals = mintInfo ? mintInfo.data.readUInt8(44) : 6; // Posição 44 contém os decimais no layout do mint
            const amount = data.amount.toString() / Math.pow(10, decimals);
            console.log(`Endereço da conta de token: ${associatedTokenAddress.toBase58()}`);
            console.log(`Saldo da conta de token: ${amount} DET (decimais: ${decimals})`);
        }
    } catch (error) {
        console.error('Erro ao verificar saldo:', error.message);
    }
}

checkBalance();