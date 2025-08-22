require('dotenv').config();
     const express = require('express');
     const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
     const { createTransferInstruction, getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
     const cors = require('cors');

     const app = express();
     app.use(cors());
     app.use(express.json());

     const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
     const TOKEN_PROGRAM_ID = new PublicKey('2cgvTFEmGLfuGdKAqUpKUff4sTAEvtAbQtr6oqs5nozq'); // Substitua pelo endereço do token DET
     const CENTRAL_WALLET_KEY = JSON.parse(process.env.CENTRAL_WALLET_KEY);
     const centralWalletKeypair = Keypair.fromSecretKey(new Uint8Array(CENTRAL_WALLET_KEY));

     app.post('/withdraw', async (req, res) => {
         try {
             const { destinationAddress, amount } = req.body;
             if (!destinationAddress || !amount) {
                 return res.status(400).json({ error: 'Endereço de destino e quantia são obrigatórios.' });
             }

             const destinationPubkey = new PublicKey(destinationAddress);
             const amountLamports = Math.round(parseFloat(amount) * 1e9); // Assumindo 9 decimais para o token DET

             // Verificar saldo da carteira central
             const centralTokenAccount = await getAssociatedTokenAddress(TOKEN_PROGRAM_ID, centralWalletKeypair.publicKey);
             let centralBalance;
             try {
                 centralBalance = await connection.getTokenAccountBalance(centralTokenAccount);
             } catch (error) {
                 return res.status(400).json({ error: 'Carteira central não tem conta de token configurada.' });
             }
             if (centralBalance.value.uiAmount < parseFloat(amount)) {
                 return res.status(400).json({ error: `Saldo insuficiente na carteira central: ${centralBalance.value.uiAmount.toFixed(5)} DET.` });
             }

             // Criar ou obter conta de token do destinatário
             let destinationTokenAccount;
             try {
                 destinationTokenAccount = await getAssociatedTokenAddress(TOKEN_PROGRAM_ID, destinationPubkey);
                 await getAccount(connection, destinationTokenAccount);
             } catch (error) {
                 const transaction = new Transaction().add(
                     createAssociatedTokenAccountInstruction(
                         centralWalletKeypair.publicKey,
                         destinationTokenAccount,
                         destinationPubkey,
                         TOKEN_PROGRAM_ID
                     )
                 );
                 const { blockhash } = await connection.getLatestBlockhash();
                 transaction.recentBlockhash = blockhash;
                 transaction.feePayer = centralWalletKeypair.publicKey;
                 transaction.sign(centralWalletKeypair);
                 const signature = await connection.sendRawTransaction(transaction.serialize());
                 await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight });
             }

             // Criar transação de transferência
             const transaction = new Transaction().add(
                 createTransferInstruction(
                     centralTokenAccount,
                     destinationTokenAccount,
                     centralWalletKeypair.publicKey,
                     amountLamports,
                     []
                 )
             );

             const { blockhash } = await connection.getLatestBlockhash();
             transaction.recentBlockhash = blockhash;
             transaction.feePayer = centralWalletKeypair.publicKey;
             transaction.sign(centralWalletKeypair);

             const signature = await connection.sendRawTransaction(transaction.serialize());
             await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight });

             res.json({ signature, message: `Saque de ${amount} DET concluído.` });
         } catch (error) {
             console.error('Erro no saque:', error);
             res.status(500).json({ error: error.message || 'Erro ao processar saque.' });
         }
     });

     const PORT = process.env.PORT || 3000;
     app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));