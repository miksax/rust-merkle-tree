use itertools::Itertools;
use log::{debug, info};
use rayon::prelude::*;
use sha2::{digest::FixedOutput, Digest, Sha256};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

pub trait MerkleTreeTrait {
    fn hash_leaf(data: &[u8]) -> Vec<u8>;
    fn hash_nodes(first: &[u8], second: &[u8]) -> Vec<u8>;
    fn left_child_index(i: usize) -> usize {
        2 * i + 1
    }
    fn right_child_index(i: usize) -> usize {
        2 * i + 2
    }
    fn parent_index(i: usize) -> anyhow::Result<usize> {
        if i > 0 {
            Ok((i - 1) / 2)
        } else {
            Err(anyhow::anyhow!("Root has no parent"))
        }
    }
    fn sibling_index(i: usize) -> anyhow::Result<usize> {
        let i = i as i32;
        if i > 0 {
            Ok((i - ((-1_i32).pow((i % 2) as u32))) as usize)
        } else {
            Err(anyhow::anyhow!("Root has no siblings"))
        }
    }
}

#[derive(Default, Debug, PartialEq, Eq)]
pub struct MerkleTreeSha256 {
    leaves: Vec<Vec<u8>>,
    tree: Vec<Vec<u8>>,
    root: Option<Vec<u8>>,
    tree_map: Vec<usize>,
    hash_map: HashMap<Vec<u8>, usize>,
}

impl MerkleTreeTrait for MerkleTreeSha256 {
    fn hash_leaf(data: &[u8]) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(data);

        let data2 = hasher.finalize_fixed();
        let mut hasher = Sha256::new();
        hasher.update(data2);

        hasher.finalize_fixed().to_vec()
    }

    fn hash_nodes(first: &[u8], second: &[u8]) -> Vec<u8> {
        let mut hasher = Sha256::new();
        if first.cmp(second) == std::cmp::Ordering::Less {
            hasher.update(first);
            hasher.update(second);
        } else {
            hasher.update(second);
            hasher.update(first);
        }
        hasher.finalize_fixed().to_vec()
    }
}

impl MerkleTreeSha256 {
    pub fn from_leaves_data(leaves: Vec<Vec<u8>>, sort: bool) -> anyhow::Result<Self> {
        let hashed_leaves: Vec<_> = leaves
            .par_iter()
            .map(|leaf| Self::hash_leaf(leaf))
            .collect();

        Self::from_leaves_hashes(hashed_leaves, sort)
    }

    pub fn from_leaves_hashes(leaves: Vec<Vec<u8>>, sort: bool) -> anyhow::Result<Self> {
        // Initialize the logger at the start of your application, not here
        // env_logger::init();

        let total_start = Instant::now();

        let leaves_len = leaves.len();
        if leaves_len == 0 {
            return Err(anyhow::anyhow!("Leaves cannot be empty"));
        }

        let tree_len = 2 * leaves_len - 1;

        // Wrap each element of the tree in a Mutex for interior mutability
        let tree_init_start = Instant::now();
        let tree: Vec<Mutex<Vec<u8>>> = (0..tree_len).map(|_| Mutex::new(Vec::new())).collect();
        debug!("Tree initialization took {:?}", tree_init_start.elapsed());

        let setup_start = Instant::now();
        let leaves_iterator: Vec<(usize, (usize, &Vec<u8>))> = if sort {
            leaves
                .iter()
                .enumerate()
                .sorted_by(|(_, u1), (_, u2)| u1.cmp(u2))
                .enumerate()
                .collect()
        } else {
            leaves.iter().enumerate().enumerate().collect()
        };
        debug!("Setup (leaves_iterator creation) took {:?}", setup_start.elapsed());

        // Assign leaves to the tree
        let assign_start = Instant::now();
        for &(d1, (_d2, hash)) in leaves_iterator.iter() {
            let tree_index = tree_len - 1 - d1;
            *tree[tree_index].lock().unwrap() = hash.clone();
        }
        debug!("Assigning leaves to the tree took {:?}", assign_start.elapsed());

        // Build the tree recursively in parallel
        let build_start = Instant::now();
        fn build_subtree(
            tree: &[Mutex<Vec<u8>>],
            node_index: usize,
            tree_len: usize,
        ) -> Vec<u8> {
            if MerkleTreeSha256::left_child_index(node_index) >= tree_len {
                // Leaf node, already assigned
                tree[node_index].lock().unwrap().clone()
            } else {
                let left_child = MerkleTreeSha256::left_child_index(node_index);
                let right_child = MerkleTreeSha256::right_child_index(node_index);

                let (left_hash, right_hash) = rayon::join(
                    || build_subtree(tree, left_child, tree_len),
                    || build_subtree(tree, right_child, tree_len),
                );

                let parent_hash = MerkleTreeSha256::hash_nodes(&left_hash, &right_hash);
                *tree[node_index].lock().unwrap() = parent_hash.clone();
                parent_hash
            }
        }

        let root_hash = build_subtree(
            &tree,
            0,
            tree_len,
        );
        debug!("Building the tree took {:?}", build_start.elapsed());

        // Extract the tree vector from the Mutexes
        let extract_start = Instant::now();
        let tree_vec: Vec<Vec<u8>> = tree
            .into_iter()
            .map(|mutex| mutex.into_inner().unwrap())
            .collect();
        debug!("Extracting tree vector took {:?}", extract_start.elapsed());

        // Build tree_map and hash_map
        let map_build_start = Instant::now();
        let mut tree_map: Vec<usize> = vec![0; leaves_len];
        let mut hash_map: HashMap<Vec<u8>, usize> = HashMap::with_capacity(leaves_len);

        for &(d1, (d2, hash)) in leaves_iterator.iter() {
            let tree_index = tree_len - 1 - d1;
            tree_map[d2] = tree_index;
            hash_map.insert(hash.clone(), d2);
        }
        debug!("Building tree_map and hash_map took {:?}", map_build_start.elapsed());

        let total_duration = total_start.elapsed();
        info!("Total duration of from_leaves_hashes: {:?}", total_duration);

        Ok(Self {
            leaves,
            tree_map,
            hash_map,
            root: Some(root_hash),
            tree: tree_vec,
        })
    }

    /*pub fn from_leaves_hashes(leaves: Vec<Vec<u8>>, sort: bool) -> anyhow::Result<Self> {
        let leaves_len = leaves.len();
        if leaves_len == 0 {
            return Err(anyhow::anyhow!("Leaves cannot be empty"));
        }
        let tree_len = 2 * leaves_len - 1;

        // Wrap each element of the tree in a Mutex for interior mutability
        let tree: Vec<Mutex<Vec<u8>>> = (0..tree_len).map(|_| Mutex::new(Vec::new())).collect();

        let leaves_iterator: Vec<(usize, (usize, &Vec<u8>))> = if sort {
            leaves
                .iter()
                .enumerate()
                .sorted_by(|(_, u1), (_, u2)| u1.cmp(u2))
                .enumerate()
                .collect()
        } else {
            leaves.iter().enumerate().enumerate().collect()
        };

        // Assign leaves to the tree
        for &(d1, (_d2, hash)) in leaves_iterator.iter() {
            let tree_index = tree_len - 1 - d1;
            *tree[tree_index].lock().unwrap() = hash.clone();
        }

        // Build the tree recursively in parallel
        fn build_subtree(
            tree: &[Mutex<Vec<u8>>],
            node_index: usize,
            tree_len: usize,
        ) -> Vec<u8> {
            if MerkleTreeSha256::left_child_index(node_index) >= tree_len {
                // Leaf node, already assigned
                tree[node_index].lock().unwrap().clone()
            } else {
                let left_child = MerkleTreeSha256::left_child_index(node_index);
                let right_child = MerkleTreeSha256::right_child_index(node_index);

                let (left_hash, right_hash) = rayon::join(
                    || build_subtree(tree, left_child, tree_len),
                    || build_subtree(tree, right_child, tree_len),
                );

                let parent_hash = MerkleTreeSha256::hash_nodes(&left_hash, &right_hash);
                *tree[node_index].lock().unwrap() = parent_hash.clone();
                parent_hash
            }
        }

        let root_hash = build_subtree(
            &tree,
            0,
            tree_len,
        );

        // Now extract the tree vector from the Mutexes
        let tree_vec: Vec<Vec<u8>> = tree
            .into_iter()
            .map(|mutex| mutex.into_inner().unwrap())
            .collect();

        // Build tree_map and hash_map
        let mut tree_map: Vec<usize> = vec![0; leaves_len];
        let mut hash_map: HashMap<Vec<u8>, usize> = HashMap::with_capacity(leaves_len);

        for &(d1, (d2, hash)) in leaves_iterator.iter() {
            let tree_index = tree_len - 1 - d1;
            tree_map[d2] = tree_index;
            hash_map.insert(hash.clone(), d2);
        }

        Ok(Self {
            leaves,
            tree_map,
            hash_map,
            root: Some(root_hash),
            tree: tree_vec,
        })
    }*/

    /*pub fn from_leaves_hashes(leaves: Vec<Vec<u8>>, sort: bool) -> anyhow::Result<Self> {
        let leaves_len = leaves.len();
        let tree_len = 2 * leaves_len - 1;
        let mut tree_map: Vec<usize> = vec![0; leaves_len];
        let mut hash_map: HashMap<Vec<u8>, usize> = HashMap::with_capacity(leaves_len);
        let mut tree: Vec<Vec<u8>> = vec![Vec::new(); tree_len];

        let leaves_iterator: Vec<(usize, (usize, &Vec<u8>))> = if sort {
            leaves
                .iter()
                .enumerate()
                .sorted_by(|(_, u1), (_, u2)| u1.cmp(u2))
                .enumerate()
                .collect()
        } else {
            leaves.iter().enumerate().enumerate().collect()
        };

        // Assign leaves to the tree
        for &(d1, (d2, hash)) in leaves_iterator.iter() {
            let tree_index = tree_len - 1 - d1;
            tree_map[d2] = tree_index;
            hash_map.insert(hash.clone(), d2);
            tree[tree_index] = hash.clone();
        }

        // Build levels starting from leaves up to root
        let mut levels: Vec<Vec<usize>> = Vec::new();
        // Start with leaves
        let current_level = (0..leaves_len).map(|d1| tree_len - 1 - d1).collect::<Vec<usize>>();
        levels.push(current_level);

        // Build levels upwards
        while levels.last().unwrap()[0] > 0 {
            let parent_nodes: Vec<usize> = levels.last().unwrap()
                .chunks(2)
                .map(|pair| {
                    let child_index = pair[0];
                    let parent_index = (child_index - 1) / 2;
                    parent_index
                })
                .collect();
            levels.push(parent_nodes);
        }

        // Process levels from leaves up, skipping leaves
        for level_nodes in levels.iter().skip(1) {
            // Compute hashes for this level in parallel
            let new_hashes: Vec<Vec<u8>> = level_nodes
                .par_iter()
                .map(|&node| {
                    let left_child = Self::left_child_index(node);
                    let right_child = Self::right_child_index(node);
                    Self::hash_nodes(&tree[left_child], &tree[right_child])
                })
                .collect();

            // Update the tree with the new hashes
            for (&node, hash) in level_nodes.iter().zip(new_hashes.into_iter()) {
                tree[node] = hash;
            }
        }

        Ok(Self {
            leaves,
            tree_map,
            hash_map,
            root: tree.first().cloned(),
            tree,
        })
    }*/

    /*pub fn from_leaves_hashes(leaves: Vec<Vec<u8>>, sort: bool) -> anyhow::Result<Self> {
        let leaves_len = leaves.len();
        let tree_len = 2 * leaves_len - 1;
        let mut tree_map: Vec<usize> = Vec::from_iter(std::iter::repeat(0).take(leaves_len));
        let mut hash_map: HashMap<Vec<u8>, usize> = HashMap::with_capacity(leaves_len);
        let mut tree: Vec<Vec<u8>> = Vec::from_iter(std::iter::repeat(Vec::new()).take(tree_len));

        let leaves_iterator: Vec<(usize, (usize, &Vec<u8>))> = if sort {
            leaves
                .iter()
                .enumerate()
                .sorted_by(|(_, u1), (_, u2)| u1.cmp(u2))
                .enumerate()
                .collect()
        } else {
            leaves.iter().enumerate().enumerate().collect()
        };

        for &(d1, (d2, hash)) in leaves_iterator.iter() {
            let tree_index = tree_len - 1 - d1;
            tree_map[d2] = tree_index;
            hash_map.insert(hash.clone(), d2);
            tree[tree_index] = hash.clone();
        }

        let mut tree_index = tree_len - 1 - leaves_len;
        loop {
            tree[tree_index] = Self::hash_nodes(
                &tree[Self::left_child_index(tree_index)],
                &tree[Self::right_child_index(tree_index)],
            );
            if tree_index == 0 {
                break;
            } else {
                tree_index -= 1;
            }
        }

        Ok(Self {
            leaves,
            tree_map,
            hash_map,
            root: tree.first().cloned(),
            tree,
        })
    }*/

    pub fn get_hashes(&self) -> impl Iterator<Item=&Vec<u8>> {
        self.leaves.iter()
    }

    pub fn get_index_by_data(&self, data: &[u8]) -> anyhow::Result<usize> {
        self.get_index_by_hash(&Self::hash_leaf(data))
    }

    pub fn get_index_by_hash(&self, hash: &[u8]) -> anyhow::Result<usize> {
        Ok(*self.hash_map.get(hash).expect("hash did not found"))
    }

    pub fn get_root(&self) -> anyhow::Result<Vec<u8>> {
        Ok(self.root.clone().expect("Root is not generated"))
    }

    pub fn get_proof(&self, index: usize) -> anyhow::Result<super::proof::MerkleProofInner<Self>> {
        let mut tree_index = *self
            .tree_map
            .get(index)
            .expect("Index does not exists");

        let mut proof_hashes = Vec::new();
        while tree_index > 0 {
            proof_hashes.push(self.tree[Self::sibling_index(tree_index)?].clone());
            tree_index = Self::parent_index(tree_index)?;
        }
        let proof = super::proof::MerkleProofInner::new_from_proof(proof_hashes);

        if proof.verify(
            self.root.as_ref().expect("root does not generated"),
            self
                .tree
                .get(
                    *self
                        .tree_map
                        .get(index)
                        .expect("Hash does not exist"),
                )
                .expect("Hash does not exist in tree"),
        ) {
            Ok(proof)
        } else {
            Err(anyhow::anyhow!("Checksum does not match"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::proof::MerkleProofInner;
    use super::MerkleTreeSha256;

    fn check_tree(hashes: [&str; 12], root: &str, sorted: bool) -> MerkleTreeSha256 {
        let tree = MerkleTreeSha256::from_leaves_hashes(
            hashes.iter().map(|h| hex::decode(h).unwrap()).collect(),
            sorted,
        )
            .unwrap();

        assert_eq!(tree.get_root().unwrap(), hex::decode(root).unwrap());
        tree
    }

    #[test]
    fn test_tree_sorted() {
        // https://github.com/btc-vision/merkle-tree-sha256/blob/master/src/standard.test.ts.md

        let tree = check_tree(
            [
                "93ca042c86dafda63e1a03b4625f614dc9364231e986d72490a480a4cc591c4a",
                "713af6f789258961f0ed63b4073060bae6ba7e8b92bcb5383ebe18e6e76289d6",
                "5d351e5962324a1b9920278825ca07b94d020b34941d20d5ac0f44dbbf3a5258",
                "493c543220bceffa21283b176955173baa7745d563a7b5e2cae0b4253419a87f",
                "39e429c0920f4089a43dbe24a7dfcfe0552bdaabfcc9356cde88f9ea18972bf4",
                "33b544b8002201957eaa0816c4ee2bc244d4cce765e599df6f25adbb2cdb0c08",
                "2e3580210116e2ab7c7705f8f0b6217ac7a0ac5f31de892f847171c073a7542f",
                "016a2b39a42811f88585a5e07ee3a57283607b47816945d61354577ff8868378",
                "c67892017db365f15687b283fea0741145e1b54a62430fd814e1755c6e25949e",
                "af4f1bfe5c512e9265718f3fa9a028f7e70b29860c705763ecbb541f4a5877ce",
                "a0e25bb110b98aa9c3e2be61e432cb432788d0dbe29991acd8ced7c7d9386aea",
                "96ca5d6526e42a2a9da666e27cd8332c3a6b4cada4561726401f66ba08eaaa42",
            ],
            "1eb2fbe0d23ed86d1ad0da939771e8320da2c7de2c341960fe854a7f1ee317c4",
            true,
        );

        assert_eq!(
            tree
                .get_proof(
                    tree
                        .get_index_by_hash(
                            &hex::decode("93ca042c86dafda63e1a03b4625f614dc9364231e986d72490a480a4cc591c4a")
                                .unwrap()
                        )
                        .unwrap()
                )
                .unwrap(),
            MerkleProofInner::<MerkleTreeSha256>::new_from_proof(
                [
                    "713af6f789258961f0ed63b4073060bae6ba7e8b92bcb5383ebe18e6e76289d6",
                    "9f5040eb0ee98927dcf3e7256161cad8a55f1530c6106fdc75c674c98d6cb8fe",
                    "4d42ca27311b1512c3d3cd5ac07864264b096981cbc8b19bef642613023ca132",
                    "9e54701031c343fbf4d2848a4de7df9252a1bac6b4e4b83e64d14ac44c070e4e",
                ]
                    .iter()
                    .map(|h| hex::decode(h).unwrap())
                    .collect()
            )
        );
    }

    #[test]
    fn test_tree_unsorted() {
        let tree = check_tree(
            [
                "2e3580210116e2ab7c7705f8f0b6217ac7a0ac5f31de892f847171c073a7542f",
                "016a2b39a42811f88585a5e07ee3a57283607b47816945d61354577ff8868378",
                "93ca042c86dafda63e1a03b4625f614dc9364231e986d72490a480a4cc591c4a",
                "af4f1bfe5c512e9265718f3fa9a028f7e70b29860c705763ecbb541f4a5877ce",
                "5d351e5962324a1b9920278825ca07b94d020b34941d20d5ac0f44dbbf3a5258",
                "713af6f789258961f0ed63b4073060bae6ba7e8b92bcb5383ebe18e6e76289d6",
                "39e429c0920f4089a43dbe24a7dfcfe0552bdaabfcc9356cde88f9ea18972bf4",
                "c67892017db365f15687b283fea0741145e1b54a62430fd814e1755c6e25949e",
                "33b544b8002201957eaa0816c4ee2bc244d4cce765e599df6f25adbb2cdb0c08",
                "493c543220bceffa21283b176955173baa7745d563a7b5e2cae0b4253419a87f",
                "96ca5d6526e42a2a9da666e27cd8332c3a6b4cada4561726401f66ba08eaaa42",
                "a0e25bb110b98aa9c3e2be61e432cb432788d0dbe29991acd8ced7c7d9386aea",
            ],
            "cacbbfa8cec522f5d5e306251bc7115dd88d7ef44f0cf3a84dbddc65481b63fa",
            false,
        );

        assert_eq!(
            tree
                .get_proof(
                    tree
                        .get_index_by_hash(
                            &hex::decode("a0e25bb110b98aa9c3e2be61e432cb432788d0dbe29991acd8ced7c7d9386aea")
                                .unwrap()
                        )
                        .unwrap()
                )
                .unwrap(),
            MerkleProofInner::<MerkleTreeSha256>::new_from_proof(
                [
                    "96ca5d6526e42a2a9da666e27cd8332c3a6b4cada4561726401f66ba08eaaa42",
                    "2224d8c46418ed844244e7e06d55a09608110ad797fabd266a1838f4bdddc833",
                    "401917547ee1e689221fd39a7a388252feb127ef27c20912fa3af654e5a5ab99",
                ]
                    .iter()
                    .map(|h| hex::decode(h).unwrap())
                    .collect()
            )
        );
    }
}
