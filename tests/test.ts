import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Test } from "../target/types/test";

import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

describe("test", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.local();
  const program = anchor.workspace.Test as Program<Test>;

  const user = anchor.web3.Keypair.generate();
  const user1 = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  const mintAuthSC = anchor.web3.Keypair.generate();
  const mintKeypairSC = anchor.web3.Keypair.generate();
  let mintSC: anchor.web3.PublicKey;
  // give 2 sol to user
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    ),
    "confirmed"
  );
  // give 2 sol to payer
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(
      payer.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    ),
    "confirmed"
  );
  console.log(">> payer", payer.publicKey);
  mintSC = await createMint(
    provider.connection,
    payer,
    mintAuthSC.publicKey,
    mintAuthSC.publicKey,
    6,
    mintKeypairSC
  );

  console.log(" >> Mint:", mintSC);

  const userATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    mintSC,
    user.publicKey
  );
  console.log("user ATA:", userATA.address.toString());

  
  // mint token to user
  const tx = await mintTo(
    provider.connection,
    payer,
    mintSC,
    userATA.address,
    mintAuthSC,
    10000 * anchor.web3.LAMPORTS_PER_SOL
  );
  const balance = await provider.connection.getTokenAccountBalance(
    userATA.address
  );
  console.log(">> user's token balance:", balance);



  const initializeTx = await program.methods.initialize().rpc();
  console.log("Your initialize transaction signature", initializeTx);



  try {

    const user1ATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mintSC,
      user1.publicKey
    );
    console.log("user1 ATA:", userATA.address.toString());
    const preBalance = await provider.connection.getTokenAccountBalance(
      user1ATA.address
    );
    console.log(">> user1's token preBalance:", preBalance);

    const tx = await program.methods.tokenTransfer(new anchor.BN(100_000_000)).accounts({
      signer: user.publicKey,
      fromTokenAccount: userATA.address,
      toTokenAccount: user1ATA.address,
      tokenMint: mintSC,
    }).signers([user]).rpc();

    const postBalance = await provider.connection.getTokenAccountBalance(
      user1ATA.address
    );

    console.log(">> user1's token postBalance:", postBalance);
    console.log("Your transfer transaction signature", tx);
  } catch (err) {
    console.log(err)
  }

});
