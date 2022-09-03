use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

/// Define the type of state stored in accounts
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct GreetingAccount {
    /// number of greetings
    pub counter: u32,
    pub char_counter: String,
}

impl GreetingAccount {
  pub const MAX_CHAR_COUNTER_LEN: usize = 128;
  pub const LEN: usize = 4 + 4 + Self::MAX_CHAR_COUNTER_LEN;
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Public key of the account the hello world program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    _instruction_data: &[u8], // Ignored, all helloworld instructions are hellos
) -> ProgramResult {
    msg!("Hello World Rust program entrypoint");

    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    // Get the account to say hello to
    let account = next_account_info(accounts_iter)?;

    // The account must be owned by the program in order to modify its data
    if account.owner != program_id {
        msg!("Greeted account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    //let mut greeting_account = GreetingAccount::try_from_slice(&mut account_data.as_ref())?;
    let mut greeting_account = deserialize_greeting(&account.data.borrow());
    greeting_account.counter += 1;
    greeting_account.char_counter.push_str("x");
    // 長さチェックが必要(128バイトを超えてたらNG)
    greeting_account.serialize(&mut &mut account.data.borrow_mut()[..])?;

    msg!("Greeted {} time(s)!", greeting_account.counter);
    msg!("char_counter {}", greeting_account.char_counter);

    Ok(())
}

fn deserialize_greeting(v: &[u8]) -> GreetingAccount {
  // Stringで読みきらなかったbytesが発生すると try_from_slice は怒るので...
  let mut v_mut = v;
  GreetingAccount::deserialize(&mut v_mut).unwrap()
}

// Sanity tests
#[cfg(test)]
mod test {
    use super::*;
    use solana_program::clock::Epoch;
    use std::mem;

    #[test]
    fn test_sanity() {
        let program_id = Pubkey::default();
        let key = Pubkey::default();
        let mut lamports = 0;
        //let mut data = vec![0; mem::size_of::<u32>()];
        let mut data = vec![0; GreetingAccount::LEN];
        let owner = Pubkey::default();
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            Epoch::default(),
        );
        let instruction_data: Vec<u8> = Vec::new();

        let accounts = vec![account];

        assert_eq!(
                deserialize_greeting(&accounts[0].data.borrow())
                .counter,
            0
        );
        assert_eq!(
                deserialize_greeting(&accounts[0].data.borrow())
                .char_counter,
            ""
        );

        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
                deserialize_greeting(&accounts[0].data.borrow())
                .counter,
            1
        );
        assert_eq!(
                deserialize_greeting(&accounts[0].data.borrow())
                .char_counter,
            "x"
        );

        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
                deserialize_greeting(&accounts[0].data.borrow())
                .counter,
            2
        );
        assert_eq!(
                deserialize_greeting(&accounts[0].data.borrow())
                .char_counter,
            "xx"
        );

    }
}
