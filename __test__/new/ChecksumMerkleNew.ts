import { MerkleProof, MerkleTree } from '../../index.js';
import { defaultAbiCoder } from '@ethersproject/abi';
import { BufferHelper } from '@btc-vision/transaction';
import { ZERO_HASH } from '../types/ZeroValue.js';
import { BlockHeaderChecksumProof } from '../types/IBlockHeaderDocument.js';
import { arrayify as toBytes } from '@ethersproject/bytes';

export class ChecksumMerkleNew {
    public static TREE_TYPE: [string, string] = ['uint8', 'bytes32'];

    public tree: MerkleTree | undefined;
    public values: [number, Uint8Array][] = [];

    public get root(): string | null {
        if (!this.tree) {
            throw new Error('[Checksum] Merkle tree not generated (Get root)');
        }
        return this.tree.rootHex();
    }

    public static toBytes(value: unknown[]): Uint8Array {
        const data = defaultAbiCoder.encode(ChecksumMerkleNew.TREE_TYPE, value);
        return toBytes(data);
    }

    public static verify(root: string, hash: Uint8Array, proof: string[]): boolean {
        return new MerkleProof(proof.map((p) => toBytes(p))).verify(toBytes(root), hash);
    }

    public validate(): void {
        if (!this.tree) {
            throw new Error('[Checksum] Merkle tree not generated');
        }
    }

    public setBlockData(
        previousBlockHash: string,
        previousBlockChecksum: string,
        blockHash: string,
        blockMerkleRoot: string,
        blockStateRoot: string,
        blockReceiptRoot: string,
    ): void {
        this.values.push([0, BufferHelper.hexToUint8Array(previousBlockHash || ZERO_HASH)]);
        this.values.push([1, BufferHelper.hexToUint8Array(previousBlockChecksum || ZERO_HASH)]);
        this.values.push([2, BufferHelper.hexToUint8Array(blockHash || ZERO_HASH)]);
        this.values.push([3, BufferHelper.hexToUint8Array(blockMerkleRoot || ZERO_HASH)]);
        this.values.push([4, BufferHelper.hexToUint8Array(blockStateRoot || ZERO_HASH)]);
        this.values.push([5, BufferHelper.hexToUint8Array(blockReceiptRoot || ZERO_HASH)]);

        this.generateTree();
    }

    public getProofs(): BlockHeaderChecksumProof {
        if (!this.tree) {
            throw new Error('Merkle tree not generated');
        }

        const result: BlockHeaderChecksumProof = [];
        const hashes = this.tree.hashes();

        for (let i = 0; i < hashes.length; i++) {
            const hash = hashes[i];
            result.push([
                Number(i),
                this.tree.getProof(this.tree.getIndexHash(hash)).proofHashesHex(),
            ]);
        }

        return result;
    }

    private generateTree(): void {
        this.tree = new MerkleTree(this.values.map((v) => ChecksumMerkleNew.toBytes(v)));
    }
}
