#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, Bytes, BytesN, Env, Symbol,
};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, VkLoadError, PROOF_BYTES};

const VK: Symbol = symbol_short!("VK");

fn count_key(env: &Env, commitment: &BytesN<32>) -> BytesN<33> {
    let mut buf = [0u8; 33];
    buf[0] = 0x01;
    buf[1..].copy_from_slice(&commitment.to_array());
    BytesN::from_array(env, &buf)
}

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    VkInvalidLength = 1,
    VkInvalidParameters = 2,
    ProofParseError = 3,
    VerificationFailed = 4,
    VkNotSet = 5,
    NullifierAlreadyUsed = 6,
    InvalidPublicInputsLength = 7,
    CommitmentNotFound = 8,
}

#[contract]
pub struct ShieldedCounter;

#[contractimpl]
impl ShieldedCounter {
    pub fn __constructor(env: Env, vk_bytes: Bytes) {
        env.storage().instance().set(&VK, &vk_bytes);
    }

    pub fn register(env: Env, commitment: BytesN<32>) {
        env.storage().persistent().set(&commitment, &());
    }

    pub fn shielded_increment(
        env: Env,
        proof: Bytes,
        public_inputs: Bytes,
    ) -> Result<u32, Error> {
        if public_inputs.len() != 64u32 {
            return Err(Error::InvalidPublicInputsLength);
        }
        if proof.len() as u32 != PROOF_BYTES as u32 {
            return Err(Error::ProofParseError);
        }

        let vk_bytes: Bytes = env.storage().instance().get(&VK).ok_or(Error::VkNotSet)?;
        let verifier = UltraHonkVerifier::new(&env, &vk_bytes).map_err(|e| match e {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;
        verifier
            .verify(&env, &proof, &public_inputs)
            .map_err(|_| Error::VerificationFailed)?;

        let mut commitment_arr = [0u8; 32];
        for i in 0u32..32u32 {
            commitment_arr[i as usize] = public_inputs.get_unchecked(i);
        }
        let commitment = BytesN::from_array(&env, &commitment_arr);

        let mut nullifier_arr = [0u8; 32];
        for i in 32u32..64u32 {
            nullifier_arr[(i - 32u32) as usize] = public_inputs.get_unchecked(i);
        }
        let nullifier = BytesN::from_array(&env, &nullifier_arr);

        if env.storage().persistent().has(&nullifier) {
            return Err(Error::NullifierAlreadyUsed);
        }
        env.storage().persistent().set(&nullifier, &());

        if !env.storage().persistent().has(&commitment) {
            return Err(Error::CommitmentNotFound);
        }

        let ck = count_key(&env, &commitment);
        let current: u32 = env.storage().persistent().get(&ck).unwrap_or(0u32);
        let new = current + 1;
        env.storage().persistent().set(&ck, &new);

        Ok(new)
    }

    pub fn get_count(env: Env, commitment: BytesN<32>) -> u32 {
        let ck = count_key(&env, &commitment);
        env.storage().persistent().get(&ck).unwrap_or(0u32)
    }

    pub fn commitment_exists(env: Env, commitment: BytesN<32>) -> bool {
        env.storage().persistent().has(&commitment)
    }

    pub fn nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&nullifier)
    }
}
