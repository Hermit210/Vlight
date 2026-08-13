use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use mpl_core::instructions::CreateV2CpiBuilder;
use mpl_core::types::{Creator, Plugin, PluginAuthorityPair, Royalties, RuleSet};

declare_id!("4QBCnDuqgVuGFsbVRfeUcJ7opcGHCY7W5dXM49KHA2eK");

// Fixed marketplace cut on every buy_pack sale. Remainder (minus any remix
// royalty) goes to the seller. Devnet placeholder — swap for a real
// treasury wallet before any mainnet deployment.
pub const PLATFORM_FEE_BPS: u64 = 250; // 2.5%
pub const PLATFORM_TREASURY: Pubkey = pubkey!("CqDpadRTq4rdXt3Fat6YtczooFgfJBDYGPzQSscgRVZw");

#[program]
pub mod vlight {
    use super::*;

    /// One-time wallet -> creator PDA registration.
    pub fn register_creator(ctx: Context<RegisterCreator>) -> Result<()> {
        let creator = &mut ctx.accounts.creator;
        creator.authority = ctx.accounts.wallet.key();
        creator.bump = ctx.bumps.creator;
        Ok(())
    }

    /// Mints a Metaplex Core asset representing one overlay_config Pack.
    /// The config JSON itself lives off-chain (Supabase asset_catalog,
    /// synced via Helius webhook); only `uri` (pointing at that record) and
    /// `name` are stored on-chain, plus a Royalties plugin declaring the
    /// creator's cut for ecosystem-wide (wallet/marketplace) visibility.
    pub fn mint_pack(ctx: Context<MintPack>, name: String, uri: String, royalty_bps: u16) -> Result<()> {
        require!(royalty_bps <= 10_000, VlightError::InvalidRoyalty);
        require_keys_eq!(
            ctx.accounts.creator.authority,
            ctx.accounts.payer.key(),
            VlightError::Unauthorized
        );

        CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
            .asset(&ctx.accounts.asset.to_account_info())
            .payer(&ctx.accounts.payer.to_account_info())
            .owner(Some(&ctx.accounts.payer.to_account_info()))
            .system_program(&ctx.accounts.system_program.to_account_info())
            .name(name)
            .uri(uri)
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::Royalties(Royalties {
                    basis_points: royalty_bps,
                    creators: vec![Creator {
                        address: ctx.accounts.payer.key(),
                        percentage: 100,
                    }],
                    rule_set: RuleSet::None,
                }),
                authority: None,
            }])
            .invoke()?;

        Ok(())
    }

    /// Lists a minted Pack for sale. royalty_bps + remix_of_mint here are
    /// this marketplace's own resale-split terms (spec §6/§8) — separate
    /// from the Royalties plugin set at mint time, which is the asset's
    /// ecosystem-facing declaration.
    pub fn list_pack(
        ctx: Context<ListPack>,
        price_lamports: u64,
        royalty_bps: u16,
        remix_of_mint: Option<Pubkey>,
    ) -> Result<()> {
        require!(royalty_bps <= 10_000, VlightError::InvalidRoyalty);
        require!(price_lamports > 0, VlightError::InvalidPrice);

        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.mint = ctx.accounts.asset.key();
        listing.price_lamports = price_lamports;
        listing.royalty_bps = royalty_bps;
        listing.remix_of_mint = remix_of_mint;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    /// Atomic buy: splits payment (platform fee, remix royalty, seller
    /// remainder), transfers SOL, then CPIs mpl-core to move the asset to
    /// the buyer. The listing PDA is closed and its rent refunded to the
    /// seller as part of the same transaction.
    pub fn buy_pack(ctx: Context<BuyPack>) -> Result<()> {
        let price = ctx.accounts.listing.price_lamports;
        let royalty_bps = ctx.accounts.listing.royalty_bps as u64;
        let is_remix = ctx.accounts.listing.remix_of_mint.is_some();

        let platform_fee = price * PLATFORM_FEE_BPS / 10_000;
        let royalty_fee = if is_remix { price * royalty_bps / 10_000 } else { 0 };
        let seller_amount = price
            .checked_sub(platform_fee)
            .and_then(|v| v.checked_sub(royalty_fee))
            .ok_or(VlightError::InvalidPrice)?;

        let buyer = ctx.accounts.buyer.to_account_info();
        let system_program = ctx.accounts.system_program.to_account_info();

        system_program::transfer(
            CpiContext::new(
                system_program.clone(),
                Transfer { from: buyer.clone(), to: ctx.accounts.seller.to_account_info() },
            ),
            seller_amount,
        )?;
        system_program::transfer(
            CpiContext::new(
                system_program.clone(),
                Transfer { from: buyer.clone(), to: ctx.accounts.platform_treasury.to_account_info() },
            ),
            platform_fee,
        )?;
        if is_remix && royalty_fee > 0 {
            system_program::transfer(
                CpiContext::new(
                    system_program.clone(),
                    Transfer { from: buyer.clone(), to: ctx.accounts.royalty_recipient.to_account_info() },
                ),
                royalty_fee,
            )?;
        }

        mpl_core::instructions::TransferV1CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
            .asset(&ctx.accounts.asset.to_account_info())
            .payer(&ctx.accounts.buyer.to_account_info())
            .authority(Some(&ctx.accounts.seller.to_account_info()))
            .new_owner(&ctx.accounts.buyer.to_account_info())
            .system_program(Some(&ctx.accounts.system_program.to_account_info()))
            .invoke()?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterCreator<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(
        init,
        payer = wallet,
        space = 8 + CreatorAccount::INIT_SPACE,
        seeds = [b"creator", wallet.key().as_ref()],
        bump,
    )]
    pub creator: Account<'info, CreatorAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintPack<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: fresh asset keypair for the new Metaplex Core asset; validated by the mpl-core CPI.
    #[account(mut)]
    pub asset: Signer<'info>,

    #[account(
        seeds = [b"creator", payer.key().as_ref()],
        bump = creator.bump,
    )]
    pub creator: Account<'info, CreatorAccount>,

    /// CHECK: constrained to the real mpl-core program address.
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListPack<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    /// CHECK: the mpl-core asset being listed; ownership is enforced by mpl-core itself when buy_pack transfers it.
    pub asset: UncheckedAccount<'info>,

    #[account(
        init,
        payer = seller,
        space = 8 + ListingAccount::INIT_SPACE,
        seeds = [b"listing", asset.key().as_ref()],
        bump,
    )]
    pub listing: Account<'info, ListingAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyPack<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: must match listing.seller; receives the sale remainder.
    #[account(mut, address = listing.seller)]
    pub seller: UncheckedAccount<'info>,

    /// CHECK: resolved off-chain (asset_catalog.remix_of_mint -> creator_wallet) and
    /// only paid when the listing is a remix; unused otherwise.
    #[account(mut)]
    pub royalty_recipient: UncheckedAccount<'info>,

    /// CHECK: constrained to the fixed platform treasury address.
    #[account(mut, address = PLATFORM_TREASURY)]
    pub platform_treasury: UncheckedAccount<'info>,

    /// CHECK: the mpl-core asset being purchased.
    #[account(mut, address = listing.mint)]
    pub asset: UncheckedAccount<'info>,

    #[account(
        mut,
        close = seller,
        seeds = [b"listing", asset.key().as_ref()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, ListingAccount>,

    /// CHECK: constrained to the real mpl-core program address.
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct CreatorAccount {
    pub authority: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ListingAccount {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub price_lamports: u64,
    pub royalty_bps: u16,
    pub remix_of_mint: Option<Pubkey>,
    pub bump: u8,
}

#[error_code]
pub enum VlightError {
    #[msg("Royalty basis points must be 10000 or less")]
    InvalidRoyalty,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Signer is not the registered creator authority")]
    Unauthorized,
}
