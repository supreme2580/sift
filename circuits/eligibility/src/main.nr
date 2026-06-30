use dep::std;

fn compute_merkle_root(
    leaf: Field,
    path: [Field; 4],
    index: [u1; 4],
) -> Field {
    let mut current = leaf;
    for i in 0..4 {
        let sibling = path[i];
        if index[i] == 0 {
            current = std::hash::pedersen_hash([current, sibling]);
        } else {
            current = std::hash::pedersen_hash([sibling, current]);
        }
    }
    current
}

fn main(
    merkle_root: pub Field,
    nullifier: pub Field,
    address: Field,
    secret: Field,
    path: [Field; 4],
    index: [u1; 4],
) {
    let leaf = std::hash::pedersen_hash([address, secret]);
    let computed_root = compute_merkle_root(leaf, path, index);
    assert(computed_root == merkle_root);
    let computed_nullifier = std::hash::pedersen_hash([leaf, secret]);
    assert(computed_nullifier == nullifier);
}

#[test]
fn test_simple_merkle_proof() {
    let leaf0 = std::hash::pedersen_hash([0, 0]);
    let leaf1 = std::hash::pedersen_hash([1, 42]);
    let leaf2 = std::hash::pedersen_hash([2, 0]);
    let leaf3 = std::hash::pedersen_hash([3, 0]);
    let leaf4 = std::hash::pedersen_hash([4, 0]);
    let leaf5 = std::hash::pedersen_hash([5, 0]);
    let leaf6 = std::hash::pedersen_hash([6, 0]);
    let leaf7 = std::hash::pedersen_hash([7, 0]);
    let leaf8 = std::hash::pedersen_hash([8, 0]);
    let leaf9 = std::hash::pedersen_hash([9, 0]);
    let leaf10 = std::hash::pedersen_hash([10, 0]);
    let leaf11 = std::hash::pedersen_hash([11, 0]);
    let leaf12 = std::hash::pedersen_hash([12, 0]);
    let leaf13 = std::hash::pedersen_hash([13, 0]);
    let leaf14 = std::hash::pedersen_hash([14, 0]);
    let leaf15 = std::hash::pedersen_hash([15, 0]);

    let n00 = std::hash::pedersen_hash([leaf0, leaf1]);
    let n01 = std::hash::pedersen_hash([leaf2, leaf3]);
    let n02 = std::hash::pedersen_hash([leaf4, leaf5]);
    let n03 = std::hash::pedersen_hash([leaf6, leaf7]);
    let n04 = std::hash::pedersen_hash([leaf8, leaf9]);
    let n05 = std::hash::pedersen_hash([leaf10, leaf11]);
    let n06 = std::hash::pedersen_hash([leaf12, leaf13]);
    let n07 = std::hash::pedersen_hash([leaf14, leaf15]);

    let n10 = std::hash::pedersen_hash([n00, n01]);
    let n11 = std::hash::pedersen_hash([n02, n03]);
    let n12 = std::hash::pedersen_hash([n04, n05]);
    let n13 = std::hash::pedersen_hash([n06, n07]);

    let n20 = std::hash::pedersen_hash([n10, n11]);
    let n21 = std::hash::pedersen_hash([n12, n13]);

    let root = std::hash::pedersen_hash([n20, n21]);

    // Proving leaf 1 (address=1, secret=42)
    // Leaf 1 is at index 1
    // sibling at level 0: leaf0
    // sibling at level 1: n01 (contains leaf2, leaf3)
    // sibling at level 2: n11 (contains n02, n03, n04, n05, n06, n07)
    // sibling at level 3: n21 (contains n12, n13)
    // index bits: 1, 0, 0, 0 (leaf1 position 1 in binary: 0001, LSB first)

    let nullifier = std::hash::pedersen_hash([leaf1, 42]);
    main(root, nullifier, 1, 42, [leaf0, n01, n11, n21], [1, 0, 0, 0]);
}

#[test(should_fail)]
fn test_wrong_secret_fails() {
    let leaf0 = std::hash::pedersen_hash([0, 0]);
    let leaf1 = std::hash::pedersen_hash([1, 42]);
    let leaf2 = std::hash::pedersen_hash([2, 0]);
    let leaf3 = std::hash::pedersen_hash([3, 0]);
    let leaf4 = std::hash::pedersen_hash([4, 0]);
    let leaf5 = std::hash::pedersen_hash([5, 0]);
    let leaf6 = std::hash::pedersen_hash([6, 0]);
    let leaf7 = std::hash::pedersen_hash([7, 0]);
    let leaf8 = std::hash::pedersen_hash([8, 0]);
    let leaf9 = std::hash::pedersen_hash([9, 0]);
    let leaf10 = std::hash::pedersen_hash([10, 0]);
    let leaf11 = std::hash::pedersen_hash([11, 0]);
    let leaf12 = std::hash::pedersen_hash([12, 0]);
    let leaf13 = std::hash::pedersen_hash([13, 0]);
    let leaf14 = std::hash::pedersen_hash([14, 0]);
    let leaf15 = std::hash::pedersen_hash([15, 0]);

    let n00 = std::hash::pedersen_hash([leaf0, leaf1]);
    let n01 = std::hash::pedersen_hash([leaf2, leaf3]);
    let n02 = std::hash::pedersen_hash([leaf4, leaf5]);
    let n03 = std::hash::pedersen_hash([leaf6, leaf7]);
    let n04 = std::hash::pedersen_hash([leaf8, leaf9]);
    let n05 = std::hash::pedersen_hash([leaf10, leaf11]);
    let n06 = std::hash::pedersen_hash([leaf12, leaf13]);
    let n07 = std::hash::pedersen_hash([leaf14, leaf15]);

    let n10 = std::hash::pedersen_hash([n00, n01]);
    let n11 = std::hash::pedersen_hash([n02, n03]);
    let n12 = std::hash::pedersen_hash([n04, n05]);
    let n13 = std::hash::pedersen_hash([n06, n07]);

    let n20 = std::hash::pedersen_hash([n10, n11]);
    let n21 = std::hash::pedersen_hash([n12, n13]);

    let root = std::hash::pedersen_hash([n20, n21]);

    // Using a different leaf (address=99) not in the tree
    let leaf_wrong = std::hash::pedersen_hash([99, 42]);
    let nullifier_wrong = std::hash::pedersen_hash([leaf_wrong, 42]);
    main(root, nullifier_wrong, 99, 42, [leaf0, n01, n11, n21], [1, 1, 0, 0]);
}
