#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, Bytes, BytesN, Env, Map, Symbol,
};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, VkLoadError, PROOF_BYTES};

const MERKLE_ROOT: Symbol = symbol_short!("ROOT");
const NULLIFIERS: Symbol = symbol_short!("USED");

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    VkInvalidLength = 1,
    VkInvalidParameters = 2,
    ProofParseError = 3,
    VerificationFailed = 4,
    VkNotSet = 5,
    AlreadyInitialized = 6,
    RootNotSet = 7,
    NullifierAlreadyUsed = 8,
    InvalidPublicInputsLength = 9,
}

#[contract]
pub struct ZkGate;

#[contractimpl]
impl ZkGate {
    pub fn __constructor(env: Env, vk_bytes: Bytes) -> Result<(), Error> {
        if env.storage().instance().has(&symbol_short!("VK")) {
            return Err(Error::AlreadyInitialized);
        }
        let _ = UltraHonkVerifier::new(&env, &vk_bytes).map_err(|e| match e {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;
        env.storage().instance().set(&symbol_short!("VK"), &vk_bytes);
        Ok(())
    }

    pub fn set_root(env: Env, root: BytesN<32>) {
        env.storage().instance().set(&MERKLE_ROOT, &root);
    }

    pub fn root(env: Env) -> Option<BytesN<32>> {
        env.storage().instance().get(&MERKLE_ROOT)
    }

    pub fn verify_and_claim(
        env: Env,
        proof_bytes: Bytes,
        public_inputs: Bytes,
    ) -> Result<(), Error> {
        if public_inputs.len() != 64 {
            return Err(Error::InvalidPublicInputsLength);
        }

        if proof_bytes.len() as usize != PROOF_BYTES {
            return Err(Error::ProofParseError);
        }

        let vk_bytes: Bytes = env
            .storage()
            .instance()
            .get(&symbol_short!("VK"))
            .ok_or(Error::VkNotSet)?;

        let verifier = UltraHonkVerifier::new(&env, &vk_bytes).map_err(|e| match e {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;

        verifier
            .verify(&env, &proof_bytes, &public_inputs)
            .map_err(|_| Error::VerificationFailed)?;

        let start: u32 = 32;
        let end: u32 = 64;
        let mut arr = [0u8; 32];
        for i in start..end {
            arr[(i - start) as usize] = public_inputs.get_unchecked(i);
        }
        let nullifier = BytesN::from_array(&env, &arr);

        let mut used: Map<BytesN<32>, ()> = env
            .storage()
            .instance()
            .get(&NULLIFIERS)
            .unwrap_or(Map::new(&env));

        if used.contains_key(nullifier.clone()) {
            return Err(Error::NullifierAlreadyUsed);
        }

        used.set(nullifier, ());
        env.storage().instance().set(&NULLIFIERS, &used);

        Ok(())
    }

    pub fn is_claimed(env: Env, nullifier: BytesN<32>) -> bool {
        let used: Map<BytesN<32>, ()> = env
            .storage()
            .instance()
            .get(&NULLIFIERS)
            .unwrap_or(Map::new(&env));
        used.contains_key(nullifier)
    }
}
