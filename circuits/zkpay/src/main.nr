fn main(commitment: pub Field, nullifier: pub Field, secret: Field, nonce: Field) {
    assert(std::hash::pedersen_hash([secret, nonce]) == commitment);
    assert(std::hash::pedersen_hash([commitment, secret, nonce]) == nullifier);
}
