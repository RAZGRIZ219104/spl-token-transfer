use anchor_lang::prelude::*;
use anchor_spl::token::{ TokenAccount, Token, Mint };

declare_id!("5uGDhRZcmP4VyR3E1mFhQ2XvCrQnVLBPdj3v6Hgo8n4o");

#[program]
pub mod test {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn token_transfer(ctx: Context<TokenTransfer>, amount: u64) -> Result<()> {
        msg!("Greetings from token transfer: {:?}", ctx.program_id);

        let from: &mut Account<'_, TokenAccount> = &mut ctx.accounts.from_token_account;
        let to: &mut Account<'_, TokenAccount> = &mut ctx.accounts.to_token_account;

        require!(from.amount >= amount, CustomError::InsufficientFunds);

        let cpi_accounts: anchor_spl::token::Transfer<'_> = anchor_spl::token::Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };

        let cpi_program: AccountInfo<'_> = ctx.accounts.token_program.to_account_info();
        let cpi_ctx: CpiContext<'_, '_, '_, '_, anchor_spl::token::Transfer<'_>> = CpiContext::new(cpi_program, cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }
}


#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct TokenTransfer<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, 
        constraint = from_token_account.owner == signer.key(),
        constraint = from_token_account.mint == token_mint.key(),
    )]
    pub from_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = to_token_account.mint == token_mint.key(),
    )]
    pub to_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    #[account(mut)]
    pub token_mint: Account<'info, Mint>
}

#[error_code]
pub enum CustomError {
    #[msg("Insufficient Funds")]
    InsufficientFunds,
}
