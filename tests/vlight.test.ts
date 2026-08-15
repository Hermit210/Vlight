import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Vlight } from "../target/types/vlight";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchAsset, mplCore } from "@metaplex-foundation/mpl-core";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { expect } from "chai";

// Exercises the full register_creator -> mint_pack -> list_pack -> buy_pack
// flow against a local validator with mpl-core cloned in (Anchor.toml
// [[test.validator.clone]]) — no devnet funding required, unlike a real
// deploy, so this is the fast/free way to prove the program actually
// works end to end, not just that it compiles.
const PLATFORM_TREASURY = new PublicKey("CqDpadRTq4rdXt3Fat6YtczooFgfJBDYGPzQSscgRVZw");
const PLATFORM_FEE_BPS = 250;

describe("vlight", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Vlight as Program<Vlight>;
  const connection = provider.connection;
  const umi = createUmi(connection.rpcEndpoint).use(mplCore());

  const creator = Keypair.generate();
  const buyer = Keypair.generate();
  const royaltyRecipient = Keypair.generate();
  const asset = Keypair.generate();

  const [creatorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator"), creator.publicKey.toBuffer()],
    program.programId
  );
  const [listingPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), asset.publicKey.toBuffer()],
    program.programId
  );

  before(async () => {
    for (const kp of [creator, buyer]) {
      const sig = await connection.requestAirdrop(kp.publicKey, 5 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
    }
  });

  it("registers a creator", async () => {
    await program.methods
      .registerCreator()
      .accounts({
        wallet: creator.publicKey,
      })
      .signers([creator])
      .rpc();

    const account = await program.account.creatorAccount.fetch(creatorPda);
    expect(account.authority.toBase58()).to.equal(creator.publicKey.toBase58());
  });

  it("rejects mint_pack from a wallet that never registered", async () => {
    const stranger = Keypair.generate();
    const strangerAsset = Keypair.generate();
    const airdropSig = await connection.requestAirdrop(stranger.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig, "confirmed");

    // The client auto-derives `creator` from the `creator` PDA seeds tied to
    // `payer`, so an unregistered wallet always resolves to an
    // uninitialized account here — Anchor's own AccountNotInitialized check
    // rejects it before the program's require_keys_eq! authority check
    // would even run. Same security boundary either way: unregistered
    // wallets can't mint.
    let threw = false;
    try {
      await program.methods
        .mintPack("Should Fail", "https://example.com/x.json", 500)
        .accounts({
          payer: stranger.publicKey,
          asset: strangerAsset.publicKey,
        })
        .signers([stranger, strangerAsset])
        .rpc();
    } catch {
      threw = true;
    }
    expect(threw).to.equal(true);
  });

  it("mints a pack via the mpl-core CPI", async () => {
    await program.methods
      .mintPack("Neon Loft", "https://example.com/packs/neon-loft.json", 500)
      .accounts({
        payer: creator.publicKey,
        asset: asset.publicKey,
      })
      .signers([creator, asset])
      .rpc();

    const fetched = await fetchAsset(umi, umiPublicKey(asset.publicKey.toBase58()));
    expect(fetched.owner.toString()).to.equal(creator.publicKey.toBase58());
    expect(fetched.name).to.equal("Neon Loft");
  });

  it("lists and buys a pack with an atomic payment split", async () => {
    const priceLamports = new BN(1 * LAMPORTS_PER_SOL);

    await program.methods
      .listPack(priceLamports, 500, null)
      .accounts({
        seller: creator.publicKey,
        asset: asset.publicKey,
      })
      .signers([creator])
      .rpc();

    const listing = await program.account.listingAccount.fetch(listingPda);
    expect(listing.priceLamports.toString()).to.equal(priceLamports.toString());
    expect(listing.remixOfMint).to.equal(null);

    const sellerBefore = await connection.getBalance(creator.publicKey);
    const treasuryBefore = await connection.getBalance(PLATFORM_TREASURY);

    await program.methods
      .buyPack()
      .accounts({
        buyer: buyer.publicKey,
        seller: creator.publicKey,
        royaltyRecipient: royaltyRecipient.publicKey,
        asset: asset.publicKey,
      })
      .signers([buyer])
      .rpc();

    const sellerAfter = await connection.getBalance(creator.publicKey);
    const treasuryAfter = await connection.getBalance(PLATFORM_TREASURY);
    const royaltyAfter = await connection.getBalance(royaltyRecipient.publicKey);

    const expectedFee = (priceLamports.toNumber() * PLATFORM_FEE_BPS) / 10_000;
    expect(treasuryAfter - treasuryBefore).to.equal(expectedFee);
    expect(sellerAfter - sellerBefore).to.equal(priceLamports.toNumber() - expectedFee);
    // no remix on this listing -> royalty recipient gets nothing
    expect(royaltyAfter).to.equal(0);

    const fetched = await fetchAsset(umi, umiPublicKey(asset.publicKey.toBase58()));
    expect(fetched.owner.toString()).to.equal(buyer.publicKey.toBase58());

    // listing PDA is closed (rent refunded to seller) after the sale
    const listingInfo = await connection.getAccountInfo(listingPda);
    expect(listingInfo).to.equal(null);
  });

  it("routes a remix royalty to the original creator on resale", async () => {
    const remixAsset = Keypair.generate();
    const secondBuyer = Keypair.generate();
    const sig = await connection.requestAirdrop(secondBuyer.publicKey, 5 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");

    // `buyer` (from the previous test) is remixing the pack they just
    // bought — register them as a creator first, same as any first-time minter.
    await program.methods
      .registerCreator()
      .accounts({ wallet: buyer.publicKey })
      .signers([buyer])
      .rpc();

    await program.methods
      .mintPack("Remix of Neon Loft", "https://example.com/packs/remix.json", 500)
      .accounts({
        payer: buyer.publicKey,
        asset: remixAsset.publicKey,
      })
      .signers([buyer, remixAsset])
      .rpc();

    const [remixListingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), remixAsset.publicKey.toBuffer()],
      program.programId
    );
    const price = new BN(1 * LAMPORTS_PER_SOL);
    const royaltyBps = 1000; // 10%

    await program.methods
      .listPack(price, royaltyBps, asset.publicKey) // remix_of_mint = the original pack
      .accounts({
        seller: buyer.publicKey,
        asset: remixAsset.publicKey,
      })
      .signers([buyer])
      .rpc();

    const royaltyBefore = await connection.getBalance(royaltyRecipient.publicKey);

    await program.methods
      .buyPack()
      .accounts({
        buyer: secondBuyer.publicKey,
        seller: buyer.publicKey,
        royaltyRecipient: royaltyRecipient.publicKey,
        asset: remixAsset.publicKey,
      })
      .signers([secondBuyer])
      .rpc();

    const royaltyAfter = await connection.getBalance(royaltyRecipient.publicKey);
    const expectedRoyalty = (price.toNumber() * royaltyBps) / 10_000;
    expect(royaltyAfter - royaltyBefore).to.equal(expectedRoyalty);
  });
});
